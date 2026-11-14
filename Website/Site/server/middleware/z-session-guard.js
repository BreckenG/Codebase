import{COOKIE,open,seal,cookieOptions}from'../utils/auth.js';
import{sessionLive,legacyAllowed,mintSession}from'../utils/session-store.js';
export default defineEventHandler(async event=>{
if(!event.path.startsWith('/api/'))return;
const data=open(getCookie(event,COOKIE));
if(!data||!/^\d{17,20}$/.test(data.id||''))return;
if(data.sid!==undefined){
if(!await sessionLive(data.sid))event.context.sessionRevoked=true;
return;
}
if(!await legacyAllowed(data.id,data.exp)){
event.context.sessionRevoked=true;
return;
}

if('__unenv__' in event.node.req)return;
const sid=await mintSession(data.id,data.exp).catch(()=>null);
if(!sid)return;
setCookie(event,COOKIE,seal({...data,sid}),{...cookieOptions(),maxAge:Math.max(1,Math.floor((data.exp-Date.now())/1000))});
});
