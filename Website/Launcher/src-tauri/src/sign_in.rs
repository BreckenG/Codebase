use crate::{website, Launcher};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{State, WebviewWindow};
use tauri_plugin_opener::OpenerExt;
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignInGrant {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SignInInfo { pub user_code: String, pub verification_uri: String, pub expires_in: u64, pub interval: u64 }
pub fn saved_session_entry() -> Result<keyring::Entry, String> { keyring::Entry::new("com.rankedworld.launcher", "desktop-session").map_err(|_| "Windows credential storage is unavailable.".into()) }
pub fn saved_token() -> Result<Option<String>, String> {
    match saved_session_entry()?.get_password() {
        Ok(t) => Ok(Some(t)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err("Could not read the saved desktop session.".into()),
    }
}
pub fn save_token(token: &str) -> Result<(), String> { saved_session_entry()?.set_password(token).map_err(|_| "Could not save your session securely. Please try signing in again.".into()) }
pub fn clear_token() -> Result<(), String> {
    match saved_session_entry()?.delete_credential() { Ok(()) | Err(keyring::Error::NoEntry) => Ok(()), Err(_) => Err("Could not remove the saved desktop session.".into()) }
}
#[derive(Default)]
pub struct SignIn {
    pub attempt: u64,
    pending: Option<(SignInGrant, u64)>,
    polling: bool,
}
impl SignIn {
    pub fn is_current_attempt(&self, attempt: u64) -> bool { self.attempt == attempt }
    fn finish_poll(&mut self, attempt: u64) -> bool {
        if !self.is_current_attempt(attempt) { return false; }
        self.polling = false;
        true
    }
    pub fn session_was_rejected(&self, attempt: u64, sent: Option<&str>, current: Option<&str>) -> bool { self.is_current_attempt(attempt) && sent.is_some() && sent == current }
    fn cancel_attempt(&mut self) -> u64 {
        self.attempt = self.attempt.wrapping_add(1); self.pending = None; self.polling = false;
        self.attempt
    }
}
#[tauri::command]
pub async fn begin_sign_in(window: WebviewWindow, app: tauri::AppHandle, state: State<'_, Launcher>) -> Result<SignInInfo, String> {
    super::require_launcher_window(&window)?; let attempt = state.account.lock().map_err(|_| "Sign-in is busy.")?.cancel_attempt();
    let value = state.api.post_json("/api/desktop/start", json!({})).await?;
    let grant: SignInGrant = serde_json::from_value(value).map_err(|_| "The website returned an invalid sign-in request.")?;
    let verification = website::allowed_link(&grant.verification_uri)?;
    if verification.host_str() != Some("rankedworld.com") || verification.path() != "/launcher/connect" || grant.expires_in > 600 || grant.interval < 1 || grant.interval > 30 { return Err("Invalid sign-in verification address.".into()); }
    let mut account = state.account.lock().map_err(|_| "Sign-in is busy.")?;
    if !account.is_current_attempt(attempt) { return Err("This sign-in request was canceled.".into()); }
    app.opener().open_url(verification.as_str(), None::<&str>).map_err(|_| "Could not open your browser.")?;
    let info = SignInInfo { user_code: grant.user_code.clone(), verification_uri: grant.verification_uri.clone(), expires_in: grant.expires_in, interval: grant.interval };
    account.pending = Some((grant, super::now()));
    Ok(info)
}
#[tauri::command]
pub async fn poll_sign_in(window: WebviewWindow, state: State<'_, Launcher>) -> Result<String, String> {
    super::require_launcher_window(&window)?;
    let (attempt, pending) = {
        let mut account = state.account.lock().map_err(|_| "Sign-in is busy.")?; let pending = account.pending.clone().ok_or("Start a new sign-in request.")?;
        if super::now().saturating_sub(pending.1) >= pending.0.expires_in * 1000 {
            account.cancel_attempt(); return Ok("expired".into());
        }
        if account.polling { return Ok("pending".into()); }
        account.polling = true;
        (account.attempt, pending)
    }; let response = state.api.post_json("/api/desktop/poll", json!({ "deviceCode": pending.0.device_code })).await;
    let stale_token = {
        let mut account = state.account.lock().map_err(|_| "Sign-in is busy.")?;
        if account.finish_poll(attempt) {
            let response = response?; let status = response["status"].as_str().ok_or("Invalid sign-in response.")?;
            if status == "approved" {
                let token = response["token"].as_str().ok_or("Missing account session.")?;
                if token.len() < 32 || token.len() > 512 { return Err("Invalid account session.".into()); }
                save_token(token)?; account.cancel_attempt();
            } else if status == "expired" { account.cancel_attempt(); }
            else if status != "pending" { return Err("Invalid sign-in response.".into()); }
            return Ok(status.into());
        }
        response.ok().and_then(|v| {
            if v["status"] == "approved" { v["token"].as_str().map(str::to_owned) } else { None }
        })
    };
    if let Some(token) = stale_token { let _ = state.api.request("/api/desktop/logout", "POST", Some("{}".into()), Some(token)).await; }
    Ok("canceled".into())
}
#[tauri::command]
pub fn cancel_sign_in(window: WebviewWindow, state: State<Launcher>) -> Result<(), String> {
    super::require_launcher_window(&window)?; state.account.lock().map_err(|_| "Sign-in is busy.")?.cancel_attempt();
    Ok(())
}
#[tauri::command]
pub async fn sign_out(window: WebviewWindow, state: State<'_, Launcher>) -> Result<(), String> {
    super::require_launcher_window(&window)?;
    let token = {
        let mut account = state.account.lock().map_err(|_| "Sign-in is busy.")?; account.cancel_attempt(); let token = saved_token()?; clear_token()?; state.presence.clear();
        token
    };
    if let Some(token) = token { let _ = state.api.request("/api/desktop/logout", "POST", Some("{}".into()), Some(token)).await; }
    Ok(())
}
