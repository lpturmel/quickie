use http::uri::Scheme;
use http::Method;
use http_body_util::{BodyExt, Empty};
use hyper::body::Bytes;
use hyper::{client::conn::http1::Builder, Request};
use hyper_tls::HttpsConnector;
use hyper_util::rt::TokioIo;
use pki_types::ServerName;
use serde::{Serialize, Serializer};
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Arc;
use std::time::Instant;
use tokio::net::TcpStream;
use tokio_rustls::rustls::{ClientConfig, RootCertStore};
use tokio_rustls::TlsConnector;

const USER_AGENT: &str = "Quickie/1.0";

#[derive(Debug, Serialize)]
struct Response {
    status: u16,
    body: String,
    headers: HashMap<String, String>,
    url: String,
    method: String,
    // Time taken in milliseconds
    time_taken: u128,
    body_size_bytes: u128,
    headers_size_bytes: u128,
}
#[tauri::command]
async fn send_request(method: &str, url: &str) -> Result<Response, Error> {
    let method = Method::from_str(method).map_err(|_| Error::InvalidMethod)?;

    let url = url.parse::<hyper::Uri>().map_err(|_| Error::InvalidUrl)?;
    let host = url.host().ok_or(Error::InvalidUrl)?;
    let proto = url.scheme().unwrap_or(&Scheme::HTTPS);
    let port = url
        .port_u16()
        .unwrap_or(if proto == &Scheme::HTTPS { 443 } else { 80 });

    let https = HttpsConnector::new();

    let address = format!("{}:{}", host, port);

    let stream = TcpStream::connect(address).await.map_err(|_| Error::Dns)?;

    let mut req = Builder::new();
    req.preserve_header_case(true).title_case_headers(true);

    let mut sender = match proto.as_str() {
        "http" => {
            let io = TokioIo::new(stream);
            let (sender, conn) = req.handshake(io).await.expect("failed to build client");
            tokio::task::spawn(async move {
                if let Err(err) = conn.await {
                    println!("Connection failed: {:?}", err);
                }
            });
            sender
        }
        "https" => {
            let mut root_cert_store = RootCertStore::empty();
            root_cert_store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
            let config = ClientConfig::builder()
                .with_root_certificates(root_cert_store)
                .with_no_client_auth();
            let connector = TlsConnector::from(Arc::new(config));
            let host_c = host.to_string();
            let dnsname = ServerName::try_from(host_c).unwrap();
            let stream = connector
                .connect(dnsname, stream)
                .await
                .expect("failed to connect");

            let io = TokioIo::new(stream);
            let (sender, conn) = req.handshake(io).await.expect("failed to build client");
            tokio::task::spawn(async move {
                if let Err(err) = conn.await {
                    println!("Connection failed: {:?}", err);
                }
            });
            sender
        }
        _ => panic!("unsupported protocol"),
    };

    let req = Request::builder()
        .method(method.clone())
        .uri(url.clone())
        .header("User-Agent", USER_AGENT)
        .header("Host", host)
        .body(Empty::<Bytes>::new())
        .unwrap();

    let now = Instant::now();
    let mut resp = sender
        .send_request(req)
        .await
        .expect("failed to send request");

    let time_taken = now.elapsed().as_millis();

    let mut body_str = String::new();
    let mut size = 0;

    while let Some(next) = resp.frame().await {
        let frame = next.expect("failed to get frame");
        if let Some(chunk) = frame.data_ref() {
            // NOTE: This is a very naive impl as the body can be binary data
            body_str.push_str(&String::from_utf8_lossy(chunk));
            size += chunk.len();
        }
    }

    let mut headers = HashMap::new();
    let mut headers_size_bytes = 0u128;
    for (key, value) in resp.headers() {
        let name = key.as_str();
        let value_str = value.to_str().unwrap_or_default();
        headers.insert(name.to_string(), value_str.to_string());
        headers_size_bytes += name.len() as u128 + value_str.len() as u128 + 4;
    }
    headers_size_bytes += 2;

    Ok(Response {
        status: resp.status().as_u16(),
        body: body_str,
        headers,
        url: url.to_string(),
        method: method.to_string(),
        time_taken,
        body_size_bytes: size as u128,
        headers_size_bytes,
    })
}

#[derive(Debug)]
enum Error {
    InvalidMethod,
    InvalidUrl,
    Dns,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_str())
    }
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Error::InvalidMethod => write!(f, "Invalid method"),
            Error::InvalidUrl => write!(f, "Invalid url"),
            Error::Dns => write!(f, "DNS error, check the url"),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![send_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
