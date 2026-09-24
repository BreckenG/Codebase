import{requireReplayConsent}from"./replay-consent";
import{searchDiscordMembers}from"./roles";
import{Party,PartyCommand,ScrimMatch,Player,WebUser,connectDb}from"./db";
import{tierForElo}from"@ranked-world/ranks";
export const SIZES=["4v4"];
export const MAX_PARTY=4;
const ACTIONS=["invite","accept","decline","leave","kick","ready","size","play","cancel"];
const SNOWFLAKE=/^\d{17,20}$/;
export async function partyState(discordId){
await connectDb();
const[party,match]=await Promise.all([Party.findOne({members:discordId}).lean(),ScrimMatch.findOne({state:{$ne:"ended"},$or:[{team1:discordId},{team2:discordId}]}).lean()]);
const invitedBy=await Party.find({"invites.toId":discordId},{leaderId:1}).lean();
const ids=new Set();
ids.add(discordId);
for(const id of party?.members||[])ids.add(id);
for(const p of invitedBy)ids.add(p.leaderId);
const players=await Player.find({discordId:{$in:[...ids]},linked:true},{discordId:1,name:1,ranked:1}).lean();
const byId=new Map();
for(const p of players)byId.set(p.discordId,p);
const webUsers=await WebUser.find({discordId:{$in:[...ids]}},{discordId:1,avatar:1}).lean();
const avatars=new Map(webUsers.map(w=>[w.discordId,w.avatar||""]));
function shape(id){
const p=byId.get(id);
let rank=null;
if(p)rank=tierForElo(p.ranked?.elo||0).name;
return{discordId:id,name:p?.name||(p?"Connected player":"Disconnected"),rank,avatar:avatars.get(id)||""};
}
const pending=await PartyCommand.find({userId:discordId,state:"pending"}).countDocuments();
const failed=await PartyCommand.findOne({userId:discordId,state:"failed"}).sort({createdAt:-1}).lean();
let mine;
if(party){
const members=[];
for(const id of party.members||[]){
members.push({...shape(id),leader:id===party.leaderId,you:id===discordId,ready:(party.ready||[]).includes(id)});
}
mine={leaderId:party.leaderId,youLead:party.leaderId===discordId,size:party.size||"4v4",queuedAt:party.queuedAt?new Date(party.queuedAt).getTime():0,members};
}else{
mine={leaderId:discordId,youLead:true,size:"4v4",queuedAt:0,members:[{...shape(discordId),leader:true,you:true,ready:false}]};
}
const invites=[];
for(const p of invitedBy)invites.push(shape(p.leaderId));
let live=null;
if(match)live={matchId:match.matchId,code:match.code,size:match.size,state:match.state};
return{sizes:SIZES,maxParty:MAX_PARTY,party:mine,invites,match:live,pending,error:failed?.error||null};
}
export async function sendCommand(discordId,action,arg){
await connectDb();
if(["accept","ready","play"].includes(action))await requireReplayConsent(discordId);
if(!ACTIONS.includes(action))throw createError({statusCode:400,statusMessage:"Unknown action"});
if(["invite","accept","decline","kick"].includes(action)&&!SNOWFLAKE.test(String(arg||"")))throw createError({statusCode:400,statusMessage:"That is not a Discord id"});
if(action==="size"&&!SIZES.includes(arg))throw createError({statusCode:400,statusMessage:"Unknown size"});
await PartyCommand.deleteMany({userId:discordId,state:{$ne:"pending"}});
const already=await PartyCommand.countDocuments({userId:discordId,state:"pending"});
if(already>=3)throw createError({statusCode:429,statusMessage:"Still applying the last one"});
await PartyCommand.create({userId:discordId,action,arg:arg||null});
return{queued:true};
}
export async function searchInvitees(viewerId,q){
await connectDb();
const term=String(q||"").trim().replace(/^@/,"").slice(0,40);
if(term.length<2)return[];
const mine=await Party.findOne({members:viewerId},{members:1}).lean();
const skip=new Set();
skip.add(viewerId);
for(const id of mine?.members||[])skip.add(id);
if(SNOWFLAKE.test(term)){
if(skip.has(term))return[];
const p=await Player.findOne({discordId:term,linked:true},{discordId:1,name:1,ranked:1}).lean();
if(!p)return[{discordId:term,name:null,username:null,rank:null}];
return[shapeHit(p,null)];
}
const re=new RegExp(term.replace(/[.*+?^${}()|[\]\\-]/g,"\\$&"),"i");
let discordError;
const[named,members]=await Promise.all([WebUser.find({username:re},{discordId:1,username:1,avatar:1}).limit(100).lean(),searchDiscordMembers(term,viewerId).catch(error=>{discordError=error;return[]})]);
const byDiscord=new Map();
const avatars=new Map();
for(const u of named){
byDiscord.set(u.discordId,u.username);
avatars.set(u.discordId,u.avatar||"");
}
for(const {user:u} of members){
byDiscord.set(u.id,u.username);
if(u.avatar)avatars.set(u.id,`https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_")?"gif":"png"}?size=128`);
}
const players=await Player.find({linked:true,discordId:{$ne:null,$nin:[...skip]},$or:[{name:re},{discordId:{$in:[...byDiscord.keys()]}}]},{discordId:1,name:1,ranked:1}).limit(20).lean();
const hits=[];
for(const p of players){
if(skip.has(p.discordId))continue;
if(hits.length>=8)break;
hits.push(shapeHit(p,byDiscord.get(p.discordId)||null,avatars.get(p.discordId)));
}
if(!hits.length&&discordError)throw createError({statusCode:503,statusMessage:"Discord name search is unavailable. Try their Gorilla Tag name or Discord user ID."});
return hits;
}
function shapeHit(p,username,avatar){
return{discordId:p.discordId,name:p.name||null,username:username||null,rank:tierForElo(p.ranked?.elo||0).name,avatar:avatar||""};
}
