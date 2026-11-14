import{currentUser}from"../../utils/auth";
import{sendCommand}from"../../utils/party";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
const{action,arg}=await readBody(event);
return await sendCommand(user.id,action,arg);
});
