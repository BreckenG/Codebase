import caps from'../../../../packages/shared/capacity.cjs';
const WINDOW_MS=60000;

export function evict(map,max){
const drop=Math.max(1,max>>4);
let n=0;
for(const k of map.keys()){if(n>=drop)break;map.delete(k);n++;}
return n;
}
function sweep(map,now){
for(const[k,v]of map)if(v.until<=now)map.delete(k);
}
const buckets=new Map();
let swept=0;
export function requestLimit(key,limit,now=Date.now()){
if(now-swept>=WINDOW_MS){sweep(buckets,now);swept=now;}
let entry=buckets.get(key);
if(!entry||entry.until<=now){
if(!entry&&buckets.size>=caps.LIMIT_MAP_MAX)evict(buckets,caps.LIMIT_MAP_MAX);
entry={count:0,until:now+WINDOW_MS};buckets.set(key,entry);
}
return++entry.count>limit?Math.max(1,Math.ceil((entry.until-now)/1000)):0;
}
const hits=new Map();
let hitSwept=0;

export function ruleLimit(key,limit,now=Date.now()){
if(now-hitSwept>=WINDOW_MS){sweep(hits,now);hitSwept=now;}
let bucket=hits.get(key);
if(!bucket||bucket.until<=now){
if(!bucket&&hits.size>=caps.LIMIT_MAP_MAX)evict(hits,caps.LIMIT_MAP_MAX);
bucket={until:now+WINDOW_MS,n:0};hits.set(key,bucket);
}
bucket.n++;
if(bucket.n<=limit)return{retry:0,remaining:limit-bucket.n};
return{retry:Math.max(1,Math.ceil((bucket.until-now)/1000)),remaining:0};
}
export function limiterSizes(){
return{buckets:buckets.size,hits:hits.size};
}
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
