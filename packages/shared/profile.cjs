module.exports = function profileSchema(mongoose) {
  const { Schema } = mongoose;
  const skill = new Schema({ mu: Number, sigma: Number }, { _id: false });
  const track = new Schema({
    skill: { type: skill, default: null },
    elo: { type: Number, default: 0 }, rank: { type: String, default: "Bronze 1" },
    category: { type: String, default: "LOW" }, roundsPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 }, tags: { type: Number, default: 0 },
    survivalSeconds: { type: Number, default: 0 }, peakElo: { type: Number, default: 0 },
    winStreak: { type: Number, default: 0 }, lossStreak: { type: Number, default: 0 },
    performanceStreak: { type: Number, default: 0 },
  }, { _id: false });
  const acceptance = new Schema({ version: String, at: Date, source: String, revokedAt: Date }, { _id: false });
  const schema = new Schema({
    platform: { type: String, enum: ["steam", "meta", "unknown"], default: "unknown" }, platformUpdatedAt: Date,
    photonId: String, discordId: String, name: { type: String, default: "" },
    names: { type: [String], default: [] }, username: { type: String, default: "" },
    avatar: { type: String, default: "" }, linked: { type: Boolean, default: false }, serverBanned: { type: Boolean, default: false },
    modMode: { type: Boolean, default: false }, modModeAt: Date,
    syncMethod: String, linkedAt: Date, rolesDirty: String, lastCode: String, lastSeenAt: Date,
    ranked: { type: track, default: () => ({}) }, scrim: { type: track, default: () => ({}) },
    friends: { type: [String], default: [] },
    profileCard: { background: String, pattern: String, font: String, accent: String, layout: String },
    acceptance: { account: acceptance, linking: acceptance, billing: acceptance, replays: acceptance },
    connectCode: { code: String, createdAt: Date, expiresAt: Date },
    connectUsage: { day: String, n: Number },
    practiceUsage: { type: Map, of: Number, default: () => ({}) },
    mirror: { tier: String, a: Number, b: Number, matches: Number, rounds: Number, updatedAt: Date },
    stripeCustomerId: String, stripeSubscriptionId: String, plan: { type: String, default: "free" },
    interval: String, status: String, currentPeriodEnd: Date, cancelAtPeriodEnd: Boolean,
    pendingPlan: String, pendingInterval: String, stripeScheduleId: String,
    discordPlan: String, discordPlanEnds: Date, discordEntitlementId: String,
    updatedAt: { type: Date, default: Date.now },
  });
  for (const field of ["photonId", "discordId", "connectCode.code"])
    schema.index({ [field]: 1 }, { unique: true, partialFilterExpression: { [field]: { $type: "string" } } });
  for (const field of ["username", "names", "lastCode", "rolesDirty", "stripeCustomerId"]) schema.index({ [field]: 1 });
  for (const mode of ["ranked", "scrim"]) schema.index({ linked: 1, [`${mode}.elo`]: -1, name: 1 });
  return schema;
};
