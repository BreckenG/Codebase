const cache = new Map();
const TTL_MS = 60000;
function clean(name) {
  return String(name || "Unknown server").replace(/[`*_~|>\@#]/g, "").slice(0, 60);
}
async function cheatGuilds(discordId) {
  const base = process.env.WHYS_API_URL, key = process.env.WHYS_API_KEY;
  const id = String(discordId || "");
  if (!base || !key || !/^\d{17,20}$/.test(id)) return { guilds: [], checked: false };
  const hit = cache.get(id);
  if (hit && hit.at > Date.now() - TTL_MS) return hit.value;
  const headers = { "x-api-key": key, "Content-Type": "application/json" };
  let value = { guilds: [], checked: false };
  try {
    const res = await fetch(`${base}/user/${id}`, { headers, signal: AbortSignal.timeout(4000) });
    const u = res.ok ? await res.json() : null;
    const done = !!u && !u.error && u.scanStatus === "complete";
    let guilds = [];
    if (done) {
      const gone = new Set((Array.isArray(u.leftCommunities) ? u.leftCommunities : []).map((g) => g && g.guildId).filter(Boolean));
      guilds = (Array.isArray(u.cheatingGuilds) ? u.cheatingGuilds : []).filter((g) => g && !gone.has(g.guildId)).map((g) => clean(g.guildName || g.guildId));
    }
    const known = done || (!!u && u.scanStatus === "cleared");
    if (!known || guilds.length)
      fetch(`${base}/queue/add`, { method: "POST", headers, body: JSON.stringify({ userId: id, priority: true, requestedBy: "ranked-world" }), signal: AbortSignal.timeout(4000) }).catch(() => {});
    value = { guilds, checked: known };
  } catch {}
  if (cache.size > 5000) cache.clear();
  cache.set(id, { at: Date.now(), value });
  return value;
}
function message(guilds) {
  return `You are in ${guilds.length === 1 ? "a cheating Discord server" : "cheating Discord servers"}:\n${guilds.slice(0, 15).map((g) => `- ${g}`).join("\n")}\n\nLeave ${guilds.length === 1 ? "it" : "them"}, then try again. It can take a few minutes to update after you leave.`;
}
module.exports = { cheatGuilds, message };
