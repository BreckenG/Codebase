import { requireUser } from "../../utils/auth";
import { Player, connectDb } from "../../utils/db";
import { entitlementFor } from "../../utils/entitlements";
import { clampCard } from "../../../app/utils/profile-card.js";
import { cardProfile } from "../../utils/player-card.js";
export default defineEventHandler(async event => {
  const user = requireUser(event);
  await connectDb();
  const [profile, entitlement] = await Promise.all([Player.findOne({ discordId: user.id }, { name: 1, username: 1, avatar: 1, discordId: 1, linked: 1, ranked: 1, profileCard: 1 }).lean(), entitlementFor(user.id)]);
  return { card: clampCard(profile?.profileCard, entitlement.cardLevel), level: entitlement.cardLevel ?? 0, profile: cardProfile(profile || { discordId: user.id, username: user.username, avatar: user.avatar }) };
});
