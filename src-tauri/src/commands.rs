use crate::{CommandError, CommandResult};
use serde_json::Value;
use std::collections::HashMap;
use tauri::Manager;

#[tauri::command]
pub async fn health_check() -> CommandResult<HashMap<String, Value>> {
    tauri::async_runtime::spawn_blocking(crate::health_check)
        .await
        .map_err(|error| CommandError::internal("The health check could not finish.", error))?
}

#[tauri::command]
pub fn write_log_line(entry: Value) -> CommandResult<()> {
    let (level, entry) = crate::logging::frontend_event(&entry)?;
    log::log!(target: "pansophy_frontend", level, "{entry}");
    Ok(())
}

#[tauri::command]
pub async fn get_diagnostics(
    app: tauri::AppHandle,
) -> CommandResult<crate::diagnostics::Diagnostics> {
    let executable = std::env::current_exe()
        .map_err(|error| CommandError::internal("Could not locate the application.", error))?;
    let executable_dir = executable
        .parent()
        .ok_or_else(|| {
            CommandError::new(
                "INVALID_PATH",
                "Could not locate the application directory.",
            )
        })?
        .to_path_buf();
    let resources = app.path().resource_dir().map_err(|error| {
        CommandError::internal("Could not locate application resources.", error)
    })?;
    let logs = app
        .path()
        .app_log_dir()
        .ok()
        .map(|path| path.to_string_lossy().into_owned());
    let base_url = crate::health::ollama_base_url();
    tauri::async_runtime::spawn_blocking(move || {
        crate::diagnostics::collect(&base_url, &executable_dir, &resources, logs)
    })
    .await
    .map_err(|error| CommandError::internal("Diagnostics could not finish.", error))
}
