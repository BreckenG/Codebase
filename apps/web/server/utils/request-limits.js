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
