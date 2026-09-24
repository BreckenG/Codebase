import{currentUser}from"../utils/auth";
import{entitlementFor}from"../utils/entitlements";
import{MatchLedger,Player,connectDb}from"../utils/db";
const PAGE=25;
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"sign_in_required"});
const{page="0",track="ranked"}=getQuery(event);
const skip=Math.max(0,parseInt(page,10)||0)*PAGE;
await connectDb();
const me=await Player.findOne({discordId:user.id},{photonId:1}).lean();
if(!me?.photonId)return{linked:false,rows:[],total:0,capped:false,limit:null};
const ent=await entitlementFor(user.id);
const filter={photonId:me.photonId,track:String(track)};
const total=await MatchLedger.countDocuments(filter);
const reach=ent.historyLimit===null?total:Math.min(total,ent.historyLimit);
if(skip>=reach)return{linked:true,rows:[],total,reach,capped:reach<total,limit:ent.historyLimit,breakdown:ent.eloBreakdown};
const found=await MatchLedger.find(filter).sort({createdAt:-1}).skip(skip).limit(Math.min(PAGE,reach-skip)).lean();
const rows=[];
for(const m of found){
let detail=null;
if(ent.eloBreakdown){
detail={ratingSystem:m.ratingSystem,teamScore:m.teamScore,score:m.score,place01:m.place01,perf01:m.perf01,tags:m.tags,survivalSeconds:m.survivalSeconds,wasInfected:Boolean(m.wasInfected),firstTagged:Boolean(m.firstTagged),leftEarly:Boolean(m.leftEarly),eventMultiplier:m.eventMultiplier||1};
if(m.ratingSystem==='ranked-performance-v1')Object.assign(detail,{expectedPerformance:Number.isFinite(m.expectedPerformance)?m.expectedPerformance:null,actualPerformance:Number.isFinite(m.actualPerformance)?m.actualPerformance:null,streakMultiplier:Number.isFinite(m.streakMultiplier)?m.streakMultiplier:1,leavePenalty:Number.isFinite(m.leavePenalty)?m.leavePenalty:0,protected:m.protected===true});
}
rows.push({teamPlacement:track==="scrim"&&m.ratingSystem==="openskill",at:m.createdAt,code:m.code,category:m.category,placement:m.placement,lobbySize:m.lobbySize,delta:m.delta,beforeElo:m.beforeElo,afterElo:m.afterElo,won:Boolean(m.isWinner),provisional:Boolean(m.provisional),detail});
}
return{linked:true,total,reach,capped:reach<total,limit:ent.historyLimit,breakdown:ent.eloBreakdown,rows};
});
