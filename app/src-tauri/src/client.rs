use super::Error;
use http::Uri;
use http_body_util::Empty;
use hyper::body::Bytes;
use hyper::client::conn::http1::Builder;
use hyper::client::conn::http1::SendRequest;
use hyper_util::rt::TokioIo;
use pki_types::ServerName;
use std::sync::Arc;
use tokio::io::AsyncRead;
use tokio::io::AsyncWrite;
use tokio::net::TcpStream;
use tokio_rustls::client::TlsStream;
use tokio_rustls::rustls::{ClientConfig, RootCertStore};
use tokio_rustls::TlsConnector;

/// A HTTPS Connector that will fallback to http depending on the uri scheme
pub struct HttpsConnector<'a> {
    is_https: bool,
    uri: &'a Uri,
    req: Builder,
}

impl<'a> HttpsConnector<'a> {
    pub fn new(uri: &'a Uri) -> Self {
        let mut req = Builder::new();
        req.preserve_header_case(true).title_case_headers(true);

        let is_https = uri.scheme_str() == Some("https");

        Self { is_https, uri, req }
    }

    pub async fn connect(&self) -> Result<SendRequest<Empty<Bytes>>, Error> {
        let port = self
            .uri
            .port_u16()
            .unwrap_or(if self.is_https { 443 } else { 80 });
        let host = self.uri.host().ok_or(Error::InvalidUrl)?;

        let address = format!("{}:{}", host, port);
        let stream = TcpStream::connect(address).await.map_err(|_| Error::Dns)?;
        let io: Box<dyn StreamExt> = if self.is_https {
            let tls_stream = setup_tls(stream, host).await?;
            Box::new(tls_stream)
        } else {
            Box::new(stream)
        };
        let io = TokioIo::new(io);

        let (sender, conn) = self.req.handshake(io).await.map_err(|_| Error::Client)?;
        tokio::task::spawn(async move {
            if let Err(err) = conn.await {
                println!("Connection failed: {:?}", err);
            }
        });

        Ok(sender)
    }
}

async fn setup_tls(stream: TcpStream, host: &str) -> Result<TlsStream<TcpStream>, Error> {
    let mut root_cert_store = RootCertStore::empty();
    root_cert_store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    let config = ClientConfig::builder()
        .with_root_certificates(root_cert_store)
        .with_no_client_auth();
    let connector = TlsConnector::from(Arc::new(config));
    let host_c = host.to_string();
    let dnsname = ServerName::try_from(host_c).map_err(|_| Error::InvalidUrl)?;
    let stream = connector
        .connect(dnsname, stream)
        .await
        .map_err(|_| Error::ConnectionFailed)?;
    Ok(stream)
}

trait StreamExt: AsyncRead + AsyncWrite + Unpin + Send {}

impl StreamExt for TcpStream {}
impl StreamExt for TlsStream<TcpStream> {}
