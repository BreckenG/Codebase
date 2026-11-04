import{requireBots}from"../../utils/bots";
import membership from"../../../../../packages/shared/membership.cjs";
import{entitlementFor}from"../../utils/entitlements";
import{PracticeSession,Player,PartyCommand,connectDb}from"../../utils/db";
import{MIRROR_PENALTY,BUILD_STALE_MS,MIN_ROUNDS,mirrorStats,isPublic,publicMirrors,roundsFor}from"../../utils/mirror";
export default defineEventHandler(async event=>{
const user=requireBots(event);
await connectDb();
const ent=await entitlementFor(user.id);
const day=membership.weekKey();
const[me,session,failed,publics]=await Promise.all([
Player.findOne({discordId:user.id},{photonId:1,linked:1,practiceUsage:1,mirrorBot:1,mirrorPublic:1,tries:1,gorillaColor:1,cosmetics:1}).lean(),
PracticeSession.findOne({userId:user.id,state:"open"}).sort({startedAt:-1}).lean(),
PartyCommand.findOne({userId:user.id,state:"failed",action:{$in:["mirror_start","mirror_stop","mirror_build"]}}).sort({createdAt:-1}).lean(),
publicMirrors(),
]);
const pro=Boolean(ent.mirrorBot);
const freeTry=!pro&&!membership.tryUsed(me?.tries);
const bot=me?.mirrorBot||null;
const rounds=await roundsFor(me?.photonId);
const stale=bot?.status==="building"&&(!bot.startedAt||Date.now()-new Date(bot.startedAt).getTime()>BUILD_STALE_MS);
return{
signedIn:true,
pro,
freeTry,
plan:ent.plan,
linked:Boolean(me?.linked&&me.photonId),
photonId:me?.photonId||null,color:me?.gorillaColor||null,cosmetics:me?.cosmetics||[],
perWeek:ent.practicePerWeek,
used:me?.practiceUsage?.[day]||0,
penalty:MIRROR_PENALTY,
self:{status:stale?"stale":bot?.status||"none",startedAt:bot?.startedAt||null,builtAt:bot?.builtAt||null,error:bot?.error||null,stats:mirrorStats(bot),public:isPublic(me),rounds,need:MIN_ROUNDS},
publics:publics.filter(p=>p.photonId!==me?.photonId).map(p=>({photonId:p.photonId,name:p.mirrorPublic.name||p.name||"Player",display:p.mirrorPublic.display||p.username||"",title:p.mirrorPublic.title||"",color:p.gorillaColor||null,cosmetics:p.cosmetics||[],builtAt:p.mirrorBot?.builtAt||null,stats:pro?mirrorStats(p.mirrorBot):null,playable:pro||freeTry})),
session:session?{code:session.code,startedAt:session.startedAt,difficulty:session.difficulty,phase:session.phase,points:session.points||[0,0],mode:session.mode||"practice",target:session.mirror?.name||null,self:Boolean(session.mirror?.self)}:null,
error:failed?.error||null,
};
});
