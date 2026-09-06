use std::collections::HashMap;

use serde_json::Value;

use crate::{health_check_url, ollama_base_url, CommandResult};

#[tauri::command]
pub fn health_check() -> CommandResult<HashMap<String, Value>> {
    health_check_url(&ollama_base_url())
}

#[tauri::command]
pub fn write_log_line(entry: Value) -> CommandResult<()> {
    let (level, entry) = crate::logging::frontend_event(&entry)?;
    log::log!(target: "pansophy_frontend", level, "{entry}");
    Ok(())
}
