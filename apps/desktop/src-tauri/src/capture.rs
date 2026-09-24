// Training capture for TOP codes. Only `recording` is wired into main.rs, so the launcher can show
// an honest marker the moment the game plugin ever records. The grant courier below is compiled but
// dead: nothing fetches a grant, so this launcher asks the website for nothing and writes no
// permission anywhere. Turning capture on is a separate decision and a spawned refresh task.
//
// Everything here is a courier. The server decides whether a grant exists at all, and the game side
// refuses anything that is not a current signature for this account, so a broken or stale file here
// can only ever stop a recording, never start one.
#![allow(dead_code)]
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

pub const GRANT_PATH: &str = "capture-grant.cfg";
pub const STATUS_PATH: &str = "capture-status.cfg";
pub const REFRESH: Duration = Duration::from_secs(30);
/// The plugin rewrites the status file every second while it records, so anything older than this
/// is a crashed game or a stale file and the marker comes down.
pub const STALE: Duration = Duration::from_secs(5);
const MAX_GRANT: usize = 4096;

/// Assets/capture.cjs is the one source for these, and Manager/test/captureIngest.test.js reads
/// this file and fails if a number here stops matching it. Rust cannot require() a .cjs.
pub const LOCAL_DAYS: u64 = 7;
pub const MAX_CHUNK: usize = 2097152;
/// how many chunks one drain pass will send before yielding, so a week of backlog does not pin the
/// launcher or trip the rate limit
pub const DRAIN_BATCH: usize = 200;
pub const SPOOL: &str = "BepInEx/RankedWorld/capture-spool";
pub const DRAIN_EVERY: Duration = Duration::from_secs(60);

fn grant_file(ticket_dir: &Path) -> PathBuf { ticket_dir.join(GRANT_PATH) }

/// Every line has to be one of the nine keys the plugin parses, on one line, printable ASCII.
/// The launcher never edits a grant, it only refuses to write one it does not recognise.
pub fn looks_like_grant(body: &str) -> bool {
    if body.len() > MAX_GRANT || body.is_empty() { return false; }
    let keys = ["v", "consent", "scope", "at", "exp", "since", "nonce", "idcheck", "sig"];
    let mut seen = 0u16;
    for line in body.lines() {
        let Some((key, value)) = line.split_once('=') else { return false; };
        let Some(index) = keys.iter().position(|k| *k == key) else { return false; };
        if seen & (1 << index) != 0 { return false; }
        seen |= 1 << index;
        if value.is_empty() || !value.bytes().all(|b| (0x21..=0x7e).contains(&b)) { return false; }
    }
    seen == 0x1ff
}

pub fn write_grant(ticket_dir: &Path, body: &str) -> Result<(), String> {
    if !looks_like_grant(body) { return clear_grant(ticket_dir); }
    fs::create_dir_all(ticket_dir).map_err(|_| "Could not access the Gorilla Tag configuration folder.")?;
    let destination = grant_file(ticket_dir);
    let temporary = destination.with_extension(format!("{}.tmp", uuid::Uuid::new_v4()));
    fs::write(&temporary, body).map_err(|_| "Could not write the recording permission.")?;
    if fs::rename(&temporary, &destination).is_err() {
        let _ = fs::remove_file(&temporary);
        return Err("Could not write the recording permission.".into());
    }
    Ok(())
}

/// Called on 204, on any error, on sign-out, on withdrawal and on launcher exit. The plugin also
/// stops on its own once the grant expires, so the worst case after a crash is two minutes.
pub fn clear_grant(ticket_dir: &Path) -> Result<(), String> {
    match fs::remove_file(grant_file(ticket_dir)) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err("Could not remove the recording permission.".into()),
    }
}

/// What the plugin says it is actually doing, so the launcher shows a marker for real recording
/// rather than for permission to record. Anything unreadable or stale counts as not recording.
pub fn recording(ticket_dir: &Path) -> bool { recording_at(ticket_dir, SystemTime::now()) }

fn recording_at(ticket_dir: &Path, now: SystemTime) -> bool {
    let path = ticket_dir.join(STATUS_PATH);
    let Ok(meta) = fs::metadata(&path) else { return false; };
    if meta.len() > 64 { return false; }
    // a file stamped in the future is a clock, not a stale marker, so it still counts
    if !meta.modified().map(|at| now.duration_since(at).map(|age| age <= STALE).unwrap_or(true)).unwrap_or(false) { return false; }
    fs::read_to_string(path).map(|s| s.trim() == "recording=1").unwrap_or(false)
}

