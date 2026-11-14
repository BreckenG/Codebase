import{COOKIE,open,clearAuthSession}from"../../utils/auth";
import{revokeSession}from"../../utils/session-store.js";
export default defineEventHandler(async event=>{
const data=open(getCookie(event,COOKIE));
clearAuthSession(event);
const revoked=data?.sid?await revokeSession(data.sid).catch(()=>false):false;
return{ok:true,revoked};
});
