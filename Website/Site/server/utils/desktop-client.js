import{isIP}from'node:net';
function normalizeIp(value){
if(typeof value!=='string')return null;
const ip=value.trim();
if(isIP(ip)===4)return ip;
if(isIP(ip)!==6)return null;
const canonical=new URL('http://['+ip+']').hostname.slice(1,-1);
if(canonical.startsWith('::ffff:')){
const parts=canonical.slice(7).split(':');
if(parts.length===2){
const high=parseInt(parts[0],16);
const low=parseInt(parts[1],16);
return[high>>8,high&255,low>>8,low&255].join('.');
}
}
return canonical;
}
export function desktopClientIp(event,configured=process.env.RANKED_TRUSTED_PROXY_IPS||''){
const socket=normalizeIp(event.node?.req?.socket?.remoteAddress);
if(!socket)return'unknown';
const trusted=new Set(configured.split(',').map(normalizeIp).filter(Boolean));
if(!trusted.has(socket))return socket;
const forwarded=event.node?.req?.headers?.['x-forwarded-for'];
if(typeof forwarded!=='string'||forwarded.length>2048)return socket;
const chain=forwarded.split(',').map(normalizeIp);
if(!chain.length||chain.length>20||chain.some(ip=>!ip))return socket;
let current=socket;
for(let i=chain.length-1;i>=0&&trusted.has(current);i--)current=chain[i];
return current;
}
export function desktopRateIdentity(event){
const session=event.context?.desktopSessionKey;
return typeof session==='string'&&/^[a-f0-9]{64}$/.test(session)?'session:'+session:'ip:'+desktopClientIp(event);
}
