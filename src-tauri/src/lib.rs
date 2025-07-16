


mod utils;

use serde_json;
use std::{collections::HashMap, net::TcpStream};
use tauri::Manager;
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use crate::utils::{DuckDuckGoLiteClient, SearchResult};

// Commands

#[tauri::command]
async fn web_search(search: String) -> Result<Vec<SearchResult>, String> {
    let duckduckgo_client = DuckDuckGoLiteClient::new();
    Ok(duckduckgo_client.search(search).await.unwrap())
}

#[tauri::command]
async fn img_to_text(img_path: String, app: tauri::AppHandle) -> Result<String, String> {
    let tessdata_path = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .as_path()
        .join(String::from("resources/tesseract/tessdata"));

    let tessdata_path = tessdata_path.to_str().unwrap();

    if img_path.ends_with(".pdf") {
        // Convert pdf file pages to images first
        let bytes = std::fs::read(img_path.as_str()).unwrap();
        let out = pdf_extract::extract_text_from_mem(&bytes).unwrap();
        return Ok(out);
    }

    let sidecar_command = app
        .shell()
        .sidecar("tesseract")
        .unwrap()
        .env("TESSDATA_PREFIX", tessdata_path)
        .args([img_path.as_str(), "stdout", "-l", "eng", "--psm", "6"]);
    let (mut rx, mut _child) = sidecar_command.spawn().unwrap();
    let mut stdout = String::new();
    let mut stderr = String::new();
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(data) => {
                stdout.push_str(&String::from_utf8_lossy(&data));
            }
            CommandEvent::Stderr(data) => {
                stderr.push_str(&String::from_utf8_lossy(&data));
            }
            CommandEvent::Error(error) => {
                return Err(format!("Command error: {}", error));
            }
            CommandEvent::Terminated(payload) => {
                if payload.code == Some(0) {
                    println!("{}", stdout);
                    return Ok(stdout.trim().to_string());
                } else {
                    return Err(format!(
                        "Tesseract failed with code {:?}: {}",
                        payload.code, stderr
                    ));
                }
            }
            _ => {
                todo!();
            }
        }
    }
    Err("Unexpected end of command stream".to_string())
}

#[tauri::command]
fn health_check() -> Result<HashMap<String, serde_json::Value>, String> {
    let url = "http://127.0.0.1:11500/api/tags";
    let response = reqwest::blocking::get(url).map_err(|e| e.to_string())?;
    let resp_str = response
        .text()
        .unwrap_or_else(|_| String::from("Failed to read response text"));
    let json: serde_json::Value = serde_json::from_str(resp_str.as_str())
        .map_err(|_| String::from("Failed to parse json"))?;

    let mut models = HashMap::new();
    if let Some(models_array) = json.get("models").and_then(|v| v.as_array()) {
        for model in models_array {
            if let Some(name) = model.get("name").and_then(|n| n.as_str()) {
                models.insert(name.to_string(), model.clone());
            }
        }
    }
    return Ok(models);
}

// Utils
fn start_ollama(port: u32, app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let models_dir = match app
        .path()
        .resource_dir()?
        .as_path()
        .join(String::from("resources/ollama/models"))
        .to_str()
    {
        Some(s) => s.to_string(),
        None => String::new(),
    };

    println!("Starting ollama on port {}", port);

    let sidecar_command = app
        .shell()
        .sidecar("ollama")
        .unwrap()
        .env("OLLAMA_HOST", format!("127.0.01:{port}"))
        .env("OLLAMA_MODELS", models_dir)
        .args(["serve"]);
    let _ = sidecar_command.spawn().unwrap();
    return Ok(());
}

// use std::fs;

// fn start_ollama(port: u32, app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
//     let models_dir = app
//         .path()
//         .resource_dir()?
//         .join("resources/ollama/models");
    
//     // Create the models directory if it doesn't exist
//     if !models_dir.exists() {
//         fs::create_dir_all(&models_dir)?;
//     }
    
//     let models_dir_str = models_dir
//         .to_str()
//         .ok_or("Failed to convert models directory path to string")?
//         .to_string();

//     println!("Starting ollama on port {}", port);
//     println!("Models directory: {}", models_dir_str);

//     let sidecar_command = app
//         .shell()
//         .sidecar("ollama")?
//         .env("OLLAMA_HOST", format!("127.0.0.1:{}", port)) // Fixed IP address typo
//         .env("OLLAMA_MODELS", models_dir_str)
//         .args(["serve"]);
    
//     let (_rx, _child) = sidecar_command.spawn()?;
    
//     Ok(())
// }


fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging for debug builds
    if cfg!(debug_assertions) {
        app.handle().plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )?;
    }
    


    // Initialize resource here
    let mut pansophy_ollama_port: u32 = 11500;
    // let mut pansophy_ollama_port: u32 = 11434;
    // Step 1: Check if ollama is running on our specific port
    let addr = format!("127.0.0.1:{}", pansophy_ollama_port);
    let is_occupied = TcpStream::connect(&addr).is_ok();

    // Step 2: If occupied, verify that its an ollama instance
    if is_occupied {
        let mut is_ollama = false;
        // Check if its an ollama instance
        let url = format!("http://127.0.0.1:{pansophy_ollama_port}/api/tags");
        let resp = match reqwest::blocking::get(&url) {
            Ok(response) => response
                .text()
                .unwrap_or_else(|_| String::from("Failed to read response text")),
            Err(_err) => String::from("Sorry an error occured"),
        };

        let resp_map: HashMap<String, serde_json::Value> = match serde_json::from_str(&resp) {
            Ok(resp_) => resp_,
            Err(err) => HashMap::from([(
                String::from("error"),
                serde_json::Value::String(err.to_string()),
            )]),
        };

        if resp_map.contains_key("models") {
            is_ollama = true;
        }

        if !is_ollama {
            // Adjust the port
            pansophy_ollama_port += 1;
            // Start sidecar ollama
            let _ = start_ollama(pansophy_ollama_port, app);
        }
    } else {
        let _ = start_ollama(pansophy_ollama_port, app);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .setup(setup_app)
        .on_window_event(|_window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { .. } => {
                    println!("Closing...")
                    // Settle or close resources that needs to be closed
                }
                _ => {}
            }
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            health_check,
            img_to_text,
            web_search
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}



