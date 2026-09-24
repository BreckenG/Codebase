import{boundRequestBody}from'../utils/request-body.js';
export default defineEventHandler(async event=>{
setResponseHeader(event,'Referrer-Policy','same-origin');
setResponseHeader(event,'X-Content-Type-Options','nosniff');
setResponseHeader(event,'X-Frame-Options','DENY');
setResponseHeader(event,'Permissions-Policy','camera=(), microphone=(), geolocation=()');
setResponseHeader(event,'Content-Security-Policy',"base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://discord.com");
const path=event.path.split('?')[0];
if(path.startsWith('/api/')||path.startsWith('/auth'))setResponseHeader(event,'Cache-Control','private, no-store');
if(!['POST','PUT','PATCH','DELETE'].includes(event.method))return;
if(path==='/api/billing/webhook'){await boundRequestBody(event,1048576);return;}
if(!path.startsWith('/api/')&&!path.startsWith('/auth/'))return;
const expected=new URL(useRuntimeConfig().public.baseUrl).origin;
if(getHeader(event,'origin')!==expected)throw createError({statusCode:403,statusMessage:'This action must come from the Ranked World website.'});
await boundRequestBody(event,32768);
});
