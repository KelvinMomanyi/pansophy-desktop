use std::{net::TcpStream, path::PathBuf, time::Duration};

use tauri::Manager;
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use crate::health::{configured_ollama_url, ollama_base_url, ollama_port, validate_base_url};
use crate::ocr::{extract_text_with, OcrOutput};
use crate::utils::{DuckDuckGoLiteClient, SearchResult};
use crate::{commands, logging, CommandError, CommandResult};

#[tauri::command]
async fn web_search(search: String) -> CommandResult<Vec<SearchResult>> {
    DuckDuckGoLiteClient::new()?.search(&search).await
}

#[tauri::command]
async fn img_to_text(img_path: String, app: tauri::AppHandle) -> CommandResult<String> {
    extract_text_with(std::path::Path::new(&img_path), |path| {
        run_tesseract(path, app)
    })
    .await
}

async fn run_tesseract(path: PathBuf, app: tauri::AppHandle) -> CommandResult<String> {
    let tessdata = app
        .path()
        .resource_dir()
        .map_err(|error| CommandError::internal("Could not locate application resources.", error))?
        .join("resources/tesseract/tessdata");
    let command = app
        .shell()
        .sidecar("tesseract")
        .map_err(|error| CommandError::internal("Could not prepare OCR.", error))?
        .env("TESSDATA_PREFIX", tessdata)
        .set_raw_out(true)
        .args([
            path.as_os_str(),
            "stdout".as_ref(),
            "-l".as_ref(),
            "eng".as_ref(),
            "--psm".as_ref(),
            "6".as_ref(),
        ]);
    let (mut events, child) = command
        .spawn()
        .map_err(|error| CommandError::internal("Could not start OCR.", error))?;
    let result = tokio::time::timeout(Duration::from_secs(120), async {
        let mut output = OcrOutput::default();
        while let Some(event) = events.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => output.push(&bytes)?,
                CommandEvent::Error(error) => {
                    return Err(CommandError::internal("The OCR process failed.", error))
                }
                CommandEvent::Terminated(payload) => return output.finish(payload.code),
                _ => {}
            }
        }
        output.finish(None)
    })
    .await
    .unwrap_or_else(|_| {
        Err(CommandError::new(
            "OCR_TIMEOUT",
            "Text extraction exceeded two minutes.",
        ))
    });
    if result.is_err() {
        let _ = child.kill();
    }
    result
}

fn start_ollama(port: u16, app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let models_dir = app.path().app_local_data_dir()?.join("models");
    std::fs::create_dir_all(&models_dir)?;
    log::info!(target: "pansophy", "starting local AI service on port {port}");
    let _process = app
        .shell()
        .sidecar("ollama")?
        .env("OLLAMA_HOST", format!("127.0.0.1:{port}"))
        .env("OLLAMA_MODELS", models_dir)
        .args(["serve"])
        .spawn()?;
    Ok(())
}

fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    app.handle().plugin(
        tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .targets([
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                    file_name: Some("pansophy".into()),
                }),
            ])
            .max_file_size(2_000_000)
            .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
            .format(|out, message, record| {
                out.finish(format_args!(
                    "{}",
                    logging::format_record(record.level(), record.target(), &message.to_string())
                ))
            })
            .build(),
    )?;

    validate_base_url(&ollama_base_url())?;
    if configured_ollama_url().is_some() {
        log::info!(target: "pansophy", "using configured Ollama service without a sidecar");
        return Ok(());
    }
    let port = ollama_port();
    let address = format!("127.0.0.1:{port}").parse()?;
    if TcpStream::connect_timeout(&address, Duration::from_secs(1)).is_ok() {
        crate::health_check()?;
        return Ok(());
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
            commands::health_check,
            commands::write_log_line,
            commands::get_diagnostics,
            img_to_text,
            web_search
        ])
        .run(tauri::generate_context!())
        .expect("error while running Pansophy");
}
