import{currentUser}from"../../utils/auth";
import features from"../../../../../packages/shared/features.cjs";
import{entitlementFor}from"../../utils/entitlements";
import{PracticeSession,Player,PartyCommand,connectDb}from"../../utils/db";
import{PRACTICE_DIFFICULTIES}from"../../utils/plans";
const RANK={free:0,plus:1,pro:2};
const PRACTICE_TESTERS=new Set(["1185849692395929611","1075160686000349286","1269741594538414122","1226251910961430589"]);
export default defineEventHandler(async event=>{
if(features.locked("practice")&&!PRACTICE_TESTERS.has(String(currentUser(event)?.id)))return{signedIn:false,comingSoon:true,comingSoonText:features.copy("practice").blurb,perDay:0,used:0,session:null,difficulties:[],error:null};
const user=currentUser(event);
if(!user)return{signedIn:false,perDay:0,used:0,session:null,difficulties:[],error:null};
await connectDb();
const ent=await entitlementFor(user.id);
const day=new Date().toISOString().slice(0,10);
const[dayDoc,session,failed]=await Promise.all([Player.findOne({discordId:user.id},{practiceUsage:1}).lean(),PracticeSession.findOne({userId:user.id,state:"open"}).sort({startedAt:-1}).lean(),PartyCommand.findOne({userId:user.id,state:"failed",action:{$in:["practice_start","practice_stop"]}}).sort({createdAt:-1}).lean()]);
const rank=RANK[ent.plan]??0;
return{signedIn:true,perDay:ent.practicePerDay,used:dayDoc?.practiceUsage?.[day]||0,session:session?{code:session.code,difficulty:session.difficulty,phase:session.phase,points:session.points||[0,0]}:null,difficulties:PRACTICE_DIFFICULTIES.map(d=>({value:d.value,label:d.label,blurb:d.blurb,tier:d.tier,locked:(RANK[d.tier]??0)>rank})),error:failed?.error||null};
});