/// One refresh. `fetch` is the desktop-bearer GET of /api/me/capture-grant: Some(body) on 200,
/// None on 204 or 403. An Err leaves the previous grant to expire rather than extending it.
pub async fn refresh_once<F, Fut>(ticket_dir: &Path, fetch: F) -> Result<bool, String>
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<Option<String>, String>>,
{
    match fetch().await {
        Ok(Some(body)) => { write_grant(ticket_dir, &body)?; Ok(true) }
        Ok(None) => { clear_grant(ticket_dir)?; Ok(false) }
        Err(error) => { let _ = clear_grant(ticket_dir); Err(error) }
    }
}

// ---- the spool ----
//
// The plugin writes finished chunks to <game>/BepInEx/RankedWorld/capture-spool as
// <session>.<seq>.gtrc, and only ever renames a chunk into place once it is complete. The launcher
// is the only thing that sends one anywhere, because it is the only half that holds an account: the
// plugin never touches the network and never learns who the player is.
//
// Two jobs here, and the sweep runs whether or not anything is signed in or switched on, because
// the consent copy promises the player's own copy does not live forever.

pub fn spool_dir(game: &Path) -> PathBuf { game.join(SPOOL) }

/// `<32 hex>.<seq>.gtrc` and nothing else. Anything we cannot name is left alone by the uploader
/// and swept on age like any other file in the folder.
pub fn chunk_name(name: &str) -> Option<(String, u32)> {
    let rest = name.strip_suffix(".gtrc")?;
    let (session, seq) = rest.split_once('.')?;
    if session.len() != 32 || !session.bytes().all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase()) { return None; }
    if seq.is_empty() || seq.len() > 7 || !seq.bytes().all(|b| b.is_ascii_digit()) { return None; }
    Some((session.to_owned(), seq.parse().ok()?))
}

#[derive(Debug, Clone)]
pub struct Ready {
    pub path: PathBuf,
    pub session: String,
    pub seq: u32,
    pub recorded_ms: u64,
}

fn ms(at: SystemTime) -> u64 { at.duration_since(SystemTime::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0) }

/// Finished chunks, oldest first, so a session goes up roughly in the order it was played.
pub fn ready(spool: &Path) -> Vec<Ready> {
    let Ok(entries) = fs::read_dir(spool) else { return Vec::new(); };
    let mut out = Vec::new();
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        let Some((session, seq)) = chunk_name(&name) else { continue; };
        let Ok(meta) = entry.metadata() else { continue; };
        if !meta.is_file() || meta.len() == 0 || meta.len() as usize > MAX_CHUNK { continue; }
        out.push(Ready { path: entry.path(), session, seq, recorded_ms: meta.modified().map(ms).unwrap_or(0) });
    }
    out.sort_by(|a, b| a.recorded_ms.cmp(&b.recorded_ms).then(a.session.cmp(&b.session)).then(a.seq.cmp(&b.seq)));
    out
}

/// Deletes everything in the spool older than LOCAL_DAYS, uploaded or not, and returns how many
/// went. This is the whole of "your own copy does not sit there forever": it runs on a timer in the
/// launcher and the plugin does the same sweep when the game starts.
pub fn sweep(spool: &Path, now: SystemTime) -> usize {
    let Ok(entries) = fs::read_dir(spool) else { return 0; };
    let cutoff = Duration::from_secs(LOCAL_DAYS * 86400);
    let mut gone = 0;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".gtrc") && !name.ends_with(".gtrc.tmp") { continue; }
        let Ok(meta) = entry.metadata() else { continue; };
        let old = meta.modified().map(|at| now.duration_since(at).map(|age| age > cutoff).unwrap_or(false)).unwrap_or(false);
        if old && fs::remove_file(entry.path()).is_ok() { gone += 1; }
    }
    gone
}

/// Everything the player's PC holds, gone. Called on a withdrawal and on sign-out.
pub fn wipe(spool: &Path) -> usize {
    let Ok(entries) = fs::read_dir(spool) else { return 0; };
    let mut gone = 0;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".gtrc") && !name.ends_with(".gtrc.tmp") { continue; }
        if fs::remove_file(entry.path()).is_ok() { gone += 1; }
    }
    gone
}

