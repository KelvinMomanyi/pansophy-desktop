use std::{
    io::{Read, Write},
    net::TcpListener,
    thread::{self, JoinHandle},
};

use app_lib::health_check;

fn mock_ollama(body: &'static str) -> (String, JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("mock server should bind");
    let address = listener.local_addr().expect("mock server should have an address");
    let server = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("health check should connect");
        let mut request = [0; 1024];
        let bytes_read = stream.read(&mut request).expect("request should be readable");
        let request = String::from_utf8_lossy(&request[..bytes_read]);
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        stream
            .write_all(response.as_bytes())
            .expect("response should be written");
        assert!(request.starts_with("GET /api/tags "));
    });

    (format!("http://{address}"), server)
}

#[test]
fn health_check_parses_model_list_from_local_stub() {
    let (base_url, server) = mock_ollama(
        r#"{"models":[{"name":"mistral:7b","size":123},{"name":"deepseek-r1:7b"},{"size":4}]}"#,
    );

    std::env::set_var("PANSOPHY_OLLAMA_URL", base_url);
    let models = health_check().expect("mock health check should succeed");
    std::env::remove_var("PANSOPHY_OLLAMA_URL");
    server.join().expect("mock server should finish");

    assert_eq!(models.len(), 2);
    assert_eq!(models["mistral:7b"]["size"].as_u64(), Some(123));
    assert!(models.contains_key("deepseek-r1:7b"));
}
