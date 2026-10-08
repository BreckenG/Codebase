import{Player,connectDb}from"../utils/db";
import{replayConsent}from"../utils/replay-consent";
import{currentUser,authConfigured}from"../utils/auth";
import{planFor}from"../utils/billing";
import{POLICY_VERSION}from"../../app/utils/legal.js";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)return{user:null,plan:null,configured:authConfigured()};
await connectDb();
const profile=await Player.findOne({discordId:user.id},"username avatar acceptance.account").lean();
return{user:{id:user.id,username:profile?.username||user.username,avatar:profile?.avatar||user.avatar},plan:await planFor(user.id),configured:true,replayConsent:await replayConsent(user.id),policy:{version:POLICY_VERSION,agreed:profile?.acceptance?.account?.version===POLICY_VERSION}};
});
