#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod api; mod game; mod updates; mod presence; mod cards; mod capture;
use api::{Api, Grant, Reply, SignInInfo};
use game::{JoinStatus, JoinTicket, Settings};
use serde::Serialize;
use serde_json::json;
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{Manager, State, WebviewUrl, WebviewWindow};
use tauri_plugin_opener::OpenerExt;
struct Desktop {
    api: Api,
    presence: presence::Presence,
    settings: Mutex<Settings>,
    cfg_path: PathBuf,
    account: Mutex<Account>,
    pending_room: Mutex<Option<PendingJoin>>,
}
#[derive(Default)]
struct Account {
    generation: u64,
    pending: Option<(Grant, u64)>,
    polling: bool,
}
impl Account {
    fn current(&self, generation: u64) -> bool { self.generation == generation }
    fn finish_poll(&mut self, generation: u64) -> bool {
        if !self.current(generation) { return false; }
        self.polling = false;
        true
    }
    fn rejects_session(&self, generation: u64, sent: Option<&str>, current: Option<&str>) -> bool { self.current(generation) && sent.is_some() && sent == current }
    fn invalidate(&mut self) -> u64 {
        self.generation = self.generation.wrapping_add(1); self.pending = None; self.polling = false;
        self.generation
    }
}
struct PendingJoin {
    status: JoinStatus,
    deadline: u64,
}
impl PendingJoin {
    fn active(&self) -> bool { ["waiting", "joining"].contains(&self.status.state.as_str()) }
    fn update(&mut self, report: Option<JoinStatus>, now: u64) -> bool {
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
fn join_active(pending: &Option<PendingJoin>) -> bool { pending.as_ref().is_some_and(PendingJoin::active) }
fn local_window(window: &WebviewWindow) -> Result<(), String> {
    let url = window.url().map_err(|_| "Unavailable app window.")?;
    let local = url.scheme() == "tauri" || url.host_str() == Some("tauri.localhost")
        || (cfg!(debug_assertions) && [Some("localhost"), Some("127.0.0.1")].contains(&url.host_str()) && url.port() == Some(1420));
    if window.label() != "main" || !local { return Err("Only the local launcher can perform this action.".into()); }
    Ok(())
}
fn configured_game(state: &Desktop) -> Result<PathBuf, String> {
    let path = state.settings.lock().map_err(|_| "Game settings are busy.")?.game_path.clone().ok_or("Choose your Gorilla Tag installation in Game settings.")?;
    game::validate_game(&path)
}
fn bundled_helper(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().resolve("resources/JoinHelper.dll", tauri::path::BaseDirectory::Resource).map_err(|_| "The join helper is missing from this launcher.".into())
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopStatus {
    game_path: Option<String>,
    game_installed: bool,
    bep_in_ex_installed: bool,
    helper_installed: bool,
    helper_loaded: bool,
    game_running: bool,
    signed_in: bool,
    capture_recording: bool,
    join: Option<JoinStatus>,
    version: &'static str,
}
#[tauri::command]
fn desktop_status(window: WebviewWindow, app: tauri::AppHandle, state: State<Desktop>) -> Result<DesktopStatus, String> {
    local_window(&window)?; let mut pending = state.pending_room.lock().map_err(|_| "Launch status is busy.")?; let game = configured_game(&state).ok();
    if let Some(join) = pending.as_mut() {
        if join.update(game.as_ref().and_then(|root| game::read_status(root)), game::now()) {
            if let Some(root) = &game { let _ = fs::remove_file(game::ticket_dir(root).join("launch.json")); }
        }
    }
    let helper = bundled_helper(&app)?;
    Ok(DesktopStatus {
        game_path: game.as_ref().map(|p| p.to_string_lossy().strip_prefix(r"\\?\").unwrap_or(&p.to_string_lossy()).to_string()),
        game_installed: game.is_some(),
        bep_in_ex_installed: game.as_ref().is_some_and(|p| p.join("BepInEx/core/BepInEx.dll").is_file()),
        helper_installed: game.as_ref().is_some_and(|p| game::same_file(&game::helper_path(p), &helper)),
        helper_loaded: game.as_ref().is_some_and(|p| game::helper_loaded(p)),
        game_running: game::game_running(), signed_in: api::token()?.is_some(),
        capture_recording: game.as_ref().is_some_and(|p| capture::recording(&game::ticket_dir(p))),
        join: pending.as_ref().map(|p| p.status.clone()), version: env!("CARGO_PKG_VERSION"),
    })
}
#[tauri::command]
fn set_game_path(window: WebviewWindow, path: String, state: State<Desktop>) -> Result<(), String> {
    local_window(&window)?; let pending = state.pending_room.lock().map_err(|_| "Launch status is busy.")?;
    if join_active(&pending) { return Err("Cancel the pending join before changing the game folder.".into()); }
    let path = game::validate_game(&PathBuf::from(path))?; let settings = Settings { game_path: Some(path) }; game::write_json(&state.cfg_path, &settings)?;
    *state.settings.lock().map_err(|_| "Game settings are busy.")? = settings;
    Ok(())
}
#[tauri::command]
fn detect_game(window: WebviewWindow, state: State<Desktop>) -> Result<(), String> {
    local_window(&window)?; let pending = state.pending_room.lock().map_err(|_| "Launch status is busy.")?;
    if join_active(&pending) { return Err("Cancel the pending join before changing the game folder.".into()); }
    let path = game::discover_game().ok_or("Gorilla Tag was not found in your Steam libraries. Choose its folder below.")?;
    let settings = Settings { game_path: Some(path) }; game::write_json(&state.cfg_path, &settings)?;
    *state.settings.lock().map_err(|_| "Game settings are busy.")? = settings;
    Ok(())
}
#[tauri::command]
fn install_join_helper(window: WebviewWindow, app: tauri::AppHandle, state: State<Desktop>) -> Result<(), String> {
    local_window(&window)?;
    if game::game_running() { return Err("Close Gorilla Tag before installing or updating the join helper.".into()); }
    let game = configured_game(&state)?;
    if !game.join("BepInEx/core/BepInEx.dll").is_file() { return Err("Install BepInEx for Gorilla Tag before installing the join helper.".into()); }
    game::install_helper(&game, &bundled_helper(&app)?)
}
#[tauri::command]
async fn launch_game(window: WebviewWindow, app: tauri::AppHandle, code: Option<String>, state: State<'_, Desktop>, updates: State<'_, updates::Updates>) -> Result<JoinStatus, String> {
    local_window(&window)?; let _guard = updates.0.try_lock().map_err(|_| "An update or launch is already in progress.")?;
    if updates::latest(&app).await?.is_some() { return Err("Update the launcher before launching or joining a code.".into()); }
    let mut pending = state.pending_room.lock().map_err(|_| "Launch status is busy.")?; let root = configured_game(&state)?;
    if join_active(&pending) { return Err("A join is already pending. Cancel it before selecting another room.".into()); }
    let request_id = uuid::Uuid::new_v4().to_string(); let code = code.map(|c| game::normalize_code(&c)).transpose()?; let started = game::now();
    let ticket = game::ticket_dir(&root).join("launch.json");
    if let Some(code) = &code {
        game::check_join_helper(&root, &bundled_helper(&app)?, game::game_running())?;
        game::write_json(&ticket, &JoinTicket { version: 1, request_id: request_id.clone(), code: code.clone(), created_at: started, expires_at: started + 120_000 })?;
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
#[tauri::command]
fn cancel_join(window: WebviewWindow, state: State<Desktop>) -> Result<(), String> {
    local_window(&window)?; let mut pending = state.pending_room.lock().map_err(|_| "Launch status is busy.")?; let root = configured_game(&state)?;
    let ticket = game::ticket_dir(&root).join("launch.json");
    if ticket.exists() { fs::remove_file(ticket).map_err(|_| "Could not cancel the pending request.")?; }
    *pending = None;
    Ok(())
}
#[tauri::command]
async fn api_request(window: WebviewWindow, path: String, method: String, body: Option<String>, state: State<'_, Desktop>) -> Result<Reply, String> {
    local_window(&window)?;
    if api::api_url(&path)?.path().starts_with("/api/desktop/") { return Err("Use the launcher's account controls for this action.".into()); }
    let (generation, token) = {
        let account = state.account.lock().map_err(|_| "Sign-in is busy.")?;
        (account.generation, api::token()?)
    }; let reply = state.api.request(&path, &method, body, token.clone()).await?;
    if reply.status == 401 && token.is_some() {
        let account = state.account.lock().map_err(|_| "Sign-in is busy.")?;
        if account.rejects_session(generation, token.as_deref(), api::token()?.as_deref()) { api::clear_token()?; state.presence.clear(); }
    }
    if path == "/api/me/player" && reply.status == 200 {
        let account = state.account.lock().map_err(|_| "Sign-in is busy.")?;
        if account.current(generation) && token.is_some() && token == api::token()? {
            if let Some(rank) = serde_json::from_str::<serde_json::Value>(&reply.body).ok().and_then(|v| v["player"]["ranked"]["tier"]["name"].as_str().map(str::to_owned)) { let _ = state.presence.set_rank(&rank); } else { state.presence.clear(); }
        }
    }
    Ok(reply)
}
#[tauri::command]
fn open_external(window: WebviewWindow, app: tauri::AppHandle, url: String) -> Result<(), String> {
    local_window(&window)?;
    app.opener().open_url(api::external_url(&url)?.as_str(), None::<&str>).map_err(|_| "Could not open your browser.".into())
}
#[tauri::command]
async fn begin_sign_in(window: WebviewWindow, app: tauri::AppHandle, state: State<'_, Desktop>) -> Result<SignInInfo, String> {
    local_window(&window)?; let generation = state.account.lock().map_err(|_| "Sign-in is busy.")?.invalidate();
    let value = state.api.json("/api/desktop/start", json!({})).await?;
    let grant: Grant = serde_json::from_value(value).map_err(|_| "The website returned an invalid sign-in request.")?;
    let verification = api::external_url(&grant.verification_uri)?;
    if verification.host_str() != Some("rankedworld.com") || verification.path() != "/launcher/connect" || grant.expires_in > 600 || grant.interval < 1 || grant.interval > 30 { return Err("Invalid sign-in verification address.".into()); }
    let mut account = state.account.lock().map_err(|_| "Sign-in is busy.")?;
    if !account.current(generation) { return Err("This sign-in request was canceled.".into()); }
    app.opener().open_url(verification.as_str(), None::<&str>).map_err(|_| "Could not open your browser.")?;
    let info = SignInInfo { user_code: grant.user_code.clone(), verification_uri: grant.verification_uri.clone(), expires_in: grant.expires_in, interval: grant.interval };
    account.pending = Some((grant, game::now()));
    Ok(info)
}
#[tauri::command]
async fn poll_sign_in(window: WebviewWindow, state: State<'_, Desktop>) -> Result<String, String> {
    local_window(&window)?;
    let (generation, pending) = {
        let mut account = state.account.lock().map_err(|_| "Sign-in is busy.")?; let pending = account.pending.clone().ok_or("Start a new sign-in request.")?;
        if game::now().saturating_sub(pending.1) >= pending.0.expires_in * 1000 {
            account.invalidate(); return Ok("expired".into());
        }
        if account.polling { return Ok("pending".into()); }
        account.polling = true;
        (account.generation, pending)
    }; let response = state.api.json("/api/desktop/poll", json!({ "deviceCode": pending.0.device_code })).await;
    let stale_token = {
        let mut account = state.account.lock().map_err(|_| "Sign-in is busy.")?;
        if account.finish_poll(generation) {
            let response = response?; let status = response["status"].as_str().ok_or("Invalid sign-in response.")?;
            if status == "approved" {
                let token = response["token"].as_str().ok_or("Missing account session.")?;
                if token.len() < 32 || token.len() > 512 { return Err("Invalid account session.".into()); }
                api::save_token(token)?; account.invalidate();
            } else if status == "expired" { account.invalidate(); }
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
fn cancel_sign_in(window: WebviewWindow, state: State<Desktop>) -> Result<(), String> {
    local_window(&window)?; state.account.lock().map_err(|_| "Sign-in is busy.")?.invalidate();
    Ok(())
}
#[tauri::command]
async fn sign_out(window: WebviewWindow, state: State<'_, Desktop>) -> Result<(), String> {
    local_window(&window)?;
    let token = {
        let mut account = state.account.lock().map_err(|_| "Sign-in is busy.")?; account.invalidate(); let token = api::token()?; api::clear_token()?; state.presence.clear();
        token
    };
    // a signed out launcher can never send a spooled recording anywhere, so it does not keep one
    if let Ok(root) = configured_game(&state) { capture::wipe(&capture::spool_dir(&root)); }
    if let Some(token) = token { let _ = state.api.request("/api/desktop/logout", "POST", Some("{}".into()), Some(token)).await; }
    Ok(())
}
fn main() {
    tauri::Builder::default().plugin(tauri_plugin_opener::init()).plugin(tauri_plugin_updater::Builder::new().build()).manage(updates::Updates::default())
        .setup(|app| {
            let cfg_path = app.path().app_config_dir()?.join("settings.json");
            let mut settings: Settings = fs::read(&cfg_path).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
            if settings.game_path.is_none() { settings.game_path = game::discover_game(); }
            app.manage(Desktop { api: Api::new()?, presence: presence::Presence::new(Some("1526780247545221312"), Some("https://rankedworld.com/img/discord-presence.png"))?, settings: Mutex::new(settings), cfg_path, account: Mutex::new(Account::default()), pending_room: Mutex::new(None) });
            // The spool tender. The sweep half runs for everyone, signed in or not, switched on or
            // not, because the consent notice says the player's own copy does not sit there forever
            // and nothing else on the PC would delete it. The upload half does nothing at all until
            // the server has capture switched on: with it off the endpoint answers 204 and the pass
            // stops without touching a file.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    let (game, api) = {
                        let state = handle.state::<Desktop>();
                        let game = state.settings.lock().ok().and_then(|s| s.game_path.clone());
                        (game, state.api.clone())
                    };
                    if let Some(root) = game {
                        let spool = capture::spool_dir(&root);
                        capture::sweep(&spool, std::time::SystemTime::now());
                        if let Ok(Some(token)) = api::token() {
                            capture::drain(&spool, capture::DRAIN_BATCH, |item, body| {
                                let api = api.clone();
                                let token = token.clone();
                                async move { capture::put(&api, &token, &item, body).await }
                            }).await;
                        }
                    }
                    tokio::time::sleep(capture::DRAIN_EVERY).await;
                }
            });
            tauri::WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Ranked World").inner_size(1280.0, 840.0).min_inner_size(960.0, 640.0)
                .on_navigation(|url| url.scheme() == "tauri" || url.host_str() == Some("tauri.localhost") || (cfg!(debug_assertions) && [Some("localhost"), Some("127.0.0.1")].contains(&url.host_str()) && url.port() == Some(1420)))
                .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![cards::save_profile_card, updates::check_update, updates::install_update, desktop_status, set_game_path, detect_game, install_join_helper, launch_game, cancel_join, api_request, open_external, begin_sign_in, poll_sign_in, cancel_sign_in, sign_out])
        .build(tauri::generate_context!()).expect("Could not start Ranked World")
        .run(|app, event| { if matches!(event, tauri::RunEvent::Exit) { app.state::<Desktop>().presence.shutdown(); } });
}
