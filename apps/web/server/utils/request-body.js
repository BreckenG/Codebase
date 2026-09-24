export async function boundRequestBody(event,max){
const req=event.node.req;
if(Number(getHeader(event,'content-length'))>max)throw createError({statusCode:413,statusMessage:'Request too large'});
if(event._requestBody||req.rawBody||req.body||req[Symbol.for('h3RawBody')]){
const body=await readRawBody(event,false);
if(body?.length>max)throw createError({statusCode:413,statusMessage:'Request too large'});
return;
}
if(!getHeader(event,'content-length')&&!getHeader(event,'transfer-encoding'))return;
const body=await new Promise((resolve,reject)=>{
const chunks=[];let size=0;
const timer=setTimeout(()=>fail(408,'Request timed out'),10000);
timer.unref?.();
const cleanup=()=>{clearTimeout(timer);req.removeListener('data',data);req.removeListener('end',end);req.removeListener('error',error);req.removeListener('aborted',aborted);};
const fail=(statusCode,statusMessage)=>{cleanup();req.pause();setResponseHeader(event,'Connection','close');reject(createError({statusCode,statusMessage}));};
const data=chunk=>{size+=chunk.length;if(size>max)return fail(413,'Request too large');chunks.push(chunk);};
const end=()=>{cleanup();resolve(Buffer.concat(chunks));};
const error=()=>fail(400,'Invalid request');
const aborted=()=>fail(400,'Request interrupted');
req.on('data',data).on('end',end).on('error',error).on('aborted',aborted);
});
req[Symbol.for('h3RawBody')]=body;
}
