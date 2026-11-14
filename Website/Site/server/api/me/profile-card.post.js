import { requireUser } from "../../utils/auth";
import { Player, connectDb } from "../../utils/db";
import { entitlementFor } from "../../utils/entitlements";
import { validateCard } from "../../../app/utils/profile-card.js";
export default defineEventHandler(async event => {
  const user = requireUser(event);
  const entitlement = await entitlementFor(user.id);
  const result = validateCard(await readBody(event), entitlement.cardLevel);
  if (result.error) throw createError({ statusCode: result.statusCode, statusMessage: result.error });
  await connectDb();
  await Player.updateOne({ discordId: user.id }, { $set: { profileCard: result.card } }, { upsert: true });
  return { card: result.card, level: entitlement.cardLevel ?? 0 };
});
