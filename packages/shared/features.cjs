const LOCKED = {
  trainer: {
    title: "AI Trainer",
    blurb: "Coming soon. Training lobbies are not running yet on any plan.",
  },
};
function locked(key) {
  return Object.hasOwn(LOCKED, key);
}
function copy(key) {
  return LOCKED[key] || null;
}
function reason(key) {
  const c = LOCKED[key];
  return c ? c.title + " is coming soon" : "Coming soon";
}
module.exports = { LOCKED, locked, copy, reason };
