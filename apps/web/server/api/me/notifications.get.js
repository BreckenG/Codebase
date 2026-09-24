import{currentUser}from"../../utils/auth";
import{listNotifications}from"../../utils/notifications";
export default defineEventHandler(async event=>{
setResponseHeader(event,'Cache-Control','private, no-store');
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
return await listNotifications(user.id);
});
