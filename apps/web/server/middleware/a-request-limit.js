import{desktopClientIp}from'../utils/desktop-client.js';
import{requestLimit}from'../utils/request-limits.js';
export default defineEventHandler(event=>{
if('__unenv__' in event.node.req)return;
const path=event.path.split('?')[0];
if(/^\/(?:_nuxt|img|fonts|downloads)\//.test(path))return;
if(event.path.length>2048)throw createError({statusCode:414,statusMessage:'Request URL too long'});
const retry=requestLimit('ip:'+desktopClientIp(event),600);
if(retry){setResponseHeader(event,'Retry-After',String(retry));throw createError({statusCode:429,statusMessage:'Too many requests'});}
});
