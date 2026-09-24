import{currentUser}from"../../utils/auth";
import features from"../../../../../packages/shared/features.cjs";
import{entitlementFor}from"../../utils/entitlements";
import{PracticeSession,Player,PartyCommand,connectDb}from"../../utils/db";
import{MIRROR,mirrorEnabled,rankedInput}from"../../utils/mirror";
export default defineEventHandler(async event=>{
const user=currentUser(event);
const on=mirrorEnabled();
if(!user)return{signedIn:false,enabled:on,allowed:false,plan:"free",picked:null,session:null,error:null};
await connectDb();
const ent=await entitlementFor(user.id);
const day=new Date().toISOString().slice(0,10);
const[me,session,failed]=await Promise.all([
Player.findOne({discordId:user.id},{ranked:1,mirror:1,linked:1,practiceUsage:1}).lean(),
PracticeSession.findOne({userId:user.id,state:"open"}).sort({startedAt:-1}).lean(),
PartyCommand.findOne({userId:user.id,state:"failed",action:{$in:["mirror_start","mirror_stop"]}}).sort({createdAt:-1}).lean(),
]);
const state=me?.mirror?.tier?me.mirror:null;
const picked=MIRROR.pick({plan:ent.plan,ranked:rankedInput(me),state});
return{
signedIn:true,
enabled:on,
allowed:Boolean(ent.mirrorBot),
plan:ent.plan,
linked:Boolean(me?.linked),
copy:MIRROR.PLAN_COPY[ent.plan]||MIRROR.PLAN_COPY.free,
offsets:MIRROR.OFFSETS,
picked,
matches:state?.matches||0,
rounds:state?.rounds||0,
perDay:ent.practicePerDay,
used:me?.practiceUsage?.[day]||0,
routesReady:false,
session:session&&session.mode==="mirror"?{code:session.code,difficulty:session.difficulty,phase:session.phase,points:session.points||[0,0]}:null,
error:failed?.error||null,
};
});
