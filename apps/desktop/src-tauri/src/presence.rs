use serde_json::{json, Value};
use std::{io, time::Duration};
use tokio::{io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt}, sync::watch, time::{Instant, timeout}};

const RETRY: Duration = Duration::from_secs(15);
const IO_TIMEOUT: Duration = Duration::from_secs(2);
const MAX_FRAME: usize = 65536;

#[derive(Clone, Default)]
struct Desired { rank: Option<String>, stopped: bool }
pub struct Presence { sender: Option<watch::Sender<Desired>> }
impl Presence {
    pub fn new(application_id: Option<&str>, image: Option<&str>) -> Result<Self, String> {
        let Some(id) = application_id.filter(|id| !id.is_empty()) else { return Ok(Self { sender: None }); };
        if !(17..=20).contains(&id.len()) || !id.bytes().all(|b| b.is_ascii_digit()) || id.parse::<u64>().unwrap_or(0) == 0 { return Err("Invalid Discord application ID.".into()); }
        let image = image.filter(|image| !image.is_empty());
        if image.is_some_and(|image| image.len() > 256 || !image.bytes().all(|b| b.is_ascii_graphic())) { return Err("Invalid Discord image asset.".into()); }
        let id = id.to_owned(); let image = image.map(str::to_owned);
        let (sender, receiver) = watch::channel(Desired::default());
        let runtime = tokio::runtime::Builder::new_current_thread().enable_all().build().map_err(|_| "Could not start Discord presence.")?;
        std::thread::Builder::new().name("discord-presence".into()).spawn(move || runtime.block_on(worker(id, image, receiver))).map_err(|_| "Could not start Discord presence.")?;
        Ok(Self { sender: Some(sender) })
    }
    pub fn set_rank(&self, rank: &str) -> Result<(), String> {
        let rank = valid_rank(rank)?;
        if let Some(sender) = &self.sender { sender.send_if_modified(|state| {
            if state.stopped || state.rank.as_ref() == Some(&rank) { return false; }
            state.rank = Some(rank); true
        }); }
        Ok(())
    }
    pub fn clear(&self) { if let Some(sender) = &self.sender { sender.send_modify(|state| state.rank = None); } }
    pub fn shutdown(&self) { if let Some(sender) = &self.sender { sender.send_modify(|state| { state.rank = None; state.stopped = true; }); } }
}
impl Drop for Presence { fn drop(&mut self) { self.shutdown(); } }

