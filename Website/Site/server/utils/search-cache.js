import caps from'../../../../packages/shared/capacity.cjs';
import{evict}from'./request-limits.js';

const entries=new Map();
const accounts=new Map();
const WINDOW_MS=60000;
let world={until:0,n:0};
function take(window,limit,now){
if(window.until<=now){window.until=now+WINDOW_MS;window.n=0;}
if(window.n>=limit)return false;
window.n++;
return true;
}
function accountWindow(viewerId,now){
const key=String(viewerId||"-");
let w=accounts.get(key);
if(!w){
if(accounts.size>=caps.SEARCH_CACHE_MAX)evict(accounts,caps.SEARCH_CACHE_MAX);
w={until:0,n:0};
accounts.set(key,w);
}
return w;
}
export function resetSearchCache(){
entries.clear();
accounts.clear();
world={until:0,n:0};
}
export function searchCacheSizes(){
return{terms:entries.size,accounts:accounts.size};
}

export function cachedMemberSearch(fetcher,term,viewerId,now=Date.now()){
const key=String(term||"").toLowerCase();
const hit=entries.get(key);
if(hit&&hit.until>now)return hit.p;
if(!take(accountWindow(viewerId,now),caps.SEARCH_PER_ACCOUNT_PER_MIN,now))return Promise.resolve([]);
if(!take(world,caps.SEARCH_GLOBAL_PER_MIN,now))return Promise.resolve([]);
if(!entries.has(key)&&entries.size>=caps.SEARCH_CACHE_MAX)evict(entries,caps.SEARCH_CACHE_MAX);
const row={p:null,until:now+caps.SEARCH_CACHE_MS};
row.p=Promise.resolve().then(()=>fetcher(term));
row.p.then(()=>{},()=>{row.until=Math.min(row.until,now+caps.SEARCH_FAIL_MS);});
entries.set(key,row);
return row.p;
}
