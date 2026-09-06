use std::{
    io::{Read, Write},
    net::TcpListener,
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};

pub fn serve(status: u16, body: &str) -> (String, JoinHandle<String>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let address = listener.local_addr().unwrap();
    let body = body.to_owned();
    let server = thread::spawn(move || {
        let deadline = Instant::now() + Duration::from_secs(10);
        let mut stream = loop {
            match listener.accept() {
                Ok((stream, _)) => break stream,
                Err(error)
                    if error.kind() == std::io::ErrorKind::WouldBlock
                        && Instant::now() < deadline =>
                {
                    thread::sleep(Duration::from_millis(5))
                }
                Err(error) => panic!("Fixture did not receive a request: {error}"),
            }
        };
        stream.set_nonblocking(false).unwrap();
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .unwrap();
        let mut request = Vec::new();
        let mut chunk = [0u8; 1024];
        while !request.windows(4).any(|bytes| bytes == b"\r\n\r\n") {
            let count = stream.read(&mut chunk).unwrap();
            if count == 0 {
                break;
            }
            request.extend_from_slice(&chunk[..count]);
        }
        let headers = format!(
            "HTTP/1.1 {status} Fixture\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            body.len()
        );
        // A size-limited client can disconnect before reading the entire fixture.
        let _ = stream
            .write_all(headers.as_bytes())
            .and_then(|_| stream.write_all(body.as_bytes()));
        String::from_utf8(request).unwrap()
    });
    (format!("http://{address}"), server)
}
