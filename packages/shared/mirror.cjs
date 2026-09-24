const TIERS = ["noob", "easy", "average", "good", "best"];
const CUTS = [0.15, 0.4, 0.7, 0.9];
const CAP = { free: 2, plus: 3, pro: 4 };
const TARGET = 0.4;
const BAND = [0.3, 0.5];
const PRIOR = [2, 3];
const DECAY = 0.9;
const CONFIDENCE = 0.9;
const FULL_MOVEMENT_SAMPLES = 1200;
const NOISE_MARGIN = 0.15;
const OFFSETS = [
  { key: "behind", label: "Behind you", step: -1 },
  { key: "even", label: "Even", step: 0 },
  { key: "ahead", label: "Ahead of you", step: 1 },
];
const RULE = { target: TARGET, band: BAND, prior: PRIOR, decay: DECAY, confidence: CONFIDENCE, noiseMargin: NOISE_MARGIN, fullMovementSamples: FULL_MOVEMENT_SAMPLES };
const PLAN_COPY = {
  free: {
    mirror: false,
    headline: "Mirror Bot is a Pro feature",
    body: "Free keeps 1 practice match a day against Noob, Easy or Average, and the difficulty is the one you pick.",
  },
  plus: {
    mirror: false,
    headline: "Mirror Bot is a Pro feature",
    body: "Plus keeps 3 practice matches a day and unlocks Good, and the difficulty is still the one you pick.",
  },
  pro: {
    mirror: true,
    headline: "Mirror Bot picks its own difficulty",
    body: "Pro gets 10 matches a day, every difficulty up to Best, and a bot that reads your own recordings for its routes and its level.",
  },
};
function enabled() {
  return false;
}
function indexOf(tier) {
  const i = TIERS.indexOf(tier);
  return i < 0 ? 2 : i;
}
function tierOf(q) {
  return TIERS[CUTS.filter((c) => q >= c).length];
}
function capFor(plan) {
  return CAP[plan] === undefined ? 0 : CAP[plan];
}
function clampTier(i, plan) {
  return Math.max(0, Math.min(capFor(plan), Math.round(i)));
}
function weightOf(movement, ranked) {
  const m = movement && movement.samples > 0 ? Math.min(1, movement.samples / FULL_MOVEMENT_SAMPLES) : 0;
  let r = 0;
  if (ranked && Number.isFinite(ranked.q)) r = ranked.provisional ? 0.5 : 1;
  return { movement: m, ranked: r };
}
function blend(movement, ranked) {
  const w = weightOf(movement, ranked);
  const total = w.movement + w.ranked;
  if (!total) return { q: 0.5, confidence: 0, source: "default" };
  const q = ((movement ? movement.q : 0) * w.movement + (ranked ? ranked.q : 0) * w.ranked) / total;
  const source = w.movement && w.ranked ? "both" : w.movement ? "movement" : "ranked";
  return { q, confidence: Math.min(1, total / 2), source };
}
function pick(opts) {
  const plan = (opts && opts.plan) || "free";
  const state = (opts && opts.state) || null;
  const est = blend(opts && opts.movement, opts && opts.ranked);
  let i = indexOf(tierOf(est.q));
  let held = false;
  if (state && state.tier) {
    const cur = indexOf(state.tier);
    const lo = cur > 0 ? CUTS[cur - 1] : -1;
    const hi = cur < CUTS.length ? CUTS[cur] : 2;
    if (est.q < hi + NOISE_MARGIN && est.q >= lo - NOISE_MARGIN) {
      i = cur;
      held = true;
    } else i = est.q >= hi + NOISE_MARGIN ? cur + 1 : cur - 1;
  }
  const step = offsetStep(opts && opts.offset);
  const capped = clampTier(i + step, plan);
  return {
    tier: TIERS[capped],
    base: TIERS[clampTier(i, plan)],
    q: Math.round(est.q * 1000) / 1000,
    confidence: Math.round(est.confidence * 100) / 100,
    source: est.source,
    held,
    lockedByPlan: i + step > capFor(plan),
    offset: step,
  };
}
function offsetStep(key) {
  const o = OFFSETS.find((x) => x.key === key);
  return o ? o.step : 0;
}
function fresh() {
  return { a: PRIOR[0], b: PRIOR[1], matches: 0, rounds: 0 };
}
function botWon(r) {
  if (!r) return false;
  return r.it === "you" ? r.end !== "tag" : r.end === "tag";
}
function feed(state, rounds, plan) {
  plan = plan || (state && state.plan) || "free";
  const s = state && Number.isFinite(state.a) ? state : Object.assign(fresh(), { tier: (state && state.tier) || "average" });
  const list = (Array.isArray(rounds) ? rounds : []).filter(Boolean);
  const wins = list.filter(botWon).length;
  const n = list.length;
  if (!n) return { state: s, moved: 0, share: null };
  const a = PRIOR[0] + (s.a - PRIOR[0]) * DECAY + wins;
  const b = PRIOR[1] + (s.b - PRIOR[1]) * DECAY + (n - wins);
  const tooStrong = 1 - betai(a, b, BAND[1]);
  const tooWeak = betai(a, b, BAND[0]);
  const cur = indexOf(s.tier);
  let moved = 0;
  if (tooStrong > CONFIDENCE && cur > 0) moved = -1;
  else if (tooWeak > CONFIDENCE && cur < capFor(plan)) moved = 1;
  const next = {
    plan,
    tier: TIERS[Math.max(0, Math.min(capFor(plan), cur + moved))],
    a: moved ? PRIOR[0] : a,
    b: moved ? PRIOR[1] : b,
    matches: (s.matches || 0) + 1,
    rounds: (s.rounds || 0) + n,
  };
  return { state: next, moved, share: Math.round((wins / n) * 1000) / 1000 };
}
function betacf(a, b, x) {
  const eps = 3e-16, fpmin = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const de = d * c;
    h *= de;
    if (Math.abs(de - 1) < eps) break;
  }
  return h;
}
function lgamma(z) {
  const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < g.length; i++) x += g[i] / (z + i + 1);
  const t = z + g.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function betai(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}
module.exports = { TIERS, CUTS, OFFSETS, RULE, PLAN_COPY, enabled, tierOf, indexOf, capFor, clampTier, blend, pick, fresh, feed, botWon, betai };
