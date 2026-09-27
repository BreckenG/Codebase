import{currentUser}from"../../utils/auth";
import{Player,connectDb}from"../../utils/db";
import voice from"../../../../../packages/shared/voice.cjs";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
const body=await readBody(event);
if(body?.accepted!==true||body.version!==voice.VOICE_VERSION)throw createError({statusCode:400,statusMessage:"Review the current voice chat notice"});
await connectDb();
await Player.updateOne({discordId:user.id},{$set:{"acceptance.voice":{version:voice.VOICE_VERSION,at:new Date(),source:event.context.desktopUser?"desktop":"web",revokedAt:null}}});
return{accepted:true,version:voice.VOICE_VERSION};
});