#[derive(Debug, PartialEq)]
pub enum Sent { Stored, Dropped, Stop, Withdrawn }

/// What a status code means for the file we just sent. The server is the only thing that decides
/// whether a recording is wanted; the launcher only decides what to do with the copy on disk.
pub fn verdict(status: u16) -> Sent {
    match status {
        200 | 201 => Sent::Stored,
        // withdrawn, unlinked, or a session belonging to someone else. None of it is ever going to
        // be accepted and a withdrawal has to take the local copy with it.
        403 => Sent::Withdrawn,
        // this chunk will never be accepted: wrong shape, too big, older than the local window, or a
        // session whose index row never landed. Dropping it is the only way the queue ever moves.
        400 | 409 | 410 | 413 | 422 => Sent::Dropped,
        // 204 is capture switched off, 401 is signed out, 429 is the rate limit, 5xx is a bad day
        _ => Sent::Stop,
    }
}

#[derive(Debug, Default, PartialEq)]
pub struct Drained { pub sent: u32, pub dropped: u32, pub stopped: bool, pub withdrawn: bool }

/// One pass. `send` is the PUT; returning Err stops the pass and leaves the file where it is, so a
/// dropped connection costs nothing but a retry. Nothing is ever deleted before the server says it
/// has it or says it will never take it.
pub async fn drain<F, Fut>(spool: &Path, limit: usize, send: F) -> Drained
where
    F: Fn(Ready, Vec<u8>) -> Fut,
    Fut: std::future::Future<Output = Result<u16, String>>,
{
    let mut report = Drained::default();
    for item in ready(spool).into_iter().take(limit) {
        let Ok(body) = fs::read(&item.path) else { continue; };
        if body.is_empty() || body.len() > MAX_CHUNK { let _ = fs::remove_file(&item.path); report.dropped += 1; continue; }
        let path = item.path.clone();
        match send(item, body).await {
            Ok(status) => match verdict(status) {
                Sent::Stored => { if fs::remove_file(&path).is_ok() { report.sent += 1; } }
                Sent::Dropped => { if fs::remove_file(&path).is_ok() { report.dropped += 1; } }
                Sent::Withdrawn => { report.withdrawn = true; report.stopped = true; wipe(spool); return report; }
                Sent::Stop => { report.stopped = true; return report; }
            },
            Err(_) => { report.stopped = true; return report; }
        }
    }
    report
}

