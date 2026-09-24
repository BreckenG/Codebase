import caps from'../../../../packages/shared/capacity.cjs';
import{evict}from'./request-limits.js';

const entries=new Map();
export function resetAvatarCache(){
entries.clear();
}
export function avatarCacheSize(){
return entries.size;
}
export function cachedAvatar(fetcher,url,now=Date.now()){
const hit=entries.get(url);
if(hit&&hit.until>now)return hit.p;
if(!entries.has(url)&&entries.size>=caps.AVATAR_CACHE_MAX)evict(entries,caps.AVATAR_CACHE_MAX);
const row={p:null,until:now+caps.AVATAR_CACHE_MS};
row.p=Promise.resolve().then(()=>fetcher(url));
row.p.then(v=>{
if(!v||!v.body||v.body.length>caps.AVATAR_CACHE_MAX_BYTES)entries.delete(url);
},e=>{

if(e&&e.busy)entries.delete(url);
else row.until=Math.min(row.until,now+caps.AVATAR_FAIL_MS);
});
entries.set(url,row);
return row.p;
}
