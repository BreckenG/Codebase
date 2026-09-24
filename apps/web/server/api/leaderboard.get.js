import{leaderboard}from"../utils/players";
import{currentUser}from"../utils/auth";
import{entitlementFor}from"../utils/entitlements";
export default defineEventHandler(async event=>{
const{track,page,per,q,category,sort,metric}=getQuery(event);
const user=currentUser(event);
const ent=user?await entitlementFor(user.id):null;
return await leaderboard({track,page,per,q,category,sort,metric,viewerId:user?.id||null,viewerIsPlus:Boolean(ent?.friendLeaderboards)});
});
