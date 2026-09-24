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
    friendLeaderboards: rank >= 1,
    eloBreakdown: rank >= 1,
    historyLimit: rank ? null : 25,
    practicePerDay: [1, 3, 10][rank],
    priorityQueueMs: rank ? 30000 : 0,
    premiumPractice: rank >= 1,
    practiceBest: rank === 2,
    unlimitedTrainer: rank === 2,
  };
}
function activePlan(doc, now = Date.now()) {
  if (!doc || !["active", "trialing", "past_due"].includes(doc.status)) return "free";
  const expires = new Date(doc.currentPeriodEnd).getTime();
  if (!doc.currentPeriodEnd || !Number.isFinite(expires) || expires <= now) return "free";
  return membership(doc.plan).plan;
}
module.exports = { membership, activePlan };
