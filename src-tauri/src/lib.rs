mod error;
mod utils;

use std::{collections::HashMap, net::TcpStream, path::Path, time::Duration};

use serde_json::Value;
use tauri::Manager;
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

pub use crate::error::{CommandError, CommandResult};
use crate::utils::{DuckDuckGoLiteClient, SearchResult};

const DEFAULT_OLLAMA_PORT: u16 = 11_500;
const MAX_SEARCH_LENGTH: usize = 500;

fn ollama_port() -> u16 {
    std::env::var("PANSOPHY_OLLAMA_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .filter(|port| *port > 0)
        .unwrap_or(DEFAULT_OLLAMA_PORT)
}

fn ollama_url(port: u16, path: &str) -> String {
    format!("http://127.0.0.1:{port}{path}")
}

fn configured_ollama_url() -> Option<String> {
    std::env::var("PANSOPHY_OLLAMA_URL")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .map(|value| value.trim_end_matches('/').to_owned())
}

fn ollama_base_url() -> String {
    configured_ollama_url()
        .unwrap_or_else(|| ollama_url(ollama_port(), ""))
}

fn validate_search(search: &str) -> CommandResult<&str> {
    let trimmed = search.trim();
    if trimmed.is_empty() {
        return Err(CommandError::new(
            "INVALID_INPUT",
            "A non-empty search query is required.",
        ));
    }
    if trimmed.chars().count() > MAX_SEARCH_LENGTH {
        return Err(CommandError::new(
            "INVALID_INPUT",
            "The search query is too long.",
        ));
    }
    Ok(trimmed)
}

fn validate_ocr_extension(input_path: &Path) -> CommandResult<String> {
    let extension = input_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !matches!(extension.as_str(), "jpg" | "jpeg" | "pdf" | "png" | "webp") {
        return Err(CommandError::new(
            "INVALID_INPUT",
            "Only PNG, JPEG, WebP, and PDF files are supported.",
        ));
    }
    Ok(extension)
}

#[tauri::command]
async fn web_search(search: String) -> CommandResult<Vec<SearchResult>> {
    let query = validate_search(&search)?;
    DuckDuckGoLiteClient::new()
        .map_err(|error| CommandError::internal("Could not initialize web search.", error))?
        .search(query.to_owned())
        .await
        .map_err(|error| CommandError::internal("Web search failed.", error))
}

#[tauri::command]
async fn img_to_text(img_path: String, app: tauri::AppHandle) -> CommandResult<String> {
    let input_path = Path::new(&img_path);
    if !input_path.is_file() {
        return Err(CommandError::new(
            "INVALID_INPUT",
            "The selected file does not exist.",
        ));
    }

    let extension = validate_ocr_extension(input_path)?;

    if extension == "pdf" {
        let bytes = std::fs::read(input_path)
            .map_err(|error| CommandError::internal("Could not read the PDF.", error))?;
        return pdf_extract::extract_text_from_mem(&bytes).map_err(|error| {
            CommandError::internal("Could not extract text from the PDF.", error)
        });
    }

    let tessdata_path = app
        .path()
        .resource_dir()
        .map_err(|error| CommandError::internal("Could not locate application resources.", error))?
        .join("resources/tesseract/tessdata");
    let tessdata_path = tessdata_path.to_str().ok_or_else(|| {
        CommandError::new("INVALID_PATH", "The OCR resource path is not valid UTF-8.")
    })?;

    let sidecar_command = app
        .shell()
        .sidecar("tesseract")
        .map_err(|error| CommandError::internal("Could not prepare the OCR process.", error))?
        .env("TESSDATA_PREFIX", tessdata_path)
        .args([img_path.as_str(), "stdout", "-l", "eng", "--psm", "6"]);
    let (mut events, _child) = sidecar_command
        .spawn()
        .map_err(|error| CommandError::internal("Could not start the OCR process.", error))?;
    let mut stdout = String::new();
    let mut stderr = String::new();

    while let Some(event) = events.recv().await {
        match event {
            CommandEvent::Stdout(data) => stdout.push_str(&String::from_utf8_lossy(&data)),
            CommandEvent::Stderr(data) => stderr.push_str(&String::from_utf8_lossy(&data)),
            CommandEvent::Error(error) => {
                return Err(CommandError::internal("The OCR process failed.", error));
            }
            CommandEvent::Terminated(payload) if payload.code == Some(0) => {
                return Ok(stdout.trim().to_string());
            }
            CommandEvent::Terminated(payload) => {
                log::error!(
                    target: "pansophy",
                    "tesseract exited with {:?}: {}",
                    payload.code,
                    stderr
                );
                return Err(CommandError::new(
                    "OCR_FAILED",
                    "Text extraction did not complete successfully.",
                ));
            }
            _ => {}
        }
    }
    Err(CommandError::new(
        "OCR_FAILED",
        "The OCR process ended unexpectedly.",
    ))
}

pub fn health_check_url(base_url: &str) -> CommandResult<HashMap<String, Value>> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(5))
        .no_proxy()
        .build()
        .map_err(|error| CommandError::internal("Could not initialize the health check.", error))?;
    let response = client
        .get(format!("{}/api/tags", base_url.trim_end_matches('/')))
        .send()
        .and_then(reqwest::blocking::Response::error_for_status)
        .map_err(|error| CommandError::internal("The local AI service is unavailable.", error))?;
    let payload: Value = response.json().map_err(|error| {
        CommandError::internal("The local AI service returned invalid JSON.", error)
    })?;

    let mut models = HashMap::new();
    if let Some(model_values) = payload.get("models").and_then(Value::as_array) {
        for model in model_values {
            if let Some(name) = model.get("name").and_then(Value::as_str) {
                models.insert(name.to_owned(), model.clone());
            }
        }
    }
    Ok(models)
}

