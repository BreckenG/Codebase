import{POLICY_VERSION}from"../../../app/utils/legal.js";
import{authConfigured,redirectUri,setSession,OAUTH,open,cookieOptions,loginReturnPath,MAX_AGE_MS}from"../../utils/auth";
import{mintSession}from"../../utils/session-store.js";
import{WebUser,connectDb}from"../../utils/db";
function avatarUrl(u){
if(u.avatar){
const ext=u.avatar.startsWith("a_")?"gif":"png";
return"https://cdn.discordapp.com/avatars/"+u.id+"/"+u.avatar+"."+ext+"?size=128";
}
const shard=Number((BigInt(u.id)>>BigInt(22))%BigInt(6));
return"https://cdn.discordapp.com/embed/avatars/"+shard+".png";
}
export default defineEventHandler(async event=>{
if(!authConfigured())throw createError({statusCode:503,statusMessage:"Discord login is not configured yet."});
const{code,state}=getQuery(event);
const accepted=open(getCookie(event,"gtr_state"));
const expected=accepted?.state;
setCookie(event,"gtr_state","",{...cookieOptions(),maxAge:0});
if(!code||!state||state!==expected||accepted?.policyVersion!==POLICY_VERSION||!Number.isFinite(accepted?.acceptedAt))throw createError({statusCode:400,statusMessage:"Login failed. Try again."});
const config=useRuntimeConfig();
try{
const token=await $fetch(OAUTH+"/oauth2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:config.discordClientId,client_secret:config.discordClientSecret,grant_type:"authorization_code",code:String(code),redirect_uri:redirectUri()}).toString()});
const me=await $fetch(OAUTH+"/users/@me",{headers:{Authorization:"Bearer "+token.access_token}});
const username=me.global_name||me.username;
const avatar=avatarUrl(me);
await connectDb().then(()=>WebUser.updateOne({discordId:me.id},{$set:{username,avatar,updatedAt:new Date(),"acceptance.account":{version:accepted.policyVersion,at:new Date(accepted.acceptedAt)}}},{upsert:true})).catch(()=>{
throw new Error("Could not save account acceptance");
});
setSession(event,{id:me.id,username,avatar},await mintSession(me.id,Date.now()+MAX_AGE_MS));
return sendRedirect(event,loginReturnPath(accepted.returnTo)||"/me?from=login");
}catch(e){
console.error("oauth: login failed");
throw createError({statusCode:502,statusMessage:"Discord did not complete the login."});
}
});
