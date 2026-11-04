const levels = { free: 0, plus: 1, pro: 2 };
function membership(value) {
  const plan = Object.hasOwn(levels, value) ? value : "free";
  const rank = levels[plan];
  return {
    plan,
    isPlus: rank >= 1,
    isPro: rank === 2,
    cardLevel: rank,
    replayCount: [0, 10, 100][rank],
    replayDays: [0, 7, 30][rank],
    replayMinutes: [0, 15, 60][rank],
    replayAnalytics: rank >= 1,
    mirrorBot: rank === 2,
    earlyCodes: rank === 2,
    firstIn: rank === 2,
    lobbyPreview: rank === 2,
    friendLeaderboards: rank >= 1,
    eloBreakdown: rank >= 1,
    historyLimit: rank ? null : 5,
    practicePerWeek: [1, 5, 15][rank],
    priorityQueueMs: rank ? 30000 : 0,
    premiumPractice: rank >= 1,
    practiceBest: rank === 2,
  };
}
function stripePlan(doc, now = Date.now()) {
  if (!doc || !["active", "trialing", "past_due"].includes(doc.status)) return "free";
  const expires = new Date(doc.currentPeriodEnd).getTime();
  if (!doc.currentPeriodEnd || !Number.isFinite(expires) || expires <= now) return "free";
  return membership(doc.plan).plan;
}
function discordPlan(doc, now = Date.now()) {
  if (!doc?.discordPlan) return "free";
  if (doc.discordPlanEnds && !(new Date(doc.discordPlanEnds).getTime() > now)) return "free";
  return membership(doc.discordPlan).plan;
}
function activePlan(doc, now = Date.now()) {
  const web = stripePlan(doc, now), app = discordPlan(doc, now);
  return levels[app] > levels[web] ? app : web;
}
const FIRST_IN_MS = 120000;
const PEEK_MS = 300000;
const tryReady = (at) => !at;
const tryUsed = (t) => Boolean(t?.peekAt || t?.firstInAt || t?.mirrorAt);
function weekKey(now = Date.now()) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return "w" + d.toISOString().slice(0, 10);
}
const tryLive = (at, ms, now = Date.now()) => Boolean(at) && now - new Date(at).getTime() < ms;
module.exports = { membership, activePlan, stripePlan, discordPlan, FIRST_IN_MS, PEEK_MS, tryReady, tryUsed, tryLive, weekKey };
