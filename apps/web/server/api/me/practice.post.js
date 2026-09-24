import{requireReplayConsent}from"../../utils/replay-consent";
import{currentUser}from"../../utils/auth";
import features from"../../../../../packages/shared/features.cjs";
import{entitlementFor}from"../../utils/entitlements";
import{PartyCommand,connectDb}from"../../utils/db";
import{PRACTICE_DIFFICULTIES}from"../../utils/plans";
const RANK={free:0,plus:1,pro:2};
export default defineEventHandler(async event=>{
if(features.locked("practice"))throw createError({statusCode:409,statusMessage:features.copy("practice").blurb});

const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
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
await PartyCommand.deleteMany({userId:user.id,state:{$ne:"pending"}});
const already=await PartyCommand.countDocuments({userId:user.id,state:"pending"});
if(already>=3)throw createError({statusCode:429,statusMessage:"Still applying the last one"});
await PartyCommand.create({userId:user.id,action:cmd,arg});
return{queued:true};
});
