import crypto from"node:crypto";
import{CodeSession,RankedBan,Player,connectDb}from"./db";
import caps from"../../../../packages/shared/capacity.cjs";
const TTL_MS=caps.CONNECT_TTL_MS;
const ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const held=new Set();
function dayKey(now){
return new Date(now).toISOString().slice(0,10);
}

function charge(discordId,day){
return Player.updateOne({discordId},[{$set:{connectUsage:{day,n:{$cond:[{$eq:["$connectUsage.day",day]},{$add:[{$ifNull:["$connectUsage.n",0]},1]},1]}}}}]);
}
function pickCode(taken){
for(let i=0;i<8;i++){
let code="C";
for(let j=0;j<4;j++)code+=ALPHABET[crypto.randomInt(0,ALPHABET.length)];
if(!taken.has(code))return code;
}
throw createError({statusCode:503,statusMessage:"No connect code free right now"});
}
async function banned(discordId){
const p=await Player.findOne({discordId},"photonId").lean();
const or=[{discordId}];
if(p)or.push({photonId:p.photonId});
return Boolean(await RankedBan.exists({active:true,$or:or}));
}
async function shape(row){
if(!row)return{code:null,live:false,expiresAt:null};
const session=await CodeSession.exists({code:row.code,active:true});
return{code:row.code,live:Boolean(session),expiresAt:row.expiresAt};
}
export async function connectState(discordId){
await connectDb();
const profile=await Player.findOne({discordId,"connectCode.expiresAt":{$gt:new Date()}},"connectCode").lean();
return shape(profile?.connectCode);
}
export async function startConnect(discordId){
await connectDb();
if(held.has(discordId))throw createError({statusCode:429,statusMessage:"Your connect code is already starting."});
if(await banned(discordId))throw createError({statusCode:403,statusMessage:"You cannot connect while rank banned"});
const now=Date.now();
const day=dayKey(now);
const me=await Player.findOne({discordId},"connectCode connectUsage").lean();
const mine=me?.connectCode;
const live=mine&&new Date(mine.expiresAt).getTime()>now?mine:null;
const usedToday=me?.connectUsage?.day===day?Number(me.connectUsage.n)||0:0;
const rows=await Player.find({"connectCode.expiresAt":{$gt:new Date(now)}},"discordId connectCode").lean();
const others=rows.filter(r=>r.discordId!==discordId);
const verdict=caps.connectVerdict({live,globalLive:others.length+held.size,usedToday},now);
if(!verdict.ok){
let message=verdict.message;
if(verdict.reason==="full"){

const soonest=others.length?Math.min(...others.map(r=>new Date(r.connectCode.expiresAt).getTime())):0;
message=caps.connectFullMessage(soonest?Math.ceil((soonest-now)/1000):0);
}
throw createError({statusCode:verdict.status,statusMessage:message});
}
if(verdict.reuse)return shape(live);
held.add(discordId);
try{
const sessions=await CodeSession.find({active:true},"code").lean();
const taken=new Set();
for(const r of rows)taken.add(r.connectCode.code);
for(const s of sessions)taken.add(s.code);
const code=pickCode(taken);
const row={code,createdAt:new Date(now),expiresAt:new Date(now+TTL_MS)};
await Player.updateOne({discordId},{$set:{connectCode:row}},{upsert:true});
await charge(discordId,day);
return shape(row);
}finally{
held.delete(discordId);
}
}
export async function disconnectAccount(discordId){
await connectDb();
await Player.updateOne({discordId},{$unset:{connectCode:""}});
const res=await Player.updateOne({discordId,linked:true},{$set:{linked:false,rolesDirty:discordId}});
return{disconnected:res.modifiedCount>0};
}
export async function cancelConnect(discordId){
await connectDb();
await Player.updateOne({discordId},{$unset:{connectCode:""}});
return{code:null,live:false,expiresAt:null};
}
