import crypto from'node:crypto';
import{authConfigured,redirectUri,seal,cookieOptions,loginReturnPath}from'../../utils/auth';
import{POLICY_VERSION}from'../../../app/utils/legal.js';
export default defineEventHandler(async event=>{
const body=await readBody(event);
if(body?.accepted!=='yes'||body?.policyVersion!==POLICY_VERSION){
throw createError({statusCode:400,statusMessage:'Review the terms and confirm the age requirements before signing in.'});
}
if(!authConfigured())throw createError({statusCode:503,statusMessage:'Discord login is not configured yet.'});
const state=crypto.randomBytes(16).toString('hex');
setCookie(event,'gtr_state',seal({state,returnTo:loginReturnPath(body?.returnTo),policyVersion:POLICY_VERSION,acceptedAt:Date.now(),exp:Date.now()+600000}),{...cookieOptions(),maxAge:600});
const query=new URLSearchParams({client_id:useRuntimeConfig().discordClientId,redirect_uri:redirectUri(),response_type:'code',scope:'identify',state,prompt:'none'});
return sendRedirect(event,'https://discord.com/oauth2/authorize?'+query,303);
});
