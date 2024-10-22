use self::client::HttpsConnector;
use base64::{engine::general_purpose, Engine as _};
use http::Method;
use http_body_util::{BodyExt, Empty};
use hyper::body::Bytes;
use hyper::Request;
use serde::{Serialize, Serializer};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::Instant;

const USER_AGENT: &str = "Quickie/1.0";

mod client;

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

    let uri = url.parse::<hyper::Uri>().map_err(|_| Error::InvalidUrl)?;
    let host = uri.host().ok_or(Error::InvalidUrl)?;

    let http = HttpsConnector::new(&uri);
    let mut sender = http.connect().await?;

    let req = Request::builder()
        .method(method.clone())
        .uri(&uri)
        .header("User-Agent", USER_AGENT)
        .header("Host", host)
        .body(Empty::<Bytes>::new())
        .unwrap();

    let now = Instant::now();
    let mut resp = sender
        .send_request(req)
        .await
        .map_err(|_| Error::RequestFailed)?;

    let time_taken = now.elapsed().as_millis();

    let mut body_bytes = Vec::new();
    let mut size = 0;

    while let Some(next) = resp.frame().await {
        let frame = next.map_err(Error::ResponseFrame)?;
        if let Some(chunk) = frame.data_ref() {
            body_bytes.extend_from_slice(chunk);
            size += chunk.len();
        }
    }

    let body_base64 = general_purpose::STANDARD.encode(&body_bytes);

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
        body: body_base64,
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
    ConnectionFailed,
    Client,
    RequestFailed,
    ResponseFrame(hyper::Error),
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
            Error::ConnectionFailed => write!(
                f,
                "Connection failed, check the url or your internet connection"
            ),
            Error::Client => write!(f, "Client error"),
            Error::RequestFailed => write!(f, "Request failed"),
            Error::ResponseFrame(e) => write!(f, "Response frame error: {}", e),
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
