import{currentUser}from"../../utils/auth";
import{replayConsent}from"../../utils/replay-consent";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
return replayConsent(user.id);
});
