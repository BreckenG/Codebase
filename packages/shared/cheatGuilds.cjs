const cache = new Map();
function clean(name) {
  return String(name || "Unknown server").replace(/[`*_~|>@#]/g, "").slice(0, 60);
}
async function cheatGuilds(discordId) {
  const base = process.env.WHYS_API_URL, key = process.env.WHYS_API_KEY;
  const id = String(discordId || "");
  if (!base || !key || !/^\d{17,20}$/.test(id)) return { guilds: [], checked: false };
  const hit = cache.get(id);
  if (hit && hit.until > Date.now()) return hit.value;
  let value = { guilds: [], checked: false };
  try {
    const res = await fetch(`${base}/quick/check`, {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
      signal: AbortSignal.timeout(11000),
    });
    const q = res.ok ? await res.json() : null;
    if (q && q.done && Array.isArray(q.guilds)) value = { guilds: q.guilds.map((g) => clean(g && (g.guildName || g.guildId))), checked: true };
  } catch {}
  if (cache.size > 5000) cache.clear();
  cache.set(id, { until: Date.now() + (!value.checked ? 15000 : value.guilds.length ? 8000 : 120000), value });
  return value;
}
function message(guilds) {
  return `You are in ${guilds.length === 1 ? "a cheating Discord server" : "cheating Discord servers"}:\n${guilds.slice(0, 15).map((g) => `- ${g}`).join("\n")}\n\nLeave ${guilds.length === 1 ? "it" : "them"}, then try again. It rechecks live every time you try.`;
}
module.exports = { cheatGuilds, message };
