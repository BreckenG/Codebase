const OWNER = "1075160686000349286";
const OPEN = false;
const CLOSED = "Practice Bots and Mirror Bots are not open yet.";
function botsAllowed(id) {
  return OPEN || String(id || "") === OWNER;
}
module.exports = { OWNER, OPEN, CLOSED, botsAllowed };
