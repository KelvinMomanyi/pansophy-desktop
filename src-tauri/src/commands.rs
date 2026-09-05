use std::collections::HashMap;

use serde_json::Value;

use crate::{health_check_url, ollama_base_url, CommandResult};

#[tauri::command]
pub fn health_check() -> CommandResult<HashMap<String, Value>> {
    health_check_url(&ollama_base_url())
}
