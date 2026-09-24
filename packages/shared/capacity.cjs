module.exports = {
  CONNECT_MAX_LIVE: 50,
  CONNECT_PER_ACCOUNT: 1,
  CONNECT_PER_DAY: 5,
  CONNECT_TTL_MS: 600000,
  SEARCH_CACHE_MS: 60000,
  SEARCH_CACHE_MAX: 500,
  SEARCH_FAIL_MS: 5000,
  SEARCH_PER_ACCOUNT_PER_MIN: 10,
  SEARCH_GLOBAL_PER_MIN: 60,
  AVATAR_CACHE_MS: 3600000,
  AVATAR_FAIL_MS: 5000,
  AVATAR_CACHE_MAX: 300,
  AVATAR_CACHE_MAX_BYTES: 65536,
  LIMIT_MAP_MAX: 20000,
  REPLAY_MAP_MAX: 10000,
};

module.exports.connectFullMessage = function connectFullMessage(seconds) {
  const c = module.exports;
  const s = Math.max(1, Math.ceil(Number(seconds) || 0));
  if (!seconds) return `Ranked World is full right now, all ${c.CONNECT_MAX_LIVE} connect codes are in use. Try again in a few minutes.`;
  const wait = s <= 90 ? `about ${s} seconds` : `about ${Math.ceil(s / 60)} minutes`;
  return `Ranked World is full right now, all ${c.CONNECT_MAX_LIVE} connect codes are in use. Try again in ${wait}.`;
};

module.exports.connectVerdict = function connectVerdict({ live, globalLive, usedToday }, now = Date.now()) {
  const c = module.exports;
  if (live && new Date(live.expiresAt).getTime() > now) return { ok: true, reuse: true, code: live.code };
  if (usedToday >= c.CONNECT_PER_DAY)
    return { ok: false, status: 429, reason: "daily", message: `You have started ${c.CONNECT_PER_DAY} connect codes today. The limit resets at midnight UTC.` };
  if (globalLive >= c.CONNECT_MAX_LIVE)
    return { ok: false, status: 503, reason: "full", message: c.connectFullMessage() };
  return { ok: true, reuse: false };
};