/// The PUT itself. One finished chunk, the desktop bearer, and the file's own timestamp so the
/// server can date the deletion from the recording rather than from receipt when that is older.
pub async fn put(api: &crate::api::Api, token: &str, item: &Ready, body: Vec<u8>) -> Result<u16, String> {
    let url = crate::api::api_url(&format!("/api/me/capture/{}/{}", item.session, item.seq))?;
    let response = api.client.put(url)
        .timeout(Duration::from_secs(60))
        .header("Origin", crate::api::ORIGIN)
        .header("Accept", "application/json")
        .header("Content-Type", "application/octet-stream")
        .header("X-Capture-Recorded-At", item.recorded_ms.to_string())
        .bearer_auth(token)
        .body(body)
        .send().await.map_err(|_| "Could not reach Ranked World.".to_string())?;
    Ok(response.status().as_u16())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body() -> String {
        ["v=1", "consent=1", "scope=ranked_top", "at=1000000", "exp=1120000", "since=940000",
         "nonce=0f1e2d3c4b5a69788796a5b4c3d2e1f0",
         "idcheck=0000000000000000000000000000000000000000000000000000000000000000",
         "sig=QUJD"].join("\n")
    }

    #[test]
    fn accepts_a_full_grant() { assert!(looks_like_grant(&body())); }

    #[test]
    fn refuses_a_missing_key() {
        // this borrowed a temporary and never built, because nothing compiled this file until now
        let full = body();
        let mut lines: Vec<&str> = full.lines().collect();
        lines.pop();
        assert!(!looks_like_grant(&lines.join("\n")));
    }

    #[test]
    fn refuses_an_unknown_key() {
        assert!(!looks_like_grant(&(body() + "\nspool=D:/somewhere")));
    }

    #[test]
    fn refuses_a_duplicate_key() {
        assert!(!looks_like_grant(&(body() + "\nexp=9999999999999")));
    }

    #[test]
    fn refuses_junk() {
        assert!(!looks_like_grant(""));
        assert!(!looks_like_grant("hello"));
        assert!(!looks_like_grant(&"v=1\n".repeat(5000)));
    }

    fn scratch() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("rw-capture-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn marker_follows_the_plugin() {
        let dir = scratch();
        assert!(!recording(&dir));
        fs::write(dir.join(STATUS_PATH), "recording=0\n").unwrap();
        assert!(!recording(&dir));
        fs::write(dir.join(STATUS_PATH), "recording=1\n").unwrap();
        assert!(recording(&dir));
        fs::remove_file(dir.join(STATUS_PATH)).unwrap();
        assert!(!recording(&dir));
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn a_stale_marker_comes_down() {
        let dir = scratch();
        fs::write(dir.join(STATUS_PATH), "recording=1\n").unwrap();
        assert!(recording_at(&dir, SystemTime::now()));
        assert!(!recording_at(&dir, SystemTime::now() + STALE + Duration::from_secs(1)));
        fs::remove_dir_all(&dir).ok();
    }
    fn spool() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("rw-spool-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write(dir: &Path, name: &str, bytes: usize, age: Duration) {
        let path = dir.join(name);
        fs::write(&path, vec![7u8; bytes]).unwrap();
        let handle = fs::File::options().write(true).open(&path).unwrap();
        handle.set_modified(SystemTime::now() - age).unwrap();
    }

    const S1: &str = "4b6304f69562e168ff4199ea1fb201b0";
    const S2: &str = "0123456789abcdef0123456789abcdef";

    #[test]
    fn only_a_finished_chunk_has_a_name_we_know() {
        assert_eq!(chunk_name(&format!("{S1}.0.gtrc")), Some((S1.to_string(), 0)));
        assert_eq!(chunk_name(&format!("{S1}.417.gtrc")), Some((S1.to_string(), 417)));
        assert_eq!(chunk_name(&format!("{S1}.0.gtrc.tmp")), None);
        assert_eq!(chunk_name(&format!("{}.0.gtrc", S1.to_uppercase())), None);
        assert_eq!(chunk_name(&format!("{S1}..gtrc")), None);
        assert_eq!(chunk_name("notasession.0.gtrc"), None);
        assert_eq!(chunk_name(&format!("{S1}.0.json")), None);
        assert_eq!(chunk_name("../../../etc/passwd.0.gtrc"), None);
    }

    #[test]
    fn half_written_chunks_are_never_offered() {
        let dir = spool();
        write(&dir, &format!("{S1}.0.gtrc"), 900, Duration::from_secs(60));
        write(&dir, &format!("{S1}.1.gtrc.tmp"), 900, Duration::from_secs(30));
        write(&dir, "capture-status.cfg", 12, Duration::from_secs(1));
        let list = ready(&dir);
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].seq, 0);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn the_oldest_chunk_goes_first() {
        let dir = spool();
        write(&dir, &format!("{S2}.0.gtrc"), 100, Duration::from_secs(3600));
        write(&dir, &format!("{S1}.1.gtrc"), 100, Duration::from_secs(60));
        write(&dir, &format!("{S1}.0.gtrc"), 100, Duration::from_secs(120));
        let list = ready(&dir);
        assert_eq!(list.iter().map(|r| (r.session.as_str(), r.seq)).collect::<Vec<_>>(),
                   vec![(S2, 0), (S1, 0), (S1, 1)]);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn the_local_copy_does_not_live_forever() {
        let dir = spool();
        write(&dir, &format!("{S1}.0.gtrc"), 100, Duration::from_secs((LOCAL_DAYS + 1) * 86400));
        write(&dir, &format!("{S1}.1.gtrc.tmp"), 100, Duration::from_secs((LOCAL_DAYS + 1) * 86400));
        write(&dir, &format!("{S1}.2.gtrc"), 100, Duration::from_secs(3600));
        write(&dir, "settings.json", 10, Duration::from_secs(400 * 86400));
        assert_eq!(sweep(&dir, SystemTime::now()), 2);
        assert!(!dir.join(format!("{S1}.0.gtrc")).exists());
        assert!(dir.join(format!("{S1}.2.gtrc")).exists());
        assert!(dir.join("settings.json").exists());
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn the_sweep_runs_on_a_folder_that_is_not_there() {
        assert_eq!(sweep(&std::env::temp_dir().join("rw-spool-missing"), SystemTime::now()), 0);
        assert!(ready(&std::env::temp_dir().join("rw-spool-missing")).is_empty());
    }

    #[tokio::test]
    async fn an_accepted_chunk_leaves_the_players_pc() {
        let dir = spool();
        write(&dir, &format!("{S1}.0.gtrc"), 500, Duration::from_secs(60));
        write(&dir, &format!("{S1}.1.gtrc"), 500, Duration::from_secs(30));
        let report = drain(&dir, DRAIN_BATCH, |_, _| async { Ok(200) }).await;
        assert_eq!(report, Drained { sent: 2, dropped: 0, stopped: false, withdrawn: false });
        assert!(ready(&dir).is_empty());
        fs::remove_dir_all(&dir).ok();
    }

    #[tokio::test]
    async fn nothing_is_deleted_when_the_upload_did_not_land() {
        let dir = spool();
        write(&dir, &format!("{S1}.0.gtrc"), 500, Duration::from_secs(60));
        let offline = drain(&dir, DRAIN_BATCH, |_, _| async { Err("no network".to_string()) }).await;
        assert!(offline.stopped && offline.sent == 0);
        assert_eq!(ready(&dir).len(), 1);
        let busy = drain(&dir, DRAIN_BATCH, |_, _| async { Ok(429) }).await;
        assert!(busy.stopped && busy.sent == 0);
        assert_eq!(ready(&dir).len(), 1);
        let off = drain(&dir, DRAIN_BATCH, |_, _| async { Ok(204) }).await;
        assert!(off.stopped && off.sent == 0);
        assert_eq!(ready(&dir).len(), 1);
        fs::remove_dir_all(&dir).ok();
    }

    #[tokio::test]
    async fn a_withdrawal_empties_the_spool_and_stops() {
        let dir = spool();
        for seq in 0..5 { write(&dir, &format!("{S1}.{seq}.gtrc"), 500, Duration::from_secs(600 - seq * 10)); }
        write(&dir, &format!("{S1}.9.gtrc.tmp"), 500, Duration::from_secs(5));
        let report = drain(&dir, DRAIN_BATCH, |_, _| async { Ok(403) }).await;
        assert!(report.withdrawn && report.stopped);
        assert_eq!(report.sent, 0);
        assert!(ready(&dir).is_empty());
        assert!(!dir.join(format!("{S1}.9.gtrc.tmp")).exists());
        fs::remove_dir_all(&dir).ok();
    }

    #[tokio::test]
    async fn a_chunk_the_server_will_never_take_stops_blocking_the_queue() {
        let dir = spool();
        write(&dir, &format!("{S1}.0.gtrc"), 500, Duration::from_secs(600));
        write(&dir, &format!("{S1}.1.gtrc"), 500, Duration::from_secs(300));
        let seen = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
        let log = seen.clone();
        let report = drain(&dir, DRAIN_BATCH, move |item, _| {
            let log = log.clone();
            async move { log.lock().unwrap().push(item.seq); Ok(if item.seq == 0 { 410 } else { 200 }) }
        }).await;
        assert_eq!(report, Drained { sent: 1, dropped: 1, stopped: false, withdrawn: false });
        assert_eq!(*seen.lock().unwrap(), vec![0, 1]);
        assert!(ready(&dir).is_empty());
        fs::remove_dir_all(&dir).ok();
    }

    #[tokio::test]
    async fn one_pass_never_sends_more_than_the_batch() {
        let dir = spool();
        for seq in 0..6 { write(&dir, &format!("{S1}.{seq}.gtrc"), 100, Duration::from_secs(600 - seq * 10)); }
        let report = drain(&dir, 4, |_, _| async { Ok(200) }).await;
        assert_eq!(report.sent, 4);
        assert_eq!(ready(&dir).len(), 2);
        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn a_status_only_ever_deletes_when_the_server_is_done_with_the_file() {
        assert_eq!(verdict(200), Sent::Stored);
        assert_eq!(verdict(403), Sent::Withdrawn);
        for code in [400, 409, 410, 413, 422] { assert_eq!(verdict(code), Sent::Dropped); }
        for code in [204, 401, 404, 429, 500, 502, 503] { assert_eq!(verdict(code), Sent::Stop); }
    }
}
