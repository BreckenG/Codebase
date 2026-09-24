import{requireReplayConsent}from"../../utils/replay-consent";
import{currentUser}from"../../utils/auth";
import features from"../../../../../packages/shared/features.cjs";
import{entitlementFor}from"../../utils/entitlements";
import{PartyCommand,connectDb}from"../../utils/db";
import{MIRROR,mirrorEnabled}from"../../utils/mirror";
export default defineEventHandler(async event=>{
if(features.locked("mirror"))throw createError({statusCode:409,statusMessage:features.copy("mirror").blurb});

const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
if(!mirrorEnabled())throw createError({statusCode:409,statusMessage:"Mirror Bot is not switched on yet"});
const{action,offset}=await readBody(event);
await connectDb();
let cmd;
let arg=null;
if(action==="start"){
await requireReplayConsent(user.id);
const ent=await entitlementFor(user.id);
if(!ent.mirrorBot)throw createError({statusCode:403,statusMessage:"Mirror Bot needs Ranked World Pro"});
if(offset&&!MIRROR.OFFSETS.some(o=>o.key===offset))throw createError({statusCode:400,statusMessage:"Unknown offset"});
cmd="mirror_start";
arg=offset||"even";
}else if(action==="stop"){
cmd="mirror_stop";
}else{
throw createError({statusCode:400,statusMessage:"Unknown action"});
}
await PartyCommand.deleteMany({userId:user.id,state:{$ne:"pending"}});
const already=await PartyCommand.countDocuments({userId:user.id,state:"pending"});
if(already>=3)throw createError({statusCode:429,statusMessage:"Still applying the last one"});
await PartyCommand.create({userId:user.id,action:cmd,arg});
return{queued:true};
});
