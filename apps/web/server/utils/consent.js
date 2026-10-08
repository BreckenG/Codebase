import{acceptsPolicy,knownPolicy,POLICY_VERSION}from'../../app/utils/legal.js';
import{WebUser,connectDb}from'./db';
export function requireAcceptance(body){
if(!acceptsPolicy(body))throw createError({statusCode:400,statusMessage:'Please review and accept the current terms before continuing.'});
}
export async function recordAcceptance(discordId,purpose,seen){
const version=knownPolicy(seen)?seen:POLICY_VERSION;
await connectDb();
await WebUser.updateOne({discordId},{$set:{[`acceptance.${purpose}`]:{version,at:new Date()}}},{upsert:true});
}
