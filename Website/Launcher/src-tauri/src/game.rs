use crate::{helper, join::{self, JoinStatus}, sign_in, Launcher};
use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}};
use tauri::{State, WebviewWindow};
pub const APP_ID: &str = "1533390";
#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings { pub game_path: Option<PathBuf> }
pub fn vdf_strings(text: &str) -> Vec<String> {
    let mut fields = Vec::new(); let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        if c != '"' { continue; }
        let mut field = String::new();
        while let Some(c) = chars.next() {
            if c == '"' { break; }
            if c == '\\' && matches!(chars.peek(), Some('\\' | '"')) {
                field.push(chars.next().unwrap());
            } else { field.push(c); }
        }
        fields.push(field);
    }
    fields
}
pub fn steam_install_folder_name(text: &str) -> Option<String> {
    let fields = vdf_strings(text); let id = fields.windows(2).find(|p| p[0] == "appid")?.get(1)?;
    if id != APP_ID { return None; }
    let dir = fields.windows(2).find(|p| p[0] == "installdir")?.get(1)?.clone();
    if dir.is_empty() || dir.contains(['/', '\\']) || dir == "." || dir == ".." { return None; }
    Some(dir)
}
pub fn check_game_folder(path: &Path) -> Result<PathBuf, String> {
    let root = path.canonicalize().map_err(|_| "That game folder does not exist.")?;
    if !root.join("Gorilla Tag.exe").is_file() || !root.join("Gorilla Tag_Data").is_dir() { return Err("Select the Gorilla Tag game folder from your Steam library.".into()); }
    let common = root.parent().ok_or("Invalid Steam game folder.")?; let steamapps = common.parent().ok_or("Invalid Steam library.")?;
    if common.file_name().and_then(|v| v.to_str()) != Some("common") { return Err("This version supports Steam installations.".into()); }
    let manifest = fs::read_to_string(steamapps.join(format!("appmanifest_{APP_ID}.acf"))).map_err(|_| "Steam's Gorilla Tag installation manifest is missing.")?;
    let dir = steam_install_folder_name(&manifest).ok_or("Steam's Gorilla Tag manifest is invalid.")?;
    if common.join(dir).canonicalize().ok().as_ref() != Some(&root) { return Err("That folder does not match Steam's installed game.".into()); }
    Ok(root)
}
pub fn steam_folders() -> Vec<PathBuf> {
    let mut roots = Vec::new();
    #[cfg(windows)] {
        use winreg::{enums::HKEY_CURRENT_USER, RegKey};
        if let Ok(key) = RegKey::predef(HKEY_CURRENT_USER).open_subkey("Software\\Valve\\Steam") {
            if let Ok(value) = key.get_value::<String, _>("SteamPath") { roots.push(PathBuf::from(value)); }
        }
    }
    if let Some(programs) = std::env::var_os("ProgramFiles(x86)") { roots.push(PathBuf::from(programs).join("Steam")); }
    roots.sort(); roots.dedup(); roots
}
pub fn find_game() -> Option<PathBuf> {
    let roots = steam_folders(); let mut libraries = roots.clone();
    for root in roots {
        if let Ok(text) = fs::read_to_string(root.join("steamapps/libraryfolders.vdf")) {
            let fields = vdf_strings(&text);
            for pair in fields.windows(2) { if pair[0] == "path" { libraries.push(PathBuf::from(&pair[1])); } }
        }
    }
    for library in libraries {
        let apps = library.join("steamapps");
        if let Ok(manifest) = fs::read_to_string(apps.join(format!("appmanifest_{APP_ID}.acf"))) {
            if let Some(dir) = steam_install_folder_name(&manifest) { if let Ok(path) = check_game_folder(&apps.join("common").join(dir)) { return Some(path); } }
        }
    }
    None
}
pub fn game_running() -> bool {
    running_processes().processes().values().any(is_gorilla_tag)
}
pub fn running_processes() -> sysinfo::System { sysinfo::System::new_with_specifics(sysinfo::RefreshKind::nothing().with_processes(sysinfo::ProcessRefreshKind::nothing())) }
pub fn is_gorilla_tag(process: &sysinfo::Process) -> bool { process.name().to_string_lossy().eq_ignore_ascii_case("Gorilla Tag.exe") }
pub fn game_folder(state: &Launcher) -> Result<PathBuf, String> {
    let path = state.settings.lock().map_err(|_| "Game settings are busy.")?.game_path.clone().ok_or("Choose your Gorilla Tag installation in Game settings.")?;
    check_game_folder(&path)
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherStatus {
    game_path: Option<String>,
    game_installed: bool,
    bep_in_ex_installed: bool,
    helper_installed: bool,
    helper_loaded: bool,
    game_running: bool,
    signed_in: bool,
    join: Option<JoinStatus>,
    version: String,
}
#[tauri::command]
pub fn desktop_status(window: WebviewWindow, app: tauri::AppHandle, state: State<Launcher>) -> Result<LauncherStatus, String> {
    super::require_launcher_window(&window)?; let mut pending = state.pending_join.lock().map_err(|_| "Launch status is busy.")?; let game = game_folder(&state).ok();
    if let Some(join) = pending.as_mut() {
        if join.update(game.as_ref().and_then(|root| join::read_join_status(root)), super::now()) {
            if let Some(root) = &game { let _ = fs::remove_file(helper::helper_folder(root).join("launch.json")); }
        }
    }
    let helper = helper::bundled_helper_path(&app)?;
    Ok(LauncherStatus {
        game_path: game.as_ref().map(|p| p.to_string_lossy().strip_prefix(r"\\?\").unwrap_or(&p.to_string_lossy()).to_string()),
        game_installed: game.is_some(),
        bep_in_ex_installed: game.as_ref().is_some_and(|p| p.join("BepInEx/core/BepInEx.dll").is_file()),
        helper_installed: game.as_ref().is_some_and(|p| helper::same_contents(&helper::helper_path(p), &helper)),
        helper_loaded: game.as_ref().is_some_and(|p| helper::helper_loaded(p)),
        game_running: game_running(), signed_in: sign_in::saved_token().ok().flatten().is_some(),
        join: pending.as_ref().map(|p| p.status.clone()), version: app.package_info().version.to_string(),
    })
}
#[tauri::command]
pub fn set_game_path(window: WebviewWindow, path: String, state: State<Launcher>) -> Result<(), String> {
    super::require_launcher_window(&window)?; let pending = state.pending_join.lock().map_err(|_| "Launch status is busy.")?;
    if join::join_active(&pending) { return Err("Cancel the pending join before changing the game folder.".into()); }
    let path = check_game_folder(&PathBuf::from(path))?; let settings = Settings { game_path: Some(path) }; super::write_json(&state.settings_path, &settings)?;
    *state.settings.lock().map_err(|_| "Game settings are busy.")? = settings;
    Ok(())
}
#[tauri::command]
pub fn detect_game(window: WebviewWindow, state: State<Launcher>) -> Result<(), String> {
    super::require_launcher_window(&window)?; let pending = state.pending_join.lock().map_err(|_| "Launch status is busy.")?;
    if join::join_active(&pending) { return Err("Cancel the pending join before changing the game folder.".into()); }
    let path = find_game().ok_or("Gorilla Tag was not found in your Steam libraries. Choose its folder below.")?;
    let settings = Settings { game_path: Some(path) }; super::write_json(&state.settings_path, &settings)?;
    *state.settings.lock().map_err(|_| "Game settings are busy.")? = settings;
    Ok(())
}
