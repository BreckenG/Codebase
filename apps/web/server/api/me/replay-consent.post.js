import{currentUser}from"../../utils/auth";
import{Player,connectDb}from"../../utils/db";
import{replayConsent,REPLAY_VERSION}from"../../utils/replay-consent";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
const body=await readBody(event);
if(typeof body?.accepted!=="boolean"||body.accepted&&body.version!==REPLAY_VERSION)throw createError({statusCode:400,statusMessage:"Review the current movement replay consent notice"});
await connectDb();
const update=body.accepted?{"acceptance.replays":{version:REPLAY_VERSION,at:new Date(),source:event.context.desktopUser?"desktop":"web",revokedAt:null}}:{"acceptance.replays.revokedAt":new Date()};
await Player.updateOne({discordId:user.id},{$set:update},{upsert:body.accepted});
return replayConsent(user.id);
});
