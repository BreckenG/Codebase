import{discordAvatarUrl}from'../../app/utils/avatar.js';
import{cachedAvatar}from'../utils/avatar-cache.js';
let active=0;
async function pull(url){
if(active>=16)throw Object.assign(createError({statusCode:503,statusMessage:'Avatar busy'}),{busy:true});
active++;
let reader;
try{
const result=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(5000)});
const type=result.headers.get('content-type')?.split(';')[0];
if(!result.ok||!['image/png','image/gif','image/webp'].includes(type)||Number(result.headers.get('content-length'))>2097152)throw new Error('Invalid image');
reader=result.body.getReader();
const chunks=[];let size=0;
for(;;){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>2097152)throw new Error('Invalid image');chunks.push(Buffer.from(value));}
return{type,body:Buffer.concat(chunks)};
}finally{active--;await reader?.cancel().catch(()=>{});}
}
export default defineEventHandler(async event=>{
const url=discordAvatarUrl(getQuery(event).src);
if(!url)throw createError({statusCode:400,statusMessage:'Invalid avatar'});
let image;
try{
image=await cachedAvatar(pull,url);
}catch(e){
if(e?.statusCode===503){setResponseHeader(event,'Retry-After','2');throw e;}
throw createError({statusCode:502,statusMessage:'Avatar unavailable'});
}
setResponseHeader(event,'Content-Type',image.type);
setResponseHeader(event,'Cache-Control','private, max-age=3600');
return image.body;
});
