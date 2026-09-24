use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration; pub const ORIGIN: &str = "https://rankedworld.com";
#[derive(Clone)]
pub struct Api { pub client: reqwest::Client }
#[derive(Serialize)]
pub struct Reply { pub status: u16, pub body: String }
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Grant {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SignInInfo { pub user_code: String, pub verification_uri: String, pub expires_in: u64, pub interval: u64 }
pub fn credential() -> Result<keyring::Entry, String> { keyring::Entry::new("com.rankedworld.launcher", "desktop-session").map_err(|_| "Windows credential storage is unavailable.".into()) }
pub fn token() -> Result<Option<String>, String> {
    match credential()?.get_password() {
        Ok(t) => Ok(Some(t)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("Could not read the saved desktop session.".into()),
    }
}
pub fn save_token(token: &str) -> Result<(), String> { credential()?.set_password(token).map_err(|_| "Could not save your session securely. Please try signing in again.".into()) }
pub fn clear_token() -> Result<(), String> {
    match credential()?.delete_credential() { Ok(()) | Err(keyring::Error::NoEntry) => Ok(()), Err(_) => Err("Could not remove the saved desktop session.".into()) }
}
pub fn api_url(path: &str) -> Result<url::Url, String> {
    if path.len() > 4096 || !path.starts_with("/api/") || path.contains(['\\', '#']) { return Err("Unsupported API request.".into()); }
    let base = url::Url::parse(ORIGIN).unwrap(); let url = base.join(path).map_err(|_| "Invalid API path.")?;
    if url.origin() != base.origin() || !url.path().starts_with("/api/") { return Err("Unsupported API origin.".into()); }
    Ok(url)
}
pub fn external_url(value: &str) -> Result<url::Url, String> {
    let url = url::Url::parse(value).map_err(|_| "Invalid website link.")?; let host = url.host_str().unwrap_or("");
    let allowed = ["rankedworld.com", "discord.gg", "discord.com", "docs.google.com", "stripe.com", "www.gorillatagvr.com", "coag.gov"].contains(&host)
        || host.ends_with(".discord.com") || host.ends_with(".stripe.com");
    if url.scheme() != "https" || !allowed || !url.username().is_empty() || url.password().is_some() || url.port().is_some() { return Err("This link cannot open from the launcher.".into()); }
    Ok(url)
}
fn replay_request(url: &url::Url, method: &str, authenticated: bool) -> bool {
    if !authenticated || method != "GET" || url.origin() != url::Url::parse(ORIGIN).unwrap().origin() || url.query().is_some() || url.fragment().is_some() { return false; }
    let Some(id) = url.path().strip_prefix("/api/me/replays/") else { return false; };
    id.len() == 36 && uuid::Uuid::parse_str(id).ok().is_some_and(|value| value.hyphenated().to_string().eq_ignore_ascii_case(id))
}
impl Api {
    pub fn new() -> Result<Self, String> {
        let client = reqwest::Client::builder().timeout(Duration::from_secs(20)).redirect(reqwest::redirect::Policy::none()).user_agent("RankedWorldLauncher/0.1.0").build().map_err(|_| "Could not create the website connection.")?;
        Ok(Self { client })
    }
    pub async fn request(&self, path: &str, method: &str, body: Option<String>, bearer: Option<String>) -> Result<Reply, String> {
        if !["GET", "POST", "DELETE", "PUT", "PATCH"].contains(&method) { return Err("Unsupported request method.".into()); }
        if body.as_ref().is_some_and(|b| b.len() > 65536) { return Err("The request is too large.".into()); }
        let url = api_url(path)?;
        let replay = replay_request(&url, method, bearer.as_ref().is_some_and(|token| !token.is_empty()));
        let mut request = self.client.request(reqwest::Method::from_bytes(method.as_bytes()).unwrap(), url)
            .timeout(Duration::from_secs(if replay { 90 } else { 20 }))
            .header("Origin", ORIGIN).header("Accept", "application/json");
        if let Some(token) = bearer { request = request.bearer_auth(token); }
        if let Some(body) = body { request = request.header("Content-Type", "application/json").body(body); }
        let mut response = request.send().await.map_err(|_| "Could not reach Ranked World. Check your connection and try again.")?;
        let status = response.status().as_u16(); let mut data = Vec::new();
        let limit = if replay && response.status().is_success() { 314_572_800 } else { 4_194_304 };
        while let Some(chunk) = response.chunk().await.map_err(|_| "The website response was interrupted.")? {
            if data.len().saturating_add(chunk.len()) > limit { return Err("The website response is too large.".into()); }
            data.extend_from_slice(&chunk);
        }
        let body = String::from_utf8(data).map_err(|_| "The website returned an unsupported response.")?;
        Ok(Reply { status, body })
    }
    pub async fn json(&self, path: &str, body: Value) -> Result<Value, String> {
        let response = self.request(path, "POST", Some(body.to_string()), None).await?;
        if !(200..300).contains(&response.status) { return Err(format!("The sign-in request failed ({}). Please try again.", response.status)); }
        serde_json::from_str(&response.body).map_err(|_| "The website returned an invalid sign-in response.".into())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn large_replay_access_requires_exact_authenticated_get_route() {
        let url = api_url("/api/me/replays/11111111-1111-4111-8111-111111111111").unwrap();
        assert!(replay_request(&url, "GET", true));
        assert!(!replay_request(&url, "GET", false));
        assert!(!replay_request(&url, "POST", true));
        for path in ["/api/me/replays", "/api/me/replays/invalid", "/api/me/replays/11111111-1111-4111-8111-111111111111/extra", "/api/me/replays/11111111-1111-4111-8111-111111111111?extra=true", "/api/player/11111111-1111-4111-8111-111111111111"] { assert!(!replay_request(&api_url(path).unwrap(), "GET", true)); }
        assert!(!replay_request(&url::Url::parse("https://example.com/api/me/replays/11111111-1111-4111-8111-111111111111").unwrap(), "GET", true));
    }
}
