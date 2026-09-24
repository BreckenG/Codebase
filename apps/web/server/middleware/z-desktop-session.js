import{deviceFlow,limitDeviceRequest}from'../utils/desktop-auth.js';
import{tokenHash}from'../utils/desktop-flow.js';
export default defineEventHandler(async event=>{
if(!event.path.startsWith('/api/'))return;
const authorization=getHeader(event,'authorization');
if(!authorization)return;
const match=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
if(!match)throw createError({statusCode:401,statusMessage:'Sign in again.'});
let session;
try{
session=await(await deviceFlow()).authenticate(match[1]);
if(session&&/^\d{17,20}$/.test(session.user?.id||''))event.context.desktopSessionKey=tokenHash(match[1]);
await limitDeviceRequest(event,'bearer',300);
}catch(error){
if(error.statusCode===429)throw error;
throw createError({statusCode:503,statusMessage:'Desktop sign in is unavailable. Try again.'});
}
if(!session||!/^\d{17,20}$/.test(session.user?.id||''))throw createError({statusCode:401,statusMessage:'Sign in again.'});
event.context.desktopUser={id:session.user.id,username:session.user.username,avatar:session.user.avatar};
event.context.desktopToken=match[1];
});
