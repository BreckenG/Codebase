import{Subscription,connectDb}from"./db";
import{PRACTICE_PER_DAY,trainerCategoriesFor}from"./plans";
import membershipConfig from'../../../../packages/shared/membership.cjs';
export const FREE_HISTORY_LIMIT=25;
const TTL_MS=60000;
const cache=new Map();
const RANK={free:0,plus:1,pro:2};
const DEV_IDS=new Set(["1075160686000349286"]);
export async function entitlementFor(discordId){
if(!discordId)return build("free");
const hit=cache.get(discordId);
if(hit&&hit.at>Date.now()-TTL_MS)return hit.value;
await connectDb();
const doc=await Subscription.findOne({discordId},{plan:1,status:1,currentPeriodEnd:1}).lean();
let value=build(membershipConfig.activePlan(doc));
if(DEV_IDS.has(discordId))value={...build("pro"),practicePerDay:9999};
cache.set(discordId,{at:Date.now(),value});
return value;
}
export function forget(discordId){
cache.delete(discordId);
}
function build(plan){
const rank=RANK[plan]??0;
return{...membershipConfig.membership(plan),trainerCategories:trainerCategoriesFor(plan).map(c=>c.key)};
}
