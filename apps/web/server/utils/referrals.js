import{connectDb}from'./db';
import{stripe}from'./billing';
import{Referral,ReferralCredit}from'./referral-models';
import{commissionCents,referralCode}from'./referral-math';
import{withBillingLease}from'./billing-lease';
import{reverseReferralTransfer}from'./referral-transfers';
export async function ensureGtc(){
await connectDb();
try{await Referral.updateOne({code:'GTC'},{$setOnInsert:{partner:'GTC',discountPercent:15,commissionPercent:25,active:true}},{upsert:true});}
catch(error){if(error.code!==11000)throw error;}
}
export async function referralDiscount(value,userId,customerId,interval){
if(!value)return null;
await ensureGtc();
const code=referralCode(value),ref=code?await Referral.findOne({code,active:true}).lean():null;
if(!ref||ref.ownerId)throw createError({statusCode:400,statusMessage:'That referral code is not available.'});
if(interval!=='monthly')throw createError({statusCode:400,statusMessage:'Referral discounts apply to the first month of monthly billing.'});
if(ref.ownerId===userId)throw createError({statusCode:400,statusMessage:'You cannot use your own referral code.'});
const paid=await stripe().invoices.list({customer:customerId,status:'paid',limit:1});
if(paid.data.length)throw createError({statusCode:400,statusMessage:'Referral discounts are for your first paid subscription only.'});
const couponId=`rw_referral_month_${ref.discountPercent}`;
let coupon;
try{coupon=await stripe().coupons.retrieve(couponId);}catch(error){
if(error.code!=='resource_missing')throw error;
coupon=await stripe().coupons.create({id:couponId,duration:'once',percent_off:ref.discountPercent,name:`${ref.discountPercent}% off your first month`},{idempotencyKey:couponId});
}
if(!coupon.valid||coupon.duration!=='once'||coupon.percent_off!==ref.discountPercent)throw createError({statusCode:409,statusMessage:'This discount is temporarily unavailable.'});
return{code,partner:ref.partner,ownerId:ref.ownerId,percent:ref.discountPercent,commissionPercent:ref.commissionPercent,couponId};
}
export const REFERRAL_MONTHS=12;
const objectId=value=>typeof value==='string'?value:value?.id;
export async function creditInvoice(invoiceId){
return withBillingLease(`referral:${invoiceId}`,async()=>{
const api=stripe();
const invoice=await api.invoices.retrieve(invoiceId);
if(invoice.status!=='paid'||!['subscription_create','subscription_cycle'].includes(invoice.billing_reason))return;
const subscriptionId=objectId(invoice.parent?.subscription_details?.subscription||invoice.subscription);
if(!subscriptionId)return;
const sub=await api.subscriptions.retrieve(subscriptionId);
const code=referralCode(sub.metadata?.referralCode);
if(!code||sub.metadata?.interval!=='monthly')return;
await connectDb();
const ref=await Referral.findOne({code}).lean();
if(!ref)return;
if(await ReferralCredit.countDocuments({subscriptionId:sub.id,invoiceId:{$ne:invoiceId}})>=REFERRAL_MONTHS)return;
const customerId=objectId(invoice.customer);
const tax=(invoice.total_taxes||invoice.total_tax_amounts||[]).reduce((sum,t)=>sum+(t.amount||0),0);
let refunded=0,disputed=false,paidByCharge=0;
const chargeIds=new Set();
if(invoice.charge)chargeIds.add(objectId(invoice.charge));
for await(const payment of api.invoicePayments.list({invoice:invoiceId,status:'paid',limit:100})){
if(payment.payment?.charge)chargeIds.add(objectId(payment.payment.charge));
const intent=payment.payment?.payment_intent;
if(!intent)continue;
const pi=typeof intent==='string'?await api.paymentIntents.retrieve(intent):intent;
if(pi.latest_charge)chargeIds.add(objectId(pi.latest_charge));
}
for(const id of chargeIds){const charge=await api.charges.retrieve(id);refunded+=charge.amount_refunded||0;disputed||=!!charge.disputed;paidByCharge+=charge.amount_captured??charge.amount??0;}
const percent=Number(sub.metadata.referralCommissionPercent||ref.commissionPercent);
const paid=Math.min(invoice.amount_paid,invoice.total??invoice.amount_paid,paidByCharge);
const amount=commissionCents(paid,tax,percent,refunded,disputed);
const availableAt=new Date((invoice.status_transitions?.paid_at||invoice.created)*1000+30*86400000);
const status=disputed||refunded>=invoice.amount_paid?'reversed':!chargeIds.size?'review':availableAt.getTime()>Date.now()?'pending':'ready';
const now=new Date();
await ReferralCredit.updateOne({invoiceId},[{$set:{invoiceId,customerId,subscriptionId:sub.id,code,partner:{$literal:ref.partner},ownerId:{$literal:ref.ownerId||null},currency:invoice.currency,paidCents:paid,commissionCents:{$cond:[{$or:[{$eq:[{$type:'$commissionCents'},'missing']},{$eq:['$status','review']}]},amount,{$min:['$commissionCents',amount]}]},percent,status:{$cond:[{$eq:['$status','reversed']},'reversed',status]},availableAt,createdAt:{$ifNull:['$createdAt',now]},updatedAt:now}}],{upsert:true});
await reverseReferralTransfer(invoiceId);
});
}
export async function referralWebhook(hook){
if(hook.type==='invoice.paid')return creditInvoice(hook.data.object.id);
if(!['charge.refunded','charge.dispute.created','charge.dispute.closed'].includes(hook.type))return;
const object=hook.data.object;
const charge=await stripe().charges.retrieve(hook.type==='charge.refunded'?object.id:objectId(object.charge));
const invoices=new Set();
if(charge.invoice)invoices.add(objectId(charge.invoice));
const intent=objectId(charge.payment_intent);
if(intent){for await(const payment of stripe().invoicePayments.list({payment:{type:'payment_intent',payment_intent:intent},limit:100}))invoices.add(objectId(payment.invoice));}
const customerId=objectId(charge.customer);
if(customerId){
await connectDb();
for await(const credit of ReferralCredit.find({customerId},'invoiceId').cursor())invoices.add(credit.invoiceId);
}
for(const id of invoices)if(id)await creditInvoice(id);
}
