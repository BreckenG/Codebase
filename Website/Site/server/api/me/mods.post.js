import{currentUser}from"../../utils/auth";
import{Player,connectDb}from"../../utils/db";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
const body=await readBody(event);
if(body?.removed!==true)throw createError({statusCode:400,statusMessage:"Remove your mods first"});
await connectDb();
await Player.updateOne({discordId:user.id},{$unset:{modHold:1}});
return{cleared:true};
});
