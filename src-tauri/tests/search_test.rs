mod common;

use app_lib::utils::DuckDuckGoLiteClient;

#[tokio::test]
async fn searches_encoded_queries_and_parses_provider_results() {
    let (url, server) = common::serve(200, "<table><tr><td><a class='result-link' href='https://docs.example.com/rust'><b>Rust</b> &amp; Tauri</a></td></tr><tr><td class='result-snippet'>Local <em>research</em></td></tr><tr><td><span class='link-text'>docs.example.com</span></td></tr></table>");
    let results = DuckDuckGoLiteClient::with_endpoint(&url)
        .unwrap()
        .search("  rust & tauri  ")
        .await
        .unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].title, "Rust & Tauri");
    assert_eq!(results[0].description, "Local research");
    assert_eq!(results[0].domain, "docs.example.com");
    assert_eq!(results[0].link_text, "docs.example.com");
    assert!(server
        .join()
        .unwrap()
        .starts_with("GET /?q=rust+%26+tauri "));
}

#[tokio::test]
async fn search_rejects_provider_failures_and_oversized_responses() {
    for (status, body, code) in [
        (429, "rate limited".to_owned(), "SEARCH_UNAVAILABLE"),
        (200, "x".repeat(2 * 1024 * 1024 + 1), "INVALID_RESPONSE"),
    ] {
        let (url, server) = common::serve(status, &body);
        let error = DuckDuckGoLiteClient::with_endpoint(&url)
            .unwrap()
            .search("rust")
            .await
            .unwrap_err();
        assert_eq!(error.code, code);
        server.join().unwrap();
    }
}

#[tokio::test]
async fn search_handles_empty_results_and_rejects_input_before_connecting() {
    let (url, server) = common::serve(200, "<table></table>");
    assert!(DuckDuckGoLiteClient::with_endpoint(&url)
        .unwrap()
        .search("rust")
        .await
        .unwrap()
        .is_empty());
    server.join().unwrap();
    let client = DuckDuckGoLiteClient::with_endpoint("http://127.0.0.1:9").unwrap();
    assert_eq!(client.search(" ").await.unwrap_err().code, "INVALID_INPUT");
}