fn valid_rank(rank: &str) -> Result<String, String> {
    if rank.len() > 96 || !rank.bytes().all(|b| b.is_ascii_alphanumeric() || b == b' ') || rank.trim().is_empty() { return Err("Invalid rank for Discord presence.".into()); }
    Ok(rank.trim().to_owned())
}
fn activity(rank: Option<&str>, image: Option<&str>) -> Value {
    let Some(rank) = rank else { return Value::Null; };
    let mut value = json!({ "type": 0, "details": format!("Rank: {rank}"), "state": "rankedworld.com" });
    if let Some(image) = image { value["assets"] = json!({ "large_image": image, "large_text": "Ranked World" }); }
    value
}
fn invalid() -> io::Error { io::Error::new(io::ErrorKind::InvalidData, "Invalid Discord IPC response") }
fn take_frame(buffer: &mut Vec<u8>) -> io::Result<Option<(u32, Vec<u8>)>> {
    if buffer.len() < 8 { return Ok(None); }
    let opcode = u32::from_le_bytes(buffer[..4].try_into().unwrap());
    let size = u32::from_le_bytes(buffer[4..8].try_into().unwrap()) as usize;
    if size > MAX_FRAME { return Err(invalid()); }
    if buffer.len() < 8 + size { return Ok(None); }
    let payload = buffer[8..8 + size].to_vec(); buffer.drain(..8 + size);
    Ok(Some((opcode, payload)))
}
async fn write_frame<S: AsyncWrite + Unpin>(stream: &mut S, opcode: u32, payload: &[u8]) -> io::Result<()> {
    if payload.len() > MAX_FRAME { return Err(invalid()); }
    let mut frame = Vec::with_capacity(8 + payload.len()); frame.extend_from_slice(&opcode.to_le_bytes());
    frame.extend_from_slice(&(payload.len() as u32).to_le_bytes()); frame.extend_from_slice(payload);
    timeout(IO_TIMEOUT, stream.write_all(&frame)).await??; Ok(())
}
async fn read_frame<S: AsyncRead + Unpin>(stream: &mut S) -> io::Result<(u32, Vec<u8>)> {
    let mut header = [0u8; 8]; stream.read_exact(&mut header).await?;
    let size = u32::from_le_bytes(header[4..].try_into().unwrap()) as usize; if size > MAX_FRAME { return Err(invalid()); }
    let mut payload = vec![0; size]; stream.read_exact(&mut payload).await?;
    Ok((u32::from_le_bytes(header[..4].try_into().unwrap()), payload))
}
async fn publish<S: AsyncWrite + Unpin>(stream: &mut S, rank: Option<&str>, image: Option<&str>, nonce: u64) -> io::Result<()> {
    let payload = json!({ "cmd": "SET_ACTIVITY", "args": { "pid": std::process::id(), "activity": activity(rank, image) }, "nonce": nonce.to_string() });
    write_frame(stream, 1, &serde_json::to_vec(&payload)?).await
}
async fn session<S: AsyncRead + AsyncWrite + Unpin>(mut stream: S, id: &str, image: Option<&str>, receiver: &mut watch::Receiver<Desired>) -> io::Result<()> {
    write_frame(&mut stream, 0, &serde_json::to_vec(&json!({ "v": 1, "client_id": id }))?).await?;
    let (opcode, payload) = timeout(IO_TIMEOUT, read_frame(&mut stream)).await??;
    if opcode != 1 || serde_json::from_slice::<Value>(&payload)?["evt"] != "READY" { return Err(invalid()); }
    let mut incoming = Vec::new(); let mut bytes = [0u8; 4096]; let mut sent = None;
    let mut sequence = 0u64; let mut pending: Option<(String, Instant)> = None; let mut next_publish = Instant::now();
    let mut tick = tokio::time::interval(Duration::from_millis(250));
    loop {
        let desired = receiver.borrow_and_update().clone();
        if desired.stopped || desired.rank.is_none() {
            let _ = publish(&mut stream, None, image, sequence.wrapping_add(1)).await; return Ok(());
        }
        if pending.as_ref().is_some_and(|(_, deadline)| Instant::now() >= *deadline) { return Err(io::ErrorKind::TimedOut.into()); }
        if desired.rank != sent && pending.is_none() && Instant::now() >= next_publish {
            sequence = sequence.wrapping_add(1); publish(&mut stream, desired.rank.as_deref(), image, sequence).await?;
            sent = desired.rank; next_publish = Instant::now() + RETRY; pending = Some((sequence.to_string(), Instant::now() + Duration::from_secs(5)));
        }
        tokio::select! {
            changed = receiver.changed() => { if changed.is_err() { let _ = publish(&mut stream, None, image, sequence.wrapping_add(1)).await; return Ok(()); } }
            _ = tick.tick() => {}
            result = stream.read(&mut bytes) => {
                let count = result?; if count == 0 { return Err(io::ErrorKind::UnexpectedEof.into()); }
                incoming.extend_from_slice(&bytes[..count]);
                while let Some((opcode, payload)) = take_frame(&mut incoming)? {
                    match opcode {
                        1 => {
                            let reply: Value = serde_json::from_slice(&payload)?;
                            if reply["evt"] == "ERROR" { return Err(invalid()); }
                            if pending.as_ref().is_some_and(|(nonce, _)| reply["nonce"].as_str() == Some(nonce.as_str()) && reply["cmd"] == "SET_ACTIVITY") { pending = None; }
                        }
                        3 => write_frame(&mut stream, 4, &payload).await?,
                        4 => {}
                        _ => return Err(invalid()),
                    }
                }
            }
        }
    }
}
#[cfg(windows)]
async fn connect() -> io::Result<tokio::net::windows::named_pipe::NamedPipeClient> {
    for index in 0..10 {
        if let Ok(pipe) = tokio::net::windows::named_pipe::ClientOptions::new().open(format!(r"\\?\pipe\discord-ipc-{index}")) { return Ok(pipe); }
    }
    Err(io::ErrorKind::NotFound.into())
}
#[cfg(windows)]
async fn worker(id: String, image: Option<String>, mut receiver: watch::Receiver<Desired>) {
    let mut retry_at = Instant::now();
    loop {
        let desired = receiver.borrow_and_update().clone(); if desired.stopped { return; }
        if desired.rank.is_some() && Instant::now() >= retry_at {
            if let Ok(pipe) = connect().await { let _ = session(pipe, &id, image.as_deref(), &mut receiver).await; }
            retry_at = Instant::now() + RETRY;
            continue;
        }
        tokio::select! {
            changed = receiver.changed() => if changed.is_err() { return; },
            _ = tokio::time::sleep_until(retry_at), if desired.rank.is_some() => {}
        }
    }
}
#[cfg(not(windows))]
async fn worker(_id: String, _image: Option<String>, mut receiver: watch::Receiver<Desired>) {
    while receiver.changed().await.is_ok() { if receiver.borrow().stopped { return; } }
}
