import{requireBots}from"../../utils/bots";
import membership from"../../../../../packages/shared/membership.cjs";
import bots from"../../../../../packages/shared/bots.cjs";
import{entitlementFor}from"../../utils/entitlements";
import{PracticeSession,Player,PartyCommand,connectDb}from"../../utils/db";
import{PRACTICE_DIFFICULTIES}from"../../utils/plans";
const RANK={free:0,plus:1,pro:2};
export default defineEventHandler(async event=>{
const user=requireBots(event);
await connectDb();
const ent=await entitlementFor(user.id);
const day=membership.weekKey();
const[dayDoc,session,failed]=await Promise.all([Player.findOne({discordId:user.id},{practiceUsage:1}).lean(),PracticeSession.findOne({userId:user.id,state:"open"}).sort({startedAt:-1}).lean(),PartyCommand.findOne({userId:user.id,state:"failed",action:{$in:["practice_start","practice_stop"]}}).sort({createdAt:-1}).lean()]);
const rank=bots.OPEN?RANK[ent.plan]??0:2;
return{signedIn:true,perWeek:ent.practicePerWeek,used:dayDoc?.practiceUsage?.[day]||0,session:session?{code:session.code,startedAt:session.startedAt,difficulty:session.difficulty,phase:session.phase,points:session.points||[0,0],mode:session.mode||"practice",target:session.mirror?.name||null}:null,difficulties:PRACTICE_DIFFICULTIES.map(d=>({value:d.value,label:d.label,blurb:d.blurb,tier:d.tier,locked:(RANK[d.tier]??0)>rank})),error:failed?.error||null};
});
