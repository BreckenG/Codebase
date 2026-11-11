use crate::{device_ids, sign_in, Launcher};
use serde::Serialize;
use serde_json::Value;
use tauri::{State, WebviewWindow};
use tauri_plugin_opener::OpenerExt;
use std::time::Duration; pub const ORIGIN: &str = "https://rankedworld.com";
#[derive(Clone)]
pub struct Website { pub client: reqwest::Client }
#[derive(Serialize)]
pub struct Reply { pub status: u16, pub body: String }
pub fn website_api_url(path: &str) -> Result<url::Url, String> {
    if path.len() > 4096 || !path.starts_with("/api/") || path.contains(['\\', '#']) { return Err("Unsupported API request.".into()); }
    let base = url::Url::parse(ORIGIN).unwrap(); let url = base.join(path).map_err(|_| "Invalid API path.")?;
    if url.origin() != base.origin() || !url.path().starts_with("/api/") { return Err("Unsupported API origin.".into()); }
    Ok(url)
}
pub fn allowed_link(value: &str) -> Result<url::Url, String> {
    let url = url::Url::parse(value).map_err(|_| "Invalid website link.")?; let host = url.host_str().unwrap_or("");
    let allowed = ["rankedworld.com", "discord.gg", "discord.com", "docs.google.com", "stripe.com", "www.gorillatagvr.com", "coag.gov"].contains(&host)
        || host.ends_with(".discord.com") || host.ends_with(".stripe.com");
    if url.scheme() != "https" || !allowed || !url.username().is_empty() || url.password().is_some() || url.port().is_some() { return Err("This link cannot open from the launcher.".into()); }
    Ok(url)
}
fn is_replay_download(url: &url::Url, method: &str, authenticated: bool) -> bool {
    if !authenticated || method != "GET" || url.origin() != url::Url::parse(ORIGIN).unwrap().origin() || url.query().is_some() || url.fragment().is_some() { return false; }
    let Some(id) = url.path().strip_prefix("/api/me/replays/") else { return false; };
    id.len() == 36 && uuid::Uuid::parse_str(id).ok().is_some_and(|value| value.hyphenated().to_string().eq_ignore_ascii_case(id))
}
impl Website {
    pub fn new() -> Result<Self, String> {
        let mut headers = reqwest::header::HeaderMap::new();
        if let Some(id) = device_ids::machine_id_hash().and_then(|id| reqwest::header::HeaderValue::from_str(&id).ok()) { headers.insert("X-Ranked-Device", id); }
        let client = reqwest::Client::builder().timeout(Duration::from_secs(20)).redirect(reqwest::redirect::Policy::none()).user_agent("RankedWorldLauncher").default_headers(headers).build().map_err(|_| "Could not create the website connection.")?;
        Ok(Self { client })
    }
    pub async fn request(&self, path: &str, method: &str, body: Option<String>, bearer: Option<String>) -> Result<Reply, String> {
        if !["GET", "POST", "DELETE", "PUT", "PATCH"].contains(&method) { return Err("Unsupported request method.".into()); }
        if body.as_ref().is_some_and(|b| b.len() > 65536) { return Err("The request is too large.".into()); }
        let url = website_api_url(path)?;
        let replay = is_replay_download(&url, method, bearer.as_ref().is_some_and(|token| !token.is_empty()));
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
    pub async fn post_json(&self, path: &str, body: Value) -> Result<Value, String> {
        let response = self.request(path, "POST", Some(body.to_string()), None).await?;
        if !(200..300).contains(&response.status) { return Err(format!("The sign-in request failed ({}). Please try again.", response.status)); }
        serde_json::from_str(&response.body).map_err(|_| "The website returned an invalid sign-in response.".into())
    }
}
#[tauri::command]
pub async fn api_request(window: WebviewWindow, path: String, method: String, body: Option<String>, state: State<'_, Launcher>) -> Result<Reply, String> {
    super::require_launcher_window(&window)?;
    if website_api_url(&path)?.path().starts_with("/api/desktop/") { return Err("Use the launcher's account controls for this action.".into()); }
    let (attempt, token) = {
        let account = state.account.lock().map_err(|_| "Sign-in is busy.")?;
        (account.attempt, sign_in::saved_token()?)
    }; let reply = state.api.request(&path, &method, body, token.clone()).await?;
    if reply.status == 401 && token.is_some() {
        let account = state.account.lock().map_err(|_| "Sign-in is busy.")?;
        if account.session_was_rejected(attempt, token.as_deref(), sign_in::saved_token()?.as_deref()) { sign_in::clear_token()?; state.presence.clear(); }
    }
    if path == "/api/me/player" && reply.status == 200 {
        let account = state.account.lock().map_err(|_| "Sign-in is busy.")?;
        if account.is_current_attempt(attempt) && token.is_some() && token == sign_in::saved_token()? {
            if let Some(rank) = serde_json::from_str::<serde_json::Value>(&reply.body).ok().and_then(|v| v["player"]["ranked"]["tier"]["name"].as_str().map(str::to_owned)) { let _ = state.presence.set_rank(&rank); } else { state.presence.clear(); }
        }
    }
    Ok(reply)
}
#[tauri::command]
pub fn open_external(window: WebviewWindow, app: tauri::AppHandle, url: String) -> Result<(), String> {
    super::require_launcher_window(&window)?;
    app.opener().open_url(allowed_link(&url)?.as_str(), None::<&str>).map_err(|_| "Could not open your browser.".into())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn large_replay_access_requires_exact_authenticated_get_route() {
        let url = website_api_url("/api/me/replays/11111111-1111-4111-8111-111111111111").unwrap();
        assert!(is_replay_download(&url, "GET", true));
        assert!(!is_replay_download(&url, "GET", false));
        assert!(!is_replay_download(&url, "POST", true));
        for path in ["/api/me/replays", "/api/me/replays/invalid", "/api/me/replays/11111111-1111-4111-8111-111111111111/extra", "/api/me/replays/11111111-1111-4111-8111-111111111111?extra=true", "/api/player/11111111-1111-4111-8111-111111111111"] { assert!(!is_replay_download(&website_api_url(path).unwrap(), "GET", true)); }
        assert!(!is_replay_download(&url::Url::parse("https://example.com/api/me/replays/11111111-1111-4111-8111-111111111111").unwrap(), "GET", true));
    }
}
