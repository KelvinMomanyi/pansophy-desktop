use std::{path::Path, time::Instant};

use serde::Serialize;

use crate::{health_check_url, CommandError};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostics {
    pub app_version: &'static str,
    pub ollama: OllamaStatus,
    pub ocr: OcrStatus,
    pub log_directory: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaStatus {
    pub available: bool,
    pub model_count: usize,
    pub latency_ms: u128,
    pub error: Option<CommandError>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrStatus {
    pub sidecar_present: bool,
    pub language_data_present: bool,
}

/// Reports independent checks even when Ollama is offline. Never launches sidecars.
pub fn collect(
    base_url: &str,
    executable_dir: &Path,
    resource_dir: &Path,
    log_directory: Option<String>,
) -> Diagnostics {
    let start = Instant::now();
    let health = health_check_url(base_url);
    let (available, model_count, error) = match health {
        Ok(models) => (true, models.len(), None),
        Err(error) => (false, 0, Some(error)),
    };
    let sidecar = if cfg!(windows) {
        "tesseract.exe"
    } else {
        "tesseract"
    };
    Diagnostics {
        app_version: env!("CARGO_PKG_VERSION"),
        ollama: OllamaStatus {
            available,
            model_count,
            latency_ms: start.elapsed().as_millis(),
            error,
        },
        ocr: OcrStatus {
            sidecar_present: executable_dir.join(sidecar).is_file(),
            language_data_present: resource_dir
                .join("resources/tesseract/tessdata/eng.traineddata")
                .is_file(),
        },
        log_directory,
    }
}
