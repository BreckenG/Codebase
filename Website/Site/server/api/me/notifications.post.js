import{currentUser}from"../../utils/auth";
import{markNotificationsRead}from"../../utils/notifications";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
return await markNotificationsRead(user.id,await readBody(event));
});
