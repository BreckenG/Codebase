use crate::{game, Launcher};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{fs, path::{Path, PathBuf}};
use tauri::{Manager, State, WebviewWindow};
pub fn helper_path(game: &Path) -> PathBuf { game.join("BepInEx/plugins/RankedDeps/JoinHelper.dll") }
pub fn helper_folder(game: &Path) -> PathBuf { game.join("BepInEx/config/RankedWorld") }
pub fn same_contents(a: &Path, b: &Path) -> bool { match (fs::read(a), fs::read(b)) { (Ok(a), Ok(b)) => Sha256::digest(a) == Sha256::digest(b), _ => false } }
pub fn install_helper(game: &Path, source: &Path) -> Result<(), String> {
    let root = game.canonicalize().map_err(|_| "The game folder is unavailable.")?;
    let destination = helper_path(&root);
    let legacy = [root.join("BepInEx/plugins/RankedWorld.Join.dll"), root.join("BepInEx/plugins/JoinHelper.dll"), root.join("BepInEx/plugins/RankedDeps/RankedWorld.Join.dll")];
    let data = fs::read(source).map_err(|_| "The bundled Ranked helper is missing.")?;
    let receipt = helper_folder(&root).join("helper-installed.json");
    let installed_hash = fs::read(&receipt).ok().and_then(|bytes| serde_json::from_slice::<String>(&bytes).ok());
    for path in [&root.join("BepInEx"), &root.join("BepInEx/plugins"), destination.parent().unwrap()].into_iter().chain(std::iter::once(destination.as_path())).chain(legacy.iter().map(PathBuf::as_path)) {
        if path.exists() && !path.canonicalize().map_err(|_| "Could not inspect the helper folder.")?.starts_with(&root) {
            return Err("The helper folder points outside the selected game installation.".into());
        }
    }
    for path in std::iter::once(&destination).chain(legacy.iter()).filter(|p| p.exists()) {
        let existing = fs::read(path).map_err(|_| "Could not inspect an existing helper file.")?;
        let hash = format!("{:x}", Sha256::digest(&existing));
        if existing != data && hash != "1221d492da2820e1117a6403aa5951411db6ff6c7e142bc571788ea8e9aa7c15" && !(path == &destination && installed_hash.as_ref() == Some(&hash)) {
            return Err(format!("An unrecognized file occupies {}. Move it before installing the Ranked helper.", path.display()));
        }
    }
    fs::create_dir_all(destination.parent().unwrap()).map_err(|_| "Could not access the plugins folder.")?;
    let temporary = destination.with_extension(format!("{}.tmp", uuid::Uuid::new_v4()));
    fs::write(&temporary, &data).map_err(|_| "Could not write the Ranked helper. Check game folder permissions.")?;
    if fs::rename(&temporary, &destination).is_err() {
        let _ = fs::remove_file(&temporary); return Err("Could not install the Ranked helper. Close Gorilla Tag and try again.".into());
    }
    if !same_contents(source, &destination) { return Err("The installed helper failed verification.".into()); }
    super::write_json(&receipt, &format!("{:x}", Sha256::digest(&data)))?;
    for path in legacy.iter().filter(|p| p.exists()) {
        fs::remove_file(path).map_err(|_| "The Ranked helper installed, but an old helper could not be removed. Close the game and install again before restarting it.")?;
    }
    Ok(())
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HelperHeartbeat { version: u8, process_id: u32, updated_at: u64 }
impl HelperHeartbeat {
    fn matches(&self, process_id: u32, at: u64) -> bool {
        self.version == 1 && self.process_id == process_id && self.updated_at <= at && at - self.updated_at <= 5000
    }
}
pub fn helper_loaded(game: &Path) -> bool {
    let path = helper_folder(game).join("helper-live.json");
    if !fs::metadata(&path).is_ok_and(|m| m.len() <= 1024) { return false; }
    let Some(live) = fs::read(path).ok().and_then(|b| serde_json::from_slice::<HelperHeartbeat>(&b).ok()) else { return false; };
    let processes = game::running_processes();
    processes.processes().iter().any(|(pid, p)| game::is_gorilla_tag(p) && live.matches(pid.as_u32(), super::now()))
}
pub fn require_helper_ready(game: &Path, source: &Path, running: bool) -> Result<(), String> {
    if running && (!same_contents(&helper_path(game), source) || !helper_loaded(game)) {
        return Err("Restart required. Close Gorilla Tag, install the Ranked helper if needed, then start the game again to join a code.".into());
    }
    if !same_contents(&helper_path(game), source) { return Err("Install the Ranked helper before joining a code.".into()); }
    Ok(())
}
pub fn bundled_helper_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().resolve("resources/JoinHelper.dll", tauri::path::BaseDirectory::Resource).map_err(|_| "The Ranked helper is missing from this launcher.".into())
}
#[tauri::command]
pub fn install_join_helper(window: WebviewWindow, app: tauri::AppHandle, state: State<Launcher>) -> Result<(), String> {
    super::require_launcher_window(&window)?;
    if game::game_running() { return Err("Close Gorilla Tag before installing or updating the Ranked helper.".into()); }
    let game = game::game_folder(&state)?;
    if !game.join("BepInEx/core/BepInEx.dll").is_file() { return Err("Install BepInEx for Gorilla Tag before installing the Ranked helper.".into()); }
    install_helper(&game, &bundled_helper_path(&app)?)
}
