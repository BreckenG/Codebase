import{Player,connectDb}from"./db";
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
