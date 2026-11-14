#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod sign_in; mod website; mod game; mod helper; mod join; mod updates; mod discord_presence; mod profile_card; mod device_ids;
use sign_in::SignIn;
use website::Website;
use game::Settings;
use join::PendingJoin;
use serde::Serialize;
use std::{fs, path::{Path, PathBuf}, sync::Mutex, time::{SystemTime, UNIX_EPOCH}};
use tauri::{Manager, WebviewUrl, WebviewWindow};
struct Launcher {
    api: Website,
    presence: discord_presence::Presence,
    settings: Mutex<Settings>,
    settings_path: PathBuf,
    account: Mutex<SignIn>,
    pending_join: Mutex<Option<PendingJoin>>,
}
fn is_launcher_page(url: &tauri::Url) -> bool {
    url.scheme() == "tauri" || url.host_str() == Some("tauri.localhost")
        || (cfg!(debug_assertions) && [Some("localhost"), Some("127.0.0.1")].contains(&url.host_str()) && url.port() == Some(1420))
}
fn require_launcher_window(window: &WebviewWindow) -> Result<(), String> {
    let url = window.url().map_err(|_| "Unavailable app window.")?;
    if window.label() != "main" || !is_launcher_page(&url) { return Err("Only the local launcher can perform this action.".into()); }
    Ok(())
}
pub fn now() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64 }
pub fn write_json(path: &Path, value: &impl Serialize) -> Result<(), String> {
    let parent = path.parent().ok_or("Invalid settings location.")?; fs::create_dir_all(parent).map_err(|_| "Could not create the settings folder.")?;
    let temporary = path.with_extension(format!("{}.tmp", uuid::Uuid::new_v4())); let data = serde_json::to_vec(value).map_err(|_| "Could not encode settings.")?;
    fs::write(&temporary, data).map_err(|_| "Could not write settings. Check folder permissions.")?;
    if fs::rename(&temporary, path).is_err() { let _ = fs::remove_file(&temporary); return Err("Could not save settings. Check folder permissions.".into()); }
    Ok(())
}
fn main() {
    tauri::Builder::default().plugin(tauri_plugin_opener::init()).plugin(tauri_plugin_updater::Builder::new().build()).manage(updates::UpdateLock::default())
        .setup(|app| {
            let settings_path = app.path().app_config_dir()?.join("settings.json");
            let mut settings: Settings = fs::read(&settings_path).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
            if settings.game_path.is_none() { settings.game_path = game::find_game(); }
            app.manage(Launcher { api: Website::new()?, presence: discord_presence::Presence::new(Some("1526780247545221312"), Some("https://rankedworld.com/img/discord-presence.png"))?, settings: Mutex::new(settings), settings_path, account: Mutex::new(SignIn::default()), pending_join: Mutex::new(None) });
            tauri::WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Ranked World").inner_size(1280.0, 840.0).min_inner_size(960.0, 640.0)
                .on_navigation(is_launcher_page)
                .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sign_in::begin_sign_in, sign_in::poll_sign_in, sign_in::cancel_sign_in, sign_in::sign_out,
            website::api_request, website::open_external,
            game::desktop_status, game::set_game_path, game::detect_game,
            helper::install_join_helper,
            join::launch_game, join::cancel_join, join::notify,
            updates::check_update, updates::install_update,
            profile_card::save_profile_card,
            device_ids::device_ids
        ])
        .build(tauri::generate_context!()).expect("Could not start Ranked World")
        .run(|app, event| { if matches!(event, tauri::RunEvent::Exit) { app.state::<Launcher>().presence.shutdown(); } });
}
