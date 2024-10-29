use super::Error;
use http::Response;
use http::Uri;
use http_body_util::Empty;
use hyper::body::Bytes;
use hyper::client::conn::http1;
use hyper::client::conn::http2;
use hyper::Request;
use hyper_util::rt::TokioExecutor;
use hyper_util::rt::TokioIo;
use pki_types::ServerName;
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio_rustls::client::TlsStream;
use tokio_rustls::rustls::RootCertStore;
use tokio_rustls::TlsConnector;

/// A HTTPS Connector that will fallback to http depending on the uri scheme
pub struct HttpsConnector<'a> {
    is_https: bool,
    uri: &'a Uri,
}

impl<'a> HttpsConnector<'a> {
    pub fn new(uri: &'a Uri) -> Self {
        let is_https = uri.scheme_str() == Some("https");

        Self { is_https, uri }
    }

    pub async fn connect(&self) -> Result<HttpResponse, Error> {
        let port = self
            .uri
            .port_u16()
            .unwrap_or(if self.is_https { 443 } else { 80 });
        let host = self.uri.host().ok_or(Error::InvalidUrl)?;

        let address = format!("{}:{}", host, port);
        let stream = TcpStream::connect(address).await.map_err(|_| Error::Dns)?;
        if self.is_https {
            let tls_stream = setup_tls(stream, host).await?;
            let alpn_proto = {
                let tls_session = tls_stream.get_ref().1;
                tls_session.alpn_protocol().map(|p| p.to_vec())
            };
            let io = TokioIo::new(tls_stream);

            if alpn_proto == Some(b"h2".to_vec()) {
                let (sender, conn) = http2::Builder::new(TokioExecutor::new())
                    .handshake(io)
                    .await
                    .map_err(|_| Error::Client)?;
                tokio::task::spawn(async move {
                    if let Err(err) = conn.await {
                        println!("Connection failed: {:?}", err);
                    }
                });
                Ok(HttpResponse::Http2(sender))
            } else {
                let (sender, conn) = http1::Builder::new()
                    .handshake(io)
                    .await
                    .map_err(|_| Error::Client)?;
                tokio::task::spawn(async move {
                    if let Err(err) = conn.await {
                        println!("Connection failed: {:?}", err);
                    }
                });
                Ok(HttpResponse::Http1(sender))
            }
        } else {
            let io = TokioIo::new(stream);
            let (sender, conn) = http1::Builder::new()
                .handshake(io)
                .await
                .map_err(|_| Error::Client)?;
            tokio::task::spawn(async move {
                if let Err(err) = conn.await {
                    println!("Connection failed: {:?}", err);
                }
            });
            Ok(HttpResponse::Http1(sender))
        }
    }
}

pub enum HttpResponse {
    Http1(http1::SendRequest<Empty<Bytes>>),
    Http2(http2::SendRequest<Empty<Bytes>>),
}

impl HttpResponse {
    pub async fn send_request(
        &mut self,
        req: Request<Empty<Bytes>>,
    ) -> Result<Response<hyper::body::Incoming>, hyper::Error> {
        match self {
            HttpResponse::Http1(sender) => sender.send_request(req).await,
            HttpResponse::Http2(sender) => sender.send_request(req).await,
        }
    }
}

async fn setup_tls(stream: TcpStream, host: &str) -> Result<TlsStream<TcpStream>, Error> {
    let mut root_cert_store = RootCertStore::empty();
    root_cert_store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    let mut config = rustls::ClientConfig::builder()
        .with_root_certificates(root_cert_store)
        .with_no_client_auth();

    config.alpn_protocols.push(b"h2".to_vec());
    config.alpn_protocols.push(b"http/1.1".to_vec());

    let connector = TlsConnector::from(Arc::new(config));
    let host_c = host.to_string();
    let dnsname = ServerName::try_from(host_c).map_err(|_| Error::InvalidUrl)?;
    let stream = connector
        .connect(dnsname, stream)
        .await
        .map_err(|_| Error::ConnectionFailed)?;
    Ok(stream)
}
