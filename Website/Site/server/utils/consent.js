import{acceptsPolicy,knownPolicy,POLICY_VERSION}from'../../app/utils/legal.js';
import{WebUser,connectDb}from'./db';
import{Player}from"./db";
export function requireAcceptance(body){
if(!acceptsPolicy(body))throw createError({statusCode:400,statusMessage:'Please review and accept the current terms before continuing.'});
}
export async function recordAcceptance(discordId,purpose,seen){
const version=knownPolicy(seen)?seen:POLICY_VERSION;
await connectDb();
await WebUser.updateOne({discordId},{$set:{[`acceptance.${purpose}`]:{version,at:new Date()}}},{upsert:true});
}
export const REPLAY_VERSION="2026-09-12";
const scopes=["scrims","practice","ai_trainer","mirror"];
export async function replayConsent(discordId){
await connectDb();
const profile=await Player.findOne({discordId},"acceptance.replays").lean();
const value=profile?.acceptance?.replays;
return{accepted:value?.version===REPLAY_VERSION&&Boolean(value.at)&&!value.revokedAt,version:REPLAY_VERSION,acceptedAt:value?.at||null,scopes};
}
export async function requireReplayConsent(discordId){
if(!(await replayConsent(discordId)).accepted)throw createError({statusCode:403,statusMessage:"Accept movement replay collection for AI training before playing this mode",data:{code:"REPLAY_CONSENT_REQUIRED"}});
}
