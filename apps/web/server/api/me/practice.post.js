import{requireReplayConsent}from"../../utils/replay-consent";
import{requireBots}from"../../utils/bots";
import{entitlementFor}from"../../utils/entitlements";
import{connectDb}from"../../utils/db";
import{queueCommand}from"../../utils/mirror";
import{PRACTICE_DIFFICULTIES}from"../../utils/plans";
const RANK={free:0,plus:1,pro:2};
export default defineEventHandler(async event=>{
const user=requireBots(event);
const{action,difficulty}=await readBody(event);
await connectDb();
let cmd;
let arg=null;
if(action==="start"){
await requireReplayConsent(user.id);
const d=PRACTICE_DIFFICULTIES.find(x=>x.value===difficulty);
if(!d)throw createError({statusCode:400,statusMessage:"Unknown difficulty"});
const ent=await entitlementFor(user.id);
if((RANK[d.tier]??0)>(RANK[ent.plan]??0))throw createError({statusCode:403,statusMessage:`${d.label} needs a higher plan`});
cmd="practice_start";
arg=d.value;
}else if(action==="stop"){
cmd="practice_stop";
}else{
throw createError({statusCode:400,statusMessage:"Unknown action"});
}
await queueCommand(user.id,cmd,arg);
return{queued:true};
});
