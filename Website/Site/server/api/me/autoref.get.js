import membership from"../../../../../packages/shared/membership.cjs";
import{currentUser}from"../../utils/auth";
import{entitlementFor}from"../../utils/entitlements";
import{Player,connectDb}from"../../utils/db";
import{AdminRefCommand,AdminRefSession}from"../../utils/autoref";
import{refError,refView}from"../../utils/autoref";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"sign_in_required"});
await connectDb();
const ent=await entitlementFor(user.id);
const[doc,live,history,latest,pending]=await Promise.all([
Player.findOne({discordId:user.id},{autoRefUsage:1,linked:1,photonId:1}).lean(),
AdminRefSession.findOne({mode:"member",requestedBy:user.id,state:{$ne:"ended"}}).sort({startedAt:-1}).lean(),
AdminRefSession.find({mode:"member",requestedBy:user.id,state:"ended"}).sort({endedAt:-1}).limit(15).lean(),
AdminRefCommand.findOne({requestedBy:user.id,member:true,createdAt:{$gte:new Date(Date.now()-120000)}}).sort({createdAt:-1}).lean(),
AdminRefCommand.exists({requestedBy:user.id,member:true,state:{$in:["pending","processing"]},expiresAt:{$gt:new Date()}}),
]);
const perWeek=ent.autoRefPerWeek??null,perDay=ent.autoRefPerDay??null;
const week=doc?.autoRefUsage?.[membership.weekKey()]||0,day=doc?.autoRefUsage?.[membership.dayKey()]||0;
const left=Math.max(0,Math.min(perWeek===null?Infinity:perWeek-week,perDay===null?Infinity:perDay-day));
const owner=String(doc?.photonId||"");
const last=history[0]&&Date.now()-new Date(history[0].endedAt).getTime()<900000?history[0]:null;
return{
allowed:!!ent.autoRef,plan:ent.plan,pickRegion:!!ent.isPro,perWeek,perDay,usedWeek:week,usedDay:day,left:Number.isFinite(left)?left:null,
linked:!!doc?.linked,
session:live?refView(live,owner):null,
last:!live&&last?refView(last,owner):null,
history:history.filter(s=>s.teamsAt).slice(0,10).map(s=>refView(s,owner)),
pending:!!pending,
error:latest?.state==="failed"?refError(latest.error):null,
};
});