#[tauri::command]
pub fn health_check() -> CommandResult<HashMap<String, Value>> {
    health_check_url(&ollama_base_url())
}

fn start_ollama(port: u16, app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let models_dir = app
        .path()
        .resource_dir()?
        .join("resources/ollama/models")
        .to_str()
        .ok_or("The Ollama models path is not valid UTF-8.")?
        .to_owned();

    log::info!(target: "pansophy", "starting local AI service on port {port}");
    let sidecar_command = app
        .shell()
        .sidecar("ollama")?
        .env("OLLAMA_HOST", format!("127.0.0.1:{port}"))
        .env("OLLAMA_MODELS", models_dir)
        .args(["serve"]);
    let _process = sidecar_command.spawn()?;
    Ok(())
}

fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    if cfg!(debug_assertions) {
        app.handle().plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )?;
    }

    if configured_ollama_url().is_some() {
        log::info!(target: "pansophy", "using configured Ollama service without a sidecar");
        return Ok(());
    }

    let mut port = ollama_port();
    let address = format!("127.0.0.1:{port}");
    if TcpStream::connect(&address).is_ok() {
        let is_ollama = reqwest::blocking::get(ollama_url(port, "/api/tags"))
            .and_then(reqwest::blocking::Response::error_for_status)
            .is_ok();
        if is_ollama {
            return Ok(());
        }
        port = port
            .checked_add(1)
            .ok_or("No local AI service port is available.")?;
    }

    start_ollama(port, app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(setup_app)
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                log::info!(target: "pansophy", "application closing");
            }
        })
        .invoke_handler(tauri::generate_handler![
            health_check,
            img_to_text,
            web_search
        ])
        .run(tauri::generate_context!())
        .expect("error while running Pansophy");
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{
        ollama_url, validate_ocr_extension, validate_search, DEFAULT_OLLAMA_PORT,
        MAX_SEARCH_LENGTH,
    };

    #[test]
    fn validates_and_trims_search_queries() {
        assert_eq!(validate_search("  rust tauri  ").unwrap(), "rust tauri");
    }

    #[test]
    fn rejects_empty_search_queries() {
        assert!(validate_search("  ").is_err());
    }

    #[test]
    fn enforces_search_query_character_limit() {
        assert!(validate_search(&"a".repeat(MAX_SEARCH_LENGTH)).is_ok());
        let error = validate_search(&"a".repeat(MAX_SEARCH_LENGTH + 1)).unwrap_err();
        assert_eq!(error.code, "INVALID_INPUT");
    }

    #[test]
    fn accepts_supported_ocr_extensions_case_insensitively() {
        for (file_name, expected) in [
            ("scan.JPG", "jpg"),
            ("scan.jpeg", "jpeg"),
            ("paper.PDF", "pdf"),
            ("capture.png", "png"),
            ("photo.webp", "webp"),
        ] {
            assert_eq!(
                validate_ocr_extension(Path::new(file_name)).unwrap(),
                expected
            );
        }
    }

    #[test]
    fn rejects_unsupported_or_missing_ocr_extensions() {
        for file_name in ["notes.txt", "image.gif", "README"] {
            let error = validate_ocr_extension(Path::new(file_name)).unwrap_err();
            assert_eq!(error.code, "INVALID_INPUT");
        }
    }

    #[test]
    fn creates_loopback_ollama_urls() {
        assert_eq!(
            ollama_url(DEFAULT_OLLAMA_PORT, "/api/tags"),
            "http://127.0.0.1:11500/api/tags"
        );
    }
}
