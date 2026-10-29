import{currentUser}from"../utils/auth";
import features from"../../../../packages/shared/features.cjs";
import bots from"../../../../packages/shared/bots.cjs";
export default defineEventHandler(event=>({locked:{...features.LOCKED},bots:bots.botsAllowed(currentUser(event)?.id)}));
