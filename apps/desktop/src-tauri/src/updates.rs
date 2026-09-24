use serde::Serialize;
use serde_json::json;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};
use tauri_plugin_updater::{Update, UpdaterExt};
#[derive(Default)]
pub struct Updates(pub tokio::sync::Mutex<()>);
#[derive(Serialize)]
pub struct Available { available: bool, version: Option<String> }
fn trusted_download(url: &url::Url) -> bool { url.scheme() == "https" && url.host_str() == Some("rankedworld.com") && url.port_or_known_default() == Some(443) && url.username().is_empty() && url.password().is_none() && url.path().starts_with("/downloads/launcher/") }
pub async fn latest(app: &AppHandle) -> Result<Option<Update>, String> {
    let exit_app = app.clone();
    let mut update = app.updater_builder().on_before_exit(move || exit_app.state::<super::Desktop>().presence.clear()).timeout(Duration::from_secs(20)).build().map_err(|e| e.to_string())?.check().await.map_err(|_| "Could not check for updates. Check your connection and try again.".to_string())?;
    if update.as_ref().is_some_and(|u| !trusted_download(&u.download_url)) { return Err("The update download address is invalid.".into()); }
    if let Some(release) = update.as_mut() { release.timeout = Some(Duration::from_secs(600)); }
    Ok(update)
}
#[tauri::command]
pub async fn check_update(window: WebviewWindow, app: AppHandle, updates: State<'_, Updates>) -> Result<Available, String> {
    super::local_window(&window)?;
    let _guard = updates.0.lock().await;
    let update = latest(&app).await?;
    Ok(Available { available: update.is_some(), version: update.map(|u| u.version) })
}
#[tauri::command]
pub async fn install_update(window: WebviewWindow, app: AppHandle, updates: State<'_, Updates>) -> Result<(), String> {
    super::local_window(&window)?;
    let _guard = updates.0.try_lock().map_err(|_| "Another update or launch is in progress.")?;
    let state = app.state::<super::Desktop>();
    if super::join_active(&*state.pending_room.lock().map_err(|_| "Launch status is busy.")?) { return Err("Cancel the pending join before updating.".into()); }
    let update = latest(&app).await?.ok_or("You already have the latest launcher.")?;
    let mut downloaded = 0u64;
    let bytes = update.download(|length, total| { downloaded += length as u64; let _ = app.emit("launcher-update", json!({"phase":"downloading","downloaded":downloaded,"total":total})); }, || {}).await.map_err(|e| format!("Update download or signature verification failed: {e}"))?;
    let _ = app.emit("launcher-update", json!({"phase":"installing","downloaded":bytes.len(),"total":bytes.len()}));
    update.install(bytes).map_err(|e| format!("Could not install the update: {e}"))?;
    Ok(())
}
