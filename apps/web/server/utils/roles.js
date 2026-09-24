import{cachedMemberSearch}from"./search-cache.js";
const API="https://discord.com/api/v10";
export const GUILD_ID="1076000755867205713";
export const PLAN_ROLES={plus:"1550957384883634195",pro:"1550957353388474378"};
function rolesConfigured(){
return Boolean(useRuntimeConfig().discordBotToken);
}
function auth(){
return{Authorization:"Bot "+useRuntimeConfig().discordBotToken};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(method,path,attempt=0){
try{
await $fetch(API+path,{method,headers:auth()});
return true;
}catch(e){
const status=e?.response?.status||e?.statusCode;
if(status===404)return false;
if(status===429&&attempt<4){
let ra=e?.data?.retry_after;
if(ra==null)ra=e?.response?._data?.retry_after;
if(ra==null)ra=1;
await sleep(Math.min(10000,Math.max(1000,Number(ra)*1000+250)));
return call(method,path,attempt+1);
}
console.error("roles:",method,path,status||e.message);
return false;
}
}
export async function syncPlanRole(discordId,plan){
if(!rolesConfigured()||!discordId)return;
const wanted=PLAN_ROLES[plan]||null;
for(const key in PLAN_ROLES){
const roleId=PLAN_ROLES[key];
if(roleId===wanted)continue;
await call("DELETE",`/guilds/${GUILD_ID}/members/${discordId}/roles/${roleId}`);
}
if(wanted)await call("PUT",`/guilds/${GUILD_ID}/members/${discordId}/roles/${wanted}`);
}

export async function searchDiscordMembers(query,viewerId){
if(!rolesConfigured())throw new Error("Discord is not configured");
return await cachedMemberSearch(q=>$fetch(`${API}/guilds/${GUILD_ID}/members/search`,{headers:auth(),query:{query:q,limit:100},timeout:5000,retry:0}),query,viewerId);
}
