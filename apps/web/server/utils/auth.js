import crypto from"node:crypto";
export { loginReturnPath } from '../../app/utils/login-return.js';
export const COOKIE="gtr_session";
export const MAX_AGE_MS=7*24*60*60*1000;
export const OAUTH="https://discord.com/api/v10";
function secret(){
return useRuntimeConfig().sessionSecret;
}
export function authConfigured(){
const c=useRuntimeConfig();
return Boolean(c.discordClientId&&c.discordClientSecret&&c.sessionSecret);
}
function sign(value){
return crypto.createHmac("sha256",secret()).update(value).digest("base64url");
}
export function seal(payload){
const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
return body+"."+sign(body);
}
export function open(raw){
if(typeof raw!=="string"||raw.length>4096||!secret())return null;
const parts=String(raw).split(".");
const body=parts[0];
const mac=parts[1];
if(parts.length!==2||!body||!mac)return null;
const a=Buffer.from(mac);
const b=Buffer.from(sign(body));
if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
try{
const data=JSON.parse(Buffer.from(body,"base64url").toString());
if(!data||typeof data!=="object"||!Number.isSafeInteger(data.exp)||data.exp<Date.now()||data.exp>Date.now()+MAX_AGE_MS)return null;
return data;
}catch{
return null;
}
}
export function cookieUser(event){
if(event?.context?.sessionRevoked)return null;
const user=open(getCookie(event,COOKIE));
return user&&typeof user.id==="string"&&/^\d{17,20}$/.test(user.id)?user:null;
}
export function currentUser(event){
return event.context?.desktopUser||cookieUser(event);
}
export function launcherReturnPath(value){
return typeof value==='string'&&/^\/launcher\/connect\?code=[A-HJ-NP-Z2-9]{8}$/.test(value)?value:null;
}
export function cookieOptions(){
return{path:"/",httpOnly:true,sameSite:"lax",secure:new URL(useRuntimeConfig().public.baseUrl).protocol==="https:"};
}
export function setSession(event,user,sid){
const payload={...user,sid,exp:Date.now()+MAX_AGE_MS};
setCookie(event,COOKIE,seal(payload),{...cookieOptions(),maxAge:MAX_AGE_MS/1000});
}
export function clearAuthSession(event){
setCookie(event,COOKIE,"",{...cookieOptions(),maxAge:0});
}
export function redirectUri(){
return useRuntimeConfig().public.baseUrl+"/auth/callback";
}
export function requireUser(event){
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"sign_in_required"});
return user;
}
