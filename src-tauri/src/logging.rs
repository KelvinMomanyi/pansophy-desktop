use std::time::{SystemTime, UNIX_EPOCH};

use log::Level;
use serde_json::{json, Map, Value};

use crate::{CommandError, CommandResult};

pub fn frontend_event(entry: &Value) -> CommandResult<(Level, Value)> {
    let invalid = || CommandError::new("INVALID_INPUT", "The log event is invalid.");
    if entry.to_string().len() > 16_384 {
        return Err(invalid());
    }
    let level = match entry["level"].as_str() {
        Some("info") => Level::Info,
        Some("warn") => Level::Warn,
        Some("error") => Level::Error,
        _ => return Err(invalid()),
    };
    let event = entry["event"].as_str().ok_or_else(invalid)?;
    if event.is_empty()
        || event.len() > 128
        || !event
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || b"._-".contains(&c))
    {
        return Err(invalid());
    }
    let mut clean = json!({ "level": level.as_str().to_lowercase(), "event": event });
    if let Some(model) = entry["model"].as_str().filter(|value| value.len() <= 128) {
        clean["model"] = json!(model);
    }
    if let Some(deep_think) = entry["deepThink"].as_bool() {
        clean["deepThink"] = json!(deep_think);
    }
    let mut error = Map::new();
    for field in ["name", "code"] {
        if let Some(value) = entry["error"][field]
            .as_str()
            .filter(|value| value.len() <= 128)
        {
            error.insert(field.into(), json!(value));
        }
    }
    if !error.is_empty() {
        clean["error"] = Value::Object(error);
    }
    Ok((level, clean))
}

pub fn format_record(level: Level, target: &str, message: &str) -> String {
    let mut record = if target == "pansophy_frontend" {
        serde_json::from_str(message)
            .unwrap_or_else(|_| json!({ "event": "logging.invalid_record" }))
    } else {
        json!({ "level": level.as_str().to_lowercase(), "target": target, "message": message })
    };
    record["timestampMs"] = json!(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis());
    record.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_diagnostics_and_discards_sensitive_frontend_payloads() {
        let (level, event) = frontend_event(&json!({
            "level": "error", "event": "chat.send_failed", "model": "mistral:7b", "deepThink": false,
            "query": "private question", "fileName": "private.pdf", "prompt": "secret",
            "error": { "name": "AppError", "code": "NETWORK_ERROR", "message": "private", "stack": "private" }
        })).unwrap();
        assert_eq!(level, Level::Error);
        assert_eq!(
            event,
            json!({
                "level": "error", "event": "chat.send_failed", "model": "mistral:7b", "deepThink": false,
                "error": { "name": "AppError", "code": "NETWORK_ERROR" }
            })
        );
    }

    #[test]
    fn rejects_malformed_and_oversized_events() {
        for value in [
            json!(null),
            json!({ "level": "debug", "event": "test" }),
            json!({ "level": "info", "event": "injected\nline" }),
            json!({ "level": "info", "event": "" }),
            json!({ "level": "info", "event": "test", "payload": "x".repeat(16_384) }),
        ] {
            assert_eq!(frontend_event(&value).unwrap_err().code, "INVALID_INPUT");
        }
    }

    #[test]
    fn formats_native_records_as_one_json_line_with_a_timestamp() {
        let line = format_record(Level::Warn, "pansophy", "first\nsecond");
        assert_eq!(line.lines().count(), 1);
        let record: Value = serde_json::from_str(&line).unwrap();
        assert_eq!(record["level"], "warn");
        assert_eq!(record["message"], "first\nsecond");
        assert!(record["timestampMs"].as_u64().unwrap() > 0);
    }
}
