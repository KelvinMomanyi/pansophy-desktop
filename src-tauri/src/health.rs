use std::{collections::HashMap, time::Duration};

use serde_json::Value;
use url::{Host, Url};

use crate::{CommandError, CommandResult};

const DEFAULT_OLLAMA_PORT: u16 = 11_500;

pub(crate) fn ollama_port() -> u16 {
    std::env::var("PANSOPHY_OLLAMA_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .filter(|port| *port > 0)
        .unwrap_or(DEFAULT_OLLAMA_PORT)
}

pub(crate) fn configured_ollama_url() -> Option<String> {
    std::env::var("PANSOPHY_OLLAMA_URL")
        .ok()
        .filter(|value| !value.trim().is_empty())
}

pub(crate) fn ollama_base_url() -> String {
    configured_ollama_url().unwrap_or_else(|| format!("http://127.0.0.1:{}", ollama_port()))
}

pub fn validate_base_url(value: &str) -> CommandResult<Url> {
    let invalid = || {
        CommandError::new("INVALID_CONFIG", "The AI service URL must use HTTPS or loopback HTTP, without credentials, a query, or a fragment.")
    };
    let mut url = Url::parse(value.trim()).map_err(|_| invalid())?;
    let loopback = match url.host() {
        Some(Host::Domain(host)) => host.eq_ignore_ascii_case("localhost"),
        Some(Host::Ipv4(ip)) => ip.is_loopback(),
        Some(Host::Ipv6(ip)) => ip.is_loopback(),
        None => false,
    };
    if url.host().is_none()
        || !(url.scheme() == "https" || (url.scheme() == "http" && loopback))
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(invalid());
    }
    let path = format!("{}/", url.path().trim_end_matches('/'));
    url.set_path(&path);
    Ok(url)
}

pub fn health_check_url(base_url: &str) -> CommandResult<HashMap<String, Value>> {
    let url = validate_base_url(base_url)?
        .join("api/tags")
        .map_err(|error| CommandError::internal("Could not create the health-check URL.", error))?;
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(5))
        .redirect(reqwest::redirect::Policy::none())
        .no_proxy()
        .build()
        .map_err(|error| CommandError::internal("Could not initialize the health check.", error))?;
    let response = client
        .get(url)
        .send()
        .map_err(|error| CommandError::internal("The local AI service is unavailable.", error))?;
    if !response.status().is_success() {
        return Err(CommandError::new(
            "SERVICE_UNAVAILABLE",
            "The AI service returned an unsuccessful HTTP status.",
        ));
    }
    let payload: Value = response.json().map_err(|_| {
        CommandError::new(
            "INVALID_RESPONSE",
            "The local AI service returned invalid JSON.",
        )
    })?;
    let values = payload
        .get("models")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            CommandError::new(
                "INVALID_RESPONSE",
                "The local AI service did not return a model list.",
            )
        })?;
    let mut models = HashMap::new();
    for model in values {
        if let Some(name) = model.get("name").and_then(Value::as_str) {
            models.insert(name.to_owned(), model.clone());
        }
    }
    Ok(models)
}

pub fn health_check() -> CommandResult<HashMap<String, Value>> {
    health_check_url(&ollama_base_url())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_secure_hosts_and_normalizes_loopback_urls() {
        for url in [
            "https://ai.example.com",
            "http://LOCALHOST:11500",
            "http://127.0.0.1",
            "http://[::1]",
        ] {
            assert!(validate_base_url(url).is_ok(), "{url}");
        }
        assert_eq!(
            validate_base_url("https://example.com/ollama")
                .unwrap()
                .join("api/tags")
                .unwrap()
                .as_str(),
            "https://example.com/ollama/api/tags"
        );
    }

    #[test]
    fn rejects_insecure_hosts_and_ambiguous_url_components() {
        for url in [
            "not a URL",
            "http://example.com",
            "http://localhost.example.com",
            "http://192.168.1.1",
            "file:///tmp/a",
            "https://user:pass@example.com",
            "http://localhost?token=secret",
            "http://localhost/#fragment",
        ] {
            assert_eq!(
                validate_base_url(url).unwrap_err().code,
                "INVALID_CONFIG",
                "{url}"
            );
        }
    }
}
