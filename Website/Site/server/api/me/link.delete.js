import{currentUser}from"../../utils/auth";
import{disconnectAccount}from"../../utils/connect";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
return await disconnectAccount(user.id);
});
