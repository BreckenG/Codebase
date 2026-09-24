import Stripe from"stripe";
import*as plans from"./plans";
import{Subscription,connectDb}from"./db";
import{syncPlanRole}from"./roles";
import{forget,entitlementFor}from"./entitlements";
import{notify}from'./notifications';
let client=null;
export function stripe(){
const key=useRuntimeConfig().stripeSecretKey;
if(!key)return null;
if(!client)client=new Stripe(key);
return client;
}
export function billingConfigured(){
const c=useRuntimeConfig();
return Boolean(c.stripeSecretKey&&c.public.stripePublishableKey);
}
export function salesConfigured(){
return billingConfigured()&&useRuntimeConfig().paidSalesEnabled===true;
}
export function requireSales(){
if(!salesConfigured())throw createError({statusCode:503,statusMessage:"Paid subscriptions are not available yet."});
}
export function requireBilling(){
if(!billingConfigured())throw createError({statusCode:503,statusMessage:"billing_not_configured"});
}
let prices=null;
async function priceIds(){
if(prices)return prices;
const keys=[];
for(const t of plans.TIERS){
for(const i of plans.INTERVALS)keys.push(plans.lookupKey(t.key,i.key));
}
const found=await stripe().prices.list({lookup_keys:keys,active:true,limit:100});
prices={};
for(const price of found.data){
if(price.lookup_key)prices[price.lookup_key]=price.id;
}
return prices;
}
export async function priceFor(tierKey,intervalKey){
const key=plans.lookupKey(tierKey,intervalKey);
const ids=await priceIds();
if(!ids[key]){
prices=null;
throw new Error(`no Stripe price for ${key}. Run: pnpm stripe:setup`);
}
return ids[key];
}
async function record(discordId){
await connectDb();
let doc=await Subscription.findOne({discordId});
if(!doc)doc=await Subscription.create({discordId});
return doc;
}
export async function customerFor(user){
await connectDb();
let doc;
try{doc=await Subscription.findOneAndUpdate({discordId:user.id},{$setOnInsert:{discordId:user.id}},{upsert:true,new:true});}
catch(error){if(error.code!==11000)throw error;doc=await Subscription.findOne({discordId:user.id});}
if(doc.stripeCustomerId)return doc.stripeCustomerId;
const customer=await stripe().customers.create({metadata:{discordId:user.id}},{idempotencyKey:`customer:${user.id}`});
const updated=await Subscription.findOneAndUpdate({discordId:user.id,$or:[{stripeCustomerId:{$exists:false}},{stripeCustomerId:null},{stripeCustomerId:''}]},{$set:{stripeCustomerId:customer.id,updatedAt:new Date()}},{new:true});
return updated?.stripeCustomerId||(await Subscription.findOne({discordId:user.id})).stripeCustomerId;
}
export async function savedCards(customerId){
const list=await stripe().paymentMethods.list({customer:customerId,type:"card",limit:10});
const out=[];
for(const pm of list.data){
out.push({id:pm.id,brand:pm.card?.brand||"card",last4:pm.card?.last4||"",expMonth:pm.card?.exp_month||null,expYear:pm.card?.exp_year||null});
}
return out;
}
export async function quote(customerId,tierKey,intervalKey,referral=null){
const tier=plans.tier(tierKey);
const interval=plans.interval(intervalKey);
const subtotal=tier.amounts[interval.key];
try{
const preview=await stripe().invoices.createPreview({customer:customerId,automatic_tax:{enabled:true},...(referral?{discounts:[{coupon:referral.couponId}]}:{}),subscription_details:{items:[{price:await priceFor(tierKey,intervalKey),quantity:1}]}});
let tax=0;
for(const t of preview.total_taxes||[])tax+=t.amount||0;
return{subtotal:preview.subtotal??subtotal,tax,total:preview.total??subtotal,taxKnown:true};
}catch{
return{subtotal,tax:0,total:subtotal-Math.round(subtotal*(referral?.percent||0)/100),taxKnown:false};
}
}
function planFromSubscription(sub){
const key=sub.items?.data?.[0]?.price?.lookup_key||"";
const match=/^rw_([a-z]+)_([a-z]+)$/.exec(key);
if(!match)return{plan:null,interval:null};
return{plan:match[1],interval:match[2]};
}
const LIVE=new Set(["active","trialing","past_due"]);
export async function applySubscription(sub){
await connectDb();
const customerId=typeof sub.customer==="string"?sub.customer:sub.customer?.id;
const doc=await Subscription.findOne({stripeCustomerId:customerId});
if(!doc){
console.error("billing: paid but no record",customerId,sub.id,sub.status);
return;
}
const{plan,interval}=planFromSubscription(sub);
const live=LIVE.has(sub.status);
if(!live&&doc.stripeSubscriptionId&&doc.stripeSubscriptionId!==sub.id&&LIVE.has(doc.status))return;
const wasLive=LIVE.has(doc.status);
const periodEnd=sub.items?.data?.[0]?.current_period_end||sub.current_period_end||null;
doc.stripeSubscriptionId=sub.id;
doc.plan=live&&plan?plan:"free";
doc.interval=live?interval:null;
doc.status=sub.status;
doc.currentPeriodEnd=periodEnd?new Date(periodEnd*1000):null;
doc.cancelAtPeriodEnd=Boolean(sub.cancel_at_period_end);
if(doc.pendingPlan&&doc.pendingPlan===doc.plan&&doc.pendingInterval===doc.interval){
doc.pendingPlan=null;
doc.pendingInterval=null;
doc.stripeScheduleId=null;
}
doc.updatedAt=new Date();
await doc.save();
forget(doc.discordId);
if(['active','trialing'].includes(sub.status))await notify(doc.discordId,`subscription:${sub.id}:${plan}`,'subscription_purchased',`${plan==='pro'?'Pro':'Plus'} membership active`,'Your membership benefits are ready.','/subscribe');
if(wasLive&&['canceled','unpaid','incomplete_expired'].includes(sub.status))await notify(doc.discordId,`subscription-ended:${sub.id}`,'subscription_expired','Membership ended','Your account is now on Free. Your profile and stats are still saved.','/subscribe');
if(sub.status==='past_due')await notify(doc.discordId,`payment-due:${sub.id}:${periodEnd}`,'payment_failed','Subscription payment needs attention','Check your payment method to keep your membership active.','/settings#membership');
await syncPlanRole(doc.discordId,doc.plan).catch(e=>console.error("roles:",e.message));
}
const TIER_RANK={free:0,plus:1,pro:2};
export async function activeSubscription(customerId){
const list=await stripe().subscriptions.list({customer:customerId,status:"all",limit:10,expand:["data.items.data.price"]});
for(const s of list.data){
if(LIVE.has(s.status))return s;
}
return null;
}
async function releaseSchedule(sub){
const id=typeof sub.schedule==="string"?sub.schedule:sub.schedule?.id;
if(!id)return;
await stripe().subscriptionSchedules.release(id).catch(()=>null);
}
async function clearPending(customerId){
await connectDb();
await Subscription.updateOne({stripeCustomerId:customerId},{$set:{pendingPlan:null,pendingInterval:null,stripeScheduleId:null}});
}
export async function changePlan(customerId,tierKey,intervalKey){
const sub=await activeSubscription(customerId);
if(!sub)return{changed:false,reason:"no_active_subscription"};
const current=planFromSubscription(sub);
if(current.plan===tierKey&&current.interval===intervalKey)return{changed:false,reason:"already_on_plan"};
const price=await priceFor(tierKey,intervalKey);
const down=TIER_RANK[tierKey]<TIER_RANK[current.plan||"free"];
await releaseSchedule(sub);
if(!down){
const updated=await stripe().subscriptions.update(sub.id,{items:[{id:sub.items.data[0].id,price}],proration_behavior:"always_invoice",cancel_at_period_end:false,metadata:{...sub.metadata,tier:tierKey,interval:intervalKey},expand:["items.data.price"]});
await clearPending(customerId);
await applySubscription(updated);
return{changed:true,when:"now",plan:tierKey,interval:intervalKey};
}
const schedule=await stripe().subscriptionSchedules.create({from_subscription:sub.id});
const phase=schedule.phases[0];
await stripe().subscriptionSchedules.update(schedule.id,{end_behavior:"release",phases:[{items:[{price:phase.items[0].price,quantity:1}],start_date:phase.start_date,end_date:phase.end_date},{items:[{price,quantity:1}]}]});
await connectDb();
await Subscription.updateOne({stripeCustomerId:customerId},{$set:{pendingPlan:tierKey,pendingInterval:intervalKey,stripeScheduleId:schedule.id,updatedAt:new Date()}});
const endsAt=phase.end_date?new Date(phase.end_date*1000):null;
return{changed:true,when:"period_end",plan:tierKey,interval:intervalKey,effectiveAt:endsAt};
}
export async function cancelSubscription(customerId){
const sub=await activeSubscription(customerId);
if(!sub)return{canceled:false,reason:"no_active_subscription"};
await releaseSchedule(sub);
const updated=await stripe().subscriptions.update(sub.id,{cancel_at_period_end:true,expand:["items.data.price"]});
await clearPending(customerId);
await applySubscription(updated);
return{canceled:true,effectiveAt:sub.items?.data?.[0]?.current_period_end||null};
}
export async function resumeSubscription(customerId){
const sub=await activeSubscription(customerId);
if(!sub)return{resumed:false,reason:"no_active_subscription"};
await releaseSchedule(sub);
const updated=await stripe().subscriptions.update(sub.id,{cancel_at_period_end:false,expand:["items.data.price"]});
await clearPending(customerId);
await applySubscription(updated);
return{resumed:true};
}
export async function planFor(discordId){
const entitlement=await entitlementFor(discordId);
await connectDb();
const doc=await Subscription.findOne({discordId});
if(!doc)return{plan:entitlement.plan,status:null,interval:null,currentPeriodEnd:null,cancelAtPeriodEnd:false};
return{plan:entitlement.plan,status:doc.status,interval:doc.interval,currentPeriodEnd:doc.currentPeriodEnd,cancelAtPeriodEnd:doc.cancelAtPeriodEnd,pendingPlan:doc.pendingPlan,pendingInterval:doc.pendingInterval};
}
export function assertPlan(tier,interval){
if(!plans.tier(tier)||!plans.interval(interval))throw createError({statusCode:400,statusMessage:"unknown_plan"});
}
