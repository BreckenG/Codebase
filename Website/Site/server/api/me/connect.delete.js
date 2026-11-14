import{currentUser}from"../../utils/auth";
import{cancelConnect}from"../../utils/connect";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
return await cancelConnect(user.id);
});
