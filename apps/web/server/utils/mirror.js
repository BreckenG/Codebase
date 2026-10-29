import mongoose from"mongoose";
import{Player,PartyCommand,connectDb}from"./db";
export const MIRROR_PENALTY={min:3,max:6,def:3};
export const BUILD_STALE_MS=20*60*1000;
export const MIN_ROUNDS=20;
export async function roundsFor(photonId){
if(!photonId)return 0;
await connectDb();
return mongoose.connection.db.collection("ranked_replays").countDocuments({photonIds:photonId});
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
