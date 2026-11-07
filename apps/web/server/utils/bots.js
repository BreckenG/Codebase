import bots from"../../../../packages/shared/bots.cjs";
import{currentUser}from"./auth";
import mongoose from"mongoose";
import{Player,PartyCommand,PracticeSession,connectDb}from"./db";
export function requireBots(event){
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"sign_in_required"});
if(!bots.botsAllowed(user.id))throw createError({statusCode:403,statusMessage:bots.CLOSED});
return user;
}
export const botsOpenFor=user=>bots.botsAllowed(user?.id);
export const MIRROR_PENALTY={min:3,max:6,def:3};
export const BUILD_STALE_MS=20*60*1000;
export const MIN_ROUNDS=20;
export const ROUNDS_FROM=new Date(process.env.MIRROR_ARCHIVE_FROM||"2026-10-28T00:00:00Z");
export const ROUNDS_FROM_TEXT=ROUNDS_FROM.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
const RECENT_MS=600000;
export const recentSince=()=>new Date(Date.now()-RECENT_MS);
export function sessionView(s){
if(!s)return null;
const log=Array.isArray(s.log)?s.log.filter(line=>typeof line==="string"):[];
const present=typeof s.present==="boolean"?s.present:null;
return{code:s.code,startedAt:s.startedAt,difficulty:s.difficulty,phase:s.phase,points:s.points||[0,0],mode:s.mode||"practice",target:s.mirror?.name||null,self:Boolean(s.mirror?.self),role:s.role||null,present,log};
}
export function lastView(s){
if(!s)return null;
return{code:s.code,mode:s.mode||"practice",target:s.mirror?.name||null,outcome:s.outcome||null,points:s.points||[0,0],phase:s.phase||null,endedAt:s.endedAt};
}
export function lastSession(userId){
return PracticeSession.findOne({userId,state:"ended",endedAt:{$gte:recentSince()}}).sort({endedAt:-1}).lean();
}
export async function roundsFor(photonId){
if(!photonId)return 0;
await connectDb();
return mongoose.connection.db.collection("match_ledger").countDocuments({photonId,track:"ranked",createdAt:{$gte:ROUNDS_FROM}});
}
export function clampPenalty(v){
const n=Math.round(Number(v));
return Number.isFinite(n)?Math.min(MIRROR_PENALTY.max,Math.max(MIRROR_PENALTY.min,n)):MIRROR_PENALTY.def;
}
export function mirrorStats(bot){
if(!bot||bot.status!=="ready"||!bot.stats)return null;
const s=bot.stats;
return{hours:s.hours,rounds:s.rounds,heldRounds:s.heldRounds,cells:s.cells,ownShare:s.ownShare,heldInOwn:s.heldInOwn,floor:s.floor,floorSd:s.floorSd};
}
export function isPublic(p){
return Boolean(p?.mirrorPublic?.at&&!p.mirrorPublic.removedAt);
}
export async function publicMirrors(){
await connectDb();
return Player.find({"mirrorPublic.at":{$ne:null},"mirrorPublic.removedAt":null,"mirrorBot.status":"ready"},{photonId:1,name:1,username:1,gorillaColor:1,cosmetics:1,mirrorBot:1,mirrorPublic:1}).sort({"mirrorPublic.at":-1}).lean();
}
export async function queueCommand(userId,action,arg){
await PartyCommand.deleteMany({userId,state:{$ne:"pending"}});
const already=await PartyCommand.countDocuments({userId,state:"pending"});
if(already>=3)throw createError({statusCode:429,statusMessage:"Still applying the last one"});
await PartyCommand.create({userId,action,arg});
}
