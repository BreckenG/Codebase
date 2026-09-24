import{requireAcceptance,recordAcceptance}from"../../utils/consent";
import{currentUser}from"../../utils/auth";
import{startConnect}from"../../utils/connect";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
requireAcceptance(await readBody(event));
await recordAcceptance(user.id,"linking");
return await startConnect(user.id);
});
