import{requireReplayConsent}from"../../utils/replay-consent";
import{requireBots}from"../../utils/bots";
import{entitlementFor}from"../../utils/entitlements";
import{Player,connectDb}from"../../utils/db";
import{BUILD_STALE_MS,MIN_ROUNDS,clampPenalty,isPublic,queueCommand,roundsFor}from"../../utils/mirror";
export default defineEventHandler(async event=>{
const user=requireBots(event);
const{action,target,penalty}=await readBody(event);
await connectDb();
if(action==="stop"){
await queueCommand(user.id,"mirror_stop",null);
return{queued:true};
}
await requireReplayConsent(user.id);
const me=await Player.findOne({discordId:user.id},{photonId:1,linked:1,mirrorBot:1}).lean();
if(!me?.linked||!me.photonId)throw createError({statusCode:409,statusMessage:"Connect your game account first"});
if(action==="build"){
const rounds=await roundsFor(me.photonId);
if(rounds<MIN_ROUNDS){
const left=MIN_ROUNDS-rounds;
throw createError({statusCode:409,statusMessage:`Play ${left} more ranked match${left===1?"":"es"} first`});
}
const b=me.mirrorBot;
if(b?.status==="building"&&b.startedAt&&Date.now()-new Date(b.startedAt).getTime()<BUILD_STALE_MS)throw createError({statusCode:409,statusMessage:"Your mirror is still building"});
await Player.updateOne({discordId:user.id},{$set:{"mirrorBot.status":"building","mirrorBot.startedAt":new Date(),"mirrorBot.error":null}});
await queueCommand(user.id,"mirror_build",null);
return{queued:true};
}
if(action!=="play")throw createError({statusCode:400,statusMessage:"Unknown action"});
const self=!target||target==="self"||target===me.photonId;
let name;
if(self){
if(me.mirrorBot?.status!=="ready")throw createError({statusCode:409,statusMessage:"Build your mirror first"});
name="your mirror";
}else{
const ent=await entitlementFor(user.id);
if(!ent.mirrorBot)throw createError({statusCode:403,statusMessage:"Public mirrors need Ranked World Pro"});
const other=await Player.findOne({photonId:String(target)},{name:1,mirrorBot:1,mirrorPublic:1}).lean();
if(!other||!isPublic(other)||other.mirrorBot?.status!=="ready")throw createError({statusCode:404,statusMessage:"That mirror is not public"});
name=other.mirrorPublic.name||other.name||"Player";
}
await queueCommand(user.id,"mirror_start",JSON.stringify({target:self?me.photonId:String(target),self,penalty:clampPenalty(penalty),name}));
return{queued:true};
});
