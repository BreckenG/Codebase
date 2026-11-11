import{boundRequestBody}from'../utils/request-limits.js';
export default defineEventHandler(async event=>{
setResponseHeader(event,'Referrer-Policy','same-origin');
setResponseHeader(event,'X-Content-Type-Options','nosniff');
setResponseHeader(event,'X-Frame-Options','DENY');
setResponseHeader(event,'Permissions-Policy','camera=(), microphone=(), geolocation=()');
setResponseHeader(event,'Content-Security-Policy',"base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://discord.com");
const site=new URL(useRuntimeConfig().public.baseUrl);
if(site.protocol==='https:')setResponseHeader(event,'Strict-Transport-Security','max-age=31536000');
const path=event.path.split('?')[0];
if(path.startsWith('/api/')||path.startsWith('/auth'))setResponseHeader(event,'Cache-Control','private, no-store');
if(!['POST','PUT','PATCH','DELETE'].includes(event.method))return;
if(path==='/api/billing/webhook'){await boundRequestBody(event,1048576);return;}
if(!path.startsWith('/api/')&&!path.startsWith('/auth/'))return;
if(path.startsWith('/api/staff/')){await boundRequestBody(event,32768);return;}
const expected=site.origin;
if(getHeader(event,'origin')!==expected)throw createError({statusCode:403,statusMessage:'This action must come from the Ranked World website.'});
await boundRequestBody(event,32768);
});
