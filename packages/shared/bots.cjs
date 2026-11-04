const OWNER = "1075160686000349286";
const TESTERS = new Set([OWNER, "1185849692395929611", "1269741594538414122"]);
const OPEN = false;
const CLOSED = "Practice Bots and Mirror Bots are not open yet.";
function botsAllowed(id) {
  return OPEN || TESTERS.has(String(id || ""));
}
module.exports = { OWNER, OPEN, CLOSED, botsAllowed };
