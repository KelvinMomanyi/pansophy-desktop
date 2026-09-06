mod common;

use app_lib::{diagnostics, health_check_url};

#[test]
fn health_check_parses_models_from_a_stub_without_environment_mutation() {
    let (url, server) = common::serve(
        200,
        r#"{"models":[{"name":"mistral:7b","size":123},{"name":"deepseek-r1:7b"},{"size":4}]}"#,
    );
    let models = health_check_url(&url).unwrap();
    assert_eq!(models.len(), 2);
    assert_eq!(models["mistral:7b"]["size"], 123);
    assert!(server.join().unwrap().starts_with("GET /api/tags "));
}

#[test]
fn health_check_rejects_http_errors_redirects_and_invalid_payloads() {
    for (status, body, expected) in [
        (503, "unavailable", "SERVICE_UNAVAILABLE"),
        (302, "redirect", "SERVICE_UNAVAILABLE"),
        (200, "not json", "INVALID_RESPONSE"),
        (200, r#"{"models":{}}"#, "INVALID_RESPONSE"),
        (200, r#"{}"#, "INVALID_RESPONSE"),
    ] {
        let (url, server) = common::serve(status, body);
        assert_eq!(health_check_url(&url).unwrap_err().code, expected);
        server.join().unwrap();
    }
}

#[test]
fn diagnostics_reports_models_and_both_ocr_resources() {
    let directory = tempfile::tempdir().unwrap();
    let executable = if cfg!(windows) {
        "tesseract.exe"
    } else {
        "tesseract"
    };
    std::fs::write(directory.path().join(executable), b"fixture only").unwrap();
    let tessdata = directory.path().join("resources/tesseract/tessdata");
    std::fs::create_dir_all(&tessdata).unwrap();
    std::fs::write(tessdata.join("eng.traineddata"), b"fixture only").unwrap();
    let (url, server) = common::serve(200, r#"{"models":[{"name":"mistral:7b"}]}"#);
    let report = diagnostics::collect(
        &url,
        directory.path(),
        directory.path(),
        Some("logs".into()),
    );
    assert!(report.ollama.available);
    assert_eq!(report.ollama.model_count, 1);
    assert!(report.ollama.error.is_none());
    assert!(report.ocr.sidecar_present);
    assert!(report.ocr.language_data_present);
    assert_eq!(report.log_directory.as_deref(), Some("logs"));
    server.join().unwrap();
}

#[test]
fn diagnostics_preserves_ocr_results_when_ollama_is_unreachable() {
    let directory = tempfile::tempdir().unwrap();
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    drop(listener);
    let report = diagnostics::collect(&url, directory.path(), directory.path(), None);
    assert!(!report.ollama.available);
    assert_eq!(report.ollama.model_count, 0);
    assert!(report.ollama.error.is_some());
    assert!(!report.ocr.sidecar_present);
    assert!(!report.ocr.language_data_present);
    assert!(report.log_directory.is_none());
}
