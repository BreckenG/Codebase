import{requireUser}from'../../utils/auth';
import{entitlementFor}from'../../utils/entitlements';
import{Player,RankedBan,CodePlan,connectDb}from'../../utils/db';
export default defineEventHandler(async event=>{
const user=requireUser(event),ent=await entitlementFor(user.id);
setResponseHeader(event,'Cache-Control','private, no-store');
if(!ent.earlyCodes)return{available:false,codes:[]};
await connectDb();
const player=await Player.findOne({discordId:user.id,linked:true}).lean();
if(!player)return{available:true,codes:[]};
const banned=await RankedBan.exists({active:true,$and:[{$or:[{discordId:user.id},{photonId:player.photonId}]},{$or:[{expiresAt:null},{expiresAt:{$gt:new Date()}}]}]});
if(banned)return{available:true,codes:[]};
const now=Date.now();
const plans=await CodePlan.find({category:player.ranked.category,status:{$in:['reserved','rotating']},rotateAt:{$lte:new Date(now+900000)}},'nextCode sourceCode category rotateAt').sort({rotateAt:1}).limit(5).lean();
return{available:true,codes:plans.map(p=>({code:p.nextCode,replaces:p.sourceCode,category:p.category,scheduledAt:p.rotateAt,delayed:new Date(p.rotateAt).getTime()<=now}))};
});
