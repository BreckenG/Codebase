const LOCKED = {
  practice: {
    title: "Practice Bot",
    blurb: "Coming soon. Practice matches against the bot are not running yet.",
  },
  trainer: {
    title: "AI Trainer",
    blurb: "Coming soon. Training lobbies are not running yet on any plan.",
  },
  mirror: {
    title: "Mirror Bot",
    blurb: "Coming soon. Mirror Bot will learn your movement and routes from your saved replays. It is not available yet.",
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
