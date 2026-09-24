use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}, time::{SystemTime, UNIX_EPOCH}};
use sha2::{Digest, Sha256}; pub const APP_ID: &str = "1533390";
#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings { pub game_path: Option<PathBuf> }
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
pub fn now() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64 }
pub fn normalize_code(code: &str) -> Result<String, String> {
    let code = code.trim().to_ascii_uppercase();
    if code.is_empty() || code.len() > 12 || !code.bytes().all(|c| c.is_ascii_alphanumeric()) { return Err("Use a room code with 1 to 12 letters or numbers.".into()); }
    Ok(code)
}
pub fn quoted_fields(text: &str) -> Vec<String> {
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
pub fn manifest_install_dir(text: &str) -> Option<String> {
    let fields = quoted_fields(text); let id = fields.windows(2).find(|p| p[0] == "appid")?.get(1)?;
    if id != APP_ID { return None; }
    let dir = fields.windows(2).find(|p| p[0] == "installdir")?.get(1)?.clone();
    if dir.is_empty() || dir.contains(['/', '\\']) || dir == "." || dir == ".." { return None; }
    Some(dir)
}
pub fn validate_game(path: &Path) -> Result<PathBuf, String> {
    let root = path.canonicalize().map_err(|_| "That game folder does not exist.")?;
    if !root.join("Gorilla Tag.exe").is_file() || !root.join("Gorilla Tag_Data").is_dir() { return Err("Select the Gorilla Tag game folder from your Steam library.".into()); }
    let common = root.parent().ok_or("Invalid Steam game folder.")?; let steamapps = common.parent().ok_or("Invalid Steam library.")?;
    if common.file_name().and_then(|v| v.to_str()) != Some("common") { return Err("This version supports Steam installations.".into()); }
    let manifest = fs::read_to_string(steamapps.join(format!("appmanifest_{APP_ID}.acf"))).map_err(|_| "Steam's Gorilla Tag installation manifest is missing.")?;
    let dir = manifest_install_dir(&manifest).ok_or("Steam's Gorilla Tag manifest is invalid.")?;
    if common.join(dir).canonicalize().ok().as_ref() != Some(&root) { return Err("That folder does not match Steam's installed game.".into()); }
    Ok(root)
}
pub fn steam_roots() -> Vec<PathBuf> {
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
pub fn discover_game() -> Option<PathBuf> {
    let roots = steam_roots(); let mut libraries = roots.clone();
    for root in roots {
        if let Ok(text) = fs::read_to_string(root.join("steamapps/libraryfolders.vdf")) {
            let fields = quoted_fields(&text);
            for pair in fields.windows(2) { if pair[0] == "path" { libraries.push(PathBuf::from(&pair[1])); } }
        }
    }
    for library in libraries {
        let apps = library.join("steamapps");
        if let Ok(manifest) = fs::read_to_string(apps.join(format!("appmanifest_{APP_ID}.acf"))) {
            if let Some(dir) = manifest_install_dir(&manifest) { if let Ok(path) = validate_game(&apps.join("common").join(dir)) { return Some(path); } }
        }
    }
    None
}
pub fn helper_path(game: &Path) -> PathBuf { game.join("BepInEx/plugins/RankedDeps/JoinHelper.dll") }
pub fn ticket_dir(game: &Path) -> PathBuf { game.join("BepInEx/config/RankedWorld") }
pub fn same_file(a: &Path, b: &Path) -> bool { match (fs::read(a), fs::read(b)) { (Ok(a), Ok(b)) => Sha256::digest(a) == Sha256::digest(b), _ => false } }
pub fn install_helper(game: &Path, source: &Path) -> Result<(), String> {
    let root = game.canonicalize().map_err(|_| "The game folder is unavailable.")?;
    let destination = helper_path(&root);
    let legacy = [root.join("BepInEx/plugins/RankedWorld.Join.dll"), root.join("BepInEx/plugins/JoinHelper.dll"), root.join("BepInEx/plugins/RankedDeps/RankedWorld.Join.dll")];
    let data = fs::read(source).map_err(|_| "The bundled join helper is missing.")?;
    let receipt = ticket_dir(&root).join("helper-installed.json");
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
            return Err(format!("An unrecognized file occupies {}. Move it before installing JoinHelper.", path.display()));
        }
    }
    fs::create_dir_all(destination.parent().unwrap()).map_err(|_| "Could not access the plugins folder.")?;
    let temporary = destination.with_extension(format!("{}.tmp", uuid::Uuid::new_v4()));
    fs::write(&temporary, &data).map_err(|_| "Could not write JoinHelper. Check game folder permissions.")?;
    if let Err(_) = fs::rename(&temporary, &destination) {
        let _ = fs::remove_file(&temporary); return Err("Could not install JoinHelper. Close Gorilla Tag and try again.".into());
    }
    if !same_file(source, &destination) { return Err("The installed helper failed verification.".into()); }
    write_json(&receipt, &format!("{:x}", Sha256::digest(&data)))?;
    for path in legacy.iter().filter(|p| p.exists()) {
        fs::remove_file(path).map_err(|_| "JoinHelper installed, but an old helper could not be removed. Close the game and install again before restarting it.")?;
    }
    Ok(())
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HelperLive { version: u8, process_id: u32, updated_at: u64 }
impl HelperLive {
    fn matches(&self, process_id: u32, at: u64) -> bool {
        self.version == 1 && self.process_id == process_id && self.updated_at <= at && at - self.updated_at <= 5000
    }
}
pub fn helper_loaded(game: &Path) -> bool {
    let path = ticket_dir(game).join("helper-live.json");
    if !fs::metadata(&path).is_ok_and(|m| m.len() <= 1024) { return false; }
    let Some(live) = fs::read(path).ok().and_then(|b| serde_json::from_slice::<HelperLive>(&b).ok()) else { return false; };
    let processes = game_processes();
    processes.processes().iter().any(|(pid, p)| is_game(p) && live.matches(pid.as_u32(), now()))
}
pub fn check_join_helper(game: &Path, source: &Path, running: bool) -> Result<(), String> {
    if running && (!same_file(&helper_path(game), source) || !helper_loaded(game)) {
        return Err("Restart required. Close Gorilla Tag, install JoinHelper if needed, then start the game again to join a code.".into());
    }
    if !same_file(&helper_path(game), source) { return Err("Install JoinHelper before joining a code.".into()); }
    Ok(())
}
pub fn write_json(path: &Path, value: &impl Serialize) -> Result<(), String> {
    let parent = path.parent().ok_or("Invalid settings location.")?; fs::create_dir_all(parent).map_err(|_| "Could not create the settings folder.")?;
    let temporary = path.with_extension(format!("{}.tmp", uuid::Uuid::new_v4())); let data = serde_json::to_vec(value).map_err(|_| "Could not encode settings.")?;
    fs::write(&temporary, data).map_err(|_| "Could not write settings. Check folder permissions.")?;
    if let Err(_) = fs::rename(&temporary, path) { let _ = fs::remove_file(&temporary); return Err("Could not save settings. Check folder permissions.".into()); }
    Ok(())
}
pub fn read_status(game: &Path) -> Option<JoinStatus> {
    let p = ticket_dir(game).join("launch-status.json");
    if fs::metadata(&p).ok()?.len() > 8192 { return None; }
    let status: JoinStatus = serde_json::from_slice(&fs::read(p).ok()?).ok()?;
    if status.version != 1 || uuid::Uuid::parse_str(&status.request_id).is_err() || normalize_code(&status.code).is_err() || !["waiting", "joining", "joined", "failed"].contains(&status.state.as_str()) || status.updated_at > now() + 5000 || now().saturating_sub(status.updated_at) > 600_000 { return None; }
    Some(status)
}
pub fn game_running() -> bool {
    game_processes().processes().values().any(is_game)
}
fn game_processes() -> sysinfo::System { sysinfo::System::new_with_specifics(sysinfo::RefreshKind::nothing().with_processes(sysinfo::ProcessRefreshKind::nothing())) }
fn is_game(process: &sysinfo::Process) -> bool { process.name().to_string_lossy().eq_ignore_ascii_case("Gorilla Tag.exe") }
