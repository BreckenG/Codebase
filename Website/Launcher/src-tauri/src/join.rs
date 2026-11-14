use crate::{game, helper, updates, Launcher};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{fs, path::Path};
use tauri::{State, WebviewWindow};
use tauri_plugin_opener::OpenerExt;
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinStatus {
    pub version: u8,
    pub request_id: String,
    pub code: String,
    pub state: String,
    pub message: String,
    pub updated_at: u64,
}
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinTicket {
    pub version: u8,
    pub request_id: String,
    pub code: String,
    pub created_at: u64,
    pub expires_at: u64,
}
pub fn normalize_code(code: &str) -> Result<String, String> {
    let code = code.trim().to_ascii_uppercase();
    if code.is_empty() || code.len() > 12 || !code.bytes().all(|c| c.is_ascii_alphanumeric()) { return Err("Use a room code with 1 to 12 letters or numbers.".into()); }
    Ok(code)
}
pub fn read_join_status(game: &Path) -> Option<JoinStatus> {
    let p = helper::helper_folder(game).join("launch-status.json");
    if fs::metadata(&p).ok()?.len() > 8192 { return None; }
    let status: JoinStatus = serde_json::from_slice(&fs::read(p).ok()?).ok()?;
    if status.version != 1 || uuid::Uuid::parse_str(&status.request_id).is_err() || normalize_code(&status.code).is_err() || !["waiting", "joining", "joined", "failed"].contains(&status.state.as_str()) || status.updated_at > super::now() + 5000 || super::now().saturating_sub(status.updated_at) > 600_000 { return None; }
    Some(status)
}
pub struct PendingJoin {
    pub status: JoinStatus,
    deadline: u64,
}
impl PendingJoin {
    fn active(&self) -> bool { ["waiting", "joining"].contains(&self.status.state.as_str()) }
    pub fn update(&mut self, report: Option<JoinStatus>, now: u64) -> bool {
        if !self.active() { return false; }
        if let Some(report) = report {
            if report.request_id == self.status.request_id && report.code == self.status.code && report.updated_at <= self.deadline { self.status = report; }
        }
        if self.active() && now >= self.deadline {
            self.status.state = "failed".into(); self.status.message = "No join confirmation arrived. Check the game and try again.".into(); self.status.updated_at = now;
            return true;
        }
        false
    }
}
pub fn join_active(pending: &Option<PendingJoin>) -> bool { pending.as_ref().is_some_and(PendingJoin::active) }
#[tauri::command]
pub async fn launch_game(window: WebviewWindow, app: tauri::AppHandle, code: Option<String>, state: State<'_, Launcher>, updates: State<'_, updates::UpdateLock>) -> Result<JoinStatus, String> {
    super::require_launcher_window(&window)?; let _guard = updates.0.try_lock().map_err(|_| "An update or launch is already in progress.")?;
    if let Ok(Some(_)) = updates::find_update(&app).await { return Err("Update the launcher before launching or joining a code.".into()); }
    let mut pending = state.pending_join.lock().map_err(|_| "Launch status is busy.")?; let root = game::game_folder(&state)?;
    if join_active(&pending) { return Err("A join is already pending. Cancel it before selecting another room.".into()); }
    let request_id = uuid::Uuid::new_v4().to_string(); let code = code.map(|c| normalize_code(&c)).transpose()?; let started = super::now();
    let ticket = helper::helper_folder(&root).join("launch.json");
    if let Some(code) = &code {
        helper::require_helper_ready(&root, &helper::bundled_helper_path(&app)?, game::game_running())?;
        super::write_json(&ticket, &JoinTicket { version: 1, request_id: request_id.clone(), code: code.clone(), created_at: started, expires_at: started + 120_000 })?;
    } else if ticket.exists() { fs::remove_file(&ticket).map_err(|_| "Could not clear the previous join request.")?; }
    if !game::game_running() {
        if app.opener().open_url(format!("steam://rungameid/{}", game::APP_ID), None::<&str>).is_err() {
            let _ = fs::remove_file(&ticket); return Err("Steam could not start. Open Steam and try again.".into());
        }
    }
    let status = JoinStatus { version: 1, request_id, code: code.clone().unwrap_or_default(), state: if code.is_some() { "waiting" } else { "launched" }.into(), message: if code.is_some() { "Waiting for Gorilla Tag to join the room." } else { "Launch requested through Steam." }.into(), updated_at: started };
    *pending = Some(PendingJoin { status: status.clone(), deadline: started + 120_000 });
    Ok(status)
}
#[derive(Deserialize)]
pub struct NotePayload { kind: String, title: String, body: Option<String>, detail: Option<String> }
#[tauri::command]
pub fn notify(window: WebviewWindow, payload: NotePayload, state: State<Launcher>) -> Result<(), String> {
    super::require_launcher_window(&window)?;
    if !game::game_running() { return Ok(()); }
    let root = game::game_folder(&state)?;
    let clip = |text: Option<String>, max: usize| text.unwrap_or_default().chars().filter(|c| c.is_ascii() && !c.is_ascii_control()).take(max).collect::<String>();
    let kind = if ["up", "down", "rank"].contains(&payload.kind.as_str()) { payload.kind.clone() } else { "info".to_string() };
    let title = clip(Some(payload.title), 40);
    if title.is_empty() { return Ok(()); }
    let now = super::now();
    super::write_json(&helper::helper_folder(&root).join("notify.json"), &json!({ "version": 1, "id": uuid::Uuid::new_v4().to_string(), "kind": kind, "title": title, "body": clip(payload.body, 60), "detail": clip(payload.detail, 60), "createdAt": now, "expiresAt": now + 20_000 }))
}
#[tauri::command]
pub fn cancel_join(window: WebviewWindow, state: State<Launcher>) -> Result<(), String> {
    super::require_launcher_window(&window)?; let mut pending = state.pending_join.lock().map_err(|_| "Launch status is busy.")?;
    if let Ok(root) = game::game_folder(&state) {
        let ticket = helper::helper_folder(&root).join("launch.json");
        if ticket.exists() { fs::remove_file(ticket).map_err(|_| "Could not cancel the pending request.")?; }
    }
    *pending = None;
    Ok(())
}
