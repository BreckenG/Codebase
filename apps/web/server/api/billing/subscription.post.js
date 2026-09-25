import{requireAcceptance,recordAcceptance}from"../../utils/consent";
import{requireUser}from"../../utils/auth";
import{requireSales,stripe,customerFor,priceFor,quote,applySubscription,assertPlan,activeSubscription,changePlan}from"../../utils/billing";
import{referralDiscount}from'../../utils/referrals';
import crypto from'node:crypto';
import{withBillingLease}from'../../utils/billing-lease';
import{BillingAttempt}from'../../utils/referral-models';
import{Subscription,connectDb}from'../../utils/db';
import membershipConfig from'../../../../../packages/shared/membership.cjs';
export default defineEventHandler(async event=>{
requireSales();
const user=requireUser(event);
const body=await readBody(event);
requireAcceptance(body);
const{tier,interval,paymentMethodId}=body;
assertPlan(tier,interval);
return withBillingLease(`checkout:${user.id}`,async()=>{
await connectDb();
if(membershipConfig.discordPlan(await Subscription.findOne({discordId:user.id},{discordPlan:1,discordPlanEnds:1}).lean())!=="free")throw createError({statusCode:409,statusMessage:"You already have a membership through Discord. Change or cancel it in Discord under User Settings, Subscriptions."});
await recordAcceptance(user.id,"billing");
const customerId=await customerFor(user);
const fingerprint=crypto.createHash('sha256').update([customerId,tier,interval,paymentMethodId,String(body.referralCode||'').trim().toUpperCase()].join(':')).digest('hex');
const existing=await activeSubscription(customerId);
if(existing){
if(existing.metadata?.checkoutFingerprint===fingerprint){await applySubscription(existing);return{subscriptionId:existing.id,status:existing.status,clientSecret:null};}
if(body.referralCode)throw createError({statusCode:400,statusMessage:'Referral discounts are for your first subscription only.'});
const result=await changePlan(customerId,tier,interval);
if(!result.changed)throw createError({statusCode:400,statusMessage:result.reason});
return{subscriptionId:existing.id,status:"updated",clientSecret:null,...result};
}
if(!paymentMethodId)throw createError({statusCode:400,statusMessage:"no_payment_method"});
let attempt=await BillingAttempt.findById(user.id).lean();
for await(const pending of stripe().subscriptions.list({customer:customerId,status:'all',limit:100})){
if(attempt&&pending.metadata?.checkoutAttempt===attempt.key)attempt.subscriptionId=pending.id;
if(!['incomplete','active','trialing','past_due','unpaid','paused'].includes(pending.status))continue;
if(pending.status==='incomplete'&&pending.metadata?.checkoutFingerprint===fingerprint){
const resumed=await stripe().subscriptions.retrieve(pending.id,{expand:['latest_invoice.confirmation_secret','items.data.price']});
await applySubscription(resumed);
return{subscriptionId:resumed.id,status:resumed.status,clientSecret:resumed.latest_invoice?.confirmation_secret?.client_secret||null};
}
if(['incomplete','unpaid','paused'].includes(pending.status)){await stripe().subscriptions.cancel(pending.id);continue;}
throw createError({statusCode:409,statusMessage:'An existing subscription needs attention before you can start another. Check your membership settings.'});
}
if(attempt?.subscriptionId){
const previous=await stripe().subscriptions.retrieve(attempt.subscriptionId);
if(['canceled','incomplete_expired'].includes(previous.status))attempt=null;
}
if(attempt&&!attempt.subscriptionId&&attempt.fingerprint!==fingerprint&&Date.now()-new Date(attempt.createdAt).getTime()>600000)attempt=null;
if(attempt&&attempt.fingerprint!==fingerprint)throw createError({statusCode:409,statusMessage:'Retry your previous checkout choices before starting a different subscription.'});
const referral=await referralDiscount(body.referralCode,user.id,customerId,interval);
const method=await stripe().paymentMethods.retrieve(paymentMethodId);
if((typeof method.customer==='string'?method.customer:method.customer?.id)!==customerId)throw createError({statusCode:403,statusMessage:'Choose a payment method saved to your account.'});
await stripe().customers.update(customerId,{invoice_settings:{default_payment_method:paymentMethodId},...(method.billing_details?.address?.country?{address:method.billing_details.address}:{})});
const expected=await quote(customerId,tier,interval,referral);
if(!expected.taxKnown||expected.total!==body.expectedTotal)throw createError({statusCode:409,statusMessage:"Your billing total changed. Review the price again before paying."});
if(!attempt){attempt={key:crypto.randomUUID(),fingerprint,createdAt:new Date()};await BillingAttempt.updateOne({_id:user.id},{$set:attempt,$unset:{subscriptionId:1}},{upsert:true});}
let sub;
try{sub=await stripe().subscriptions.create({customer:customerId,automatic_tax:{enabled:true},items:[{price:await priceFor(tier,interval)}],...(referral?{discounts:[{coupon:referral.couponId}]}:{}),default_payment_method:paymentMethodId,payment_behavior:"default_incomplete",payment_settings:{save_default_payment_method:"on_subscription"},expand:["latest_invoice.confirmation_secret","items.data.price"],metadata:{discordId:user.id,tier,interval,checkoutFingerprint:fingerprint,checkoutAttempt:attempt.key,...(referral?{referralCode:referral.code,referralCommissionPercent:String(referral.commissionPercent)}:{})}},{idempotencyKey:`subscribe:${attempt.key}`});}
catch(error){if(["StripeInvalidRequestError","StripeCardError"].includes(error.type))await BillingAttempt.deleteOne({_id:user.id,key:attempt.key});throw error;}
await BillingAttempt.updateOne({_id:user.id,key:attempt.key},{$set:{subscriptionId:sub.id}});
await applySubscription(sub);
return{subscriptionId:sub.id,status:sub.status,clientSecret:sub.latest_invoice?.confirmation_secret?.client_secret||null};
});
});
