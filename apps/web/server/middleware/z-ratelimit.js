import{desktopRateIdentity}from'../utils/desktop-client.js';
import{ruleLimit}from'../utils/request-limits.js';
const RULES=[{prefix:"/api/admin/",method:"POST",limit:12},{prefix:"/api/admin/",limit:30},{prefix:"/api/avatar",limit:240},{prefix:"/api/billing/webhook",limit:120},{prefix:"/api/billing/",method:"POST",limit:10},{prefix:"/api/billing/",limit:60},{prefix:"/api/me/party/search",limit:40},{prefix:"/api/me/party",limit:90},{prefix:"/api/me/practice",method:"POST",limit:12},{prefix:"/api/me/practice",limit:60},{prefix:"/api/me/connect",method:"POST",limit:6},{prefix:"/api/me/connect",method:"DELETE",limit:20},{prefix:"/api/me/connect",limit:60},{prefix:"/auth/",limit:20},{prefix:"/api/",limit:150}];
const SEARCH_LIMIT=40;
function ruleFor(path,method){
for(const r of RULES){
if(!path.startsWith(r.prefix))continue;
if(r.method&&r.method!==method)continue;
return r;
}
return null;
}
export default defineEventHandler(event=>{
if("__unenv__" in event.node.req)return;
const path=event.path||"";
if(!path.startsWith("/api/")&&!path.startsWith("/auth/"))return;
const method=event.node.req.method||"GET";
const rule=ruleFor(path,method);
if(!rule||rule.limit===0)return;
const identity=desktopRateIdentity(event);
let limit=rule.limit;
if(path.startsWith("/api/leaderboard")&&getQuery(event).q)limit=SEARCH_LIMIT;
const{retry,remaining}=ruleLimit(identity+" "+method+" "+rule.prefix,limit);
setResponseHeader(event,"X-RateLimit-Limit",String(limit));
setResponseHeader(event,"X-RateLimit-Remaining",String(remaining));
if(retry){
setResponseHeader(event,"Retry-After",String(retry));
throw createError({statusCode:429,statusMessage:"rate_limited"});
}
});
