import{billingConfigured,stripe,applySubscription}from"../../utils/billing";
import{referralWebhook}from'../../utils/referrals';
export default defineEventHandler(async event=>{
const config=useRuntimeConfig();
if(!billingConfigured()||!config.stripeWebhookSecret){
throw createError({statusCode:503,statusMessage:"billing_not_configured"});
}
const signature=getHeader(event,"stripe-signature");
if(!signature)throw createError({statusCode:400,statusMessage:"bad_signature"});
const raw=await readRawBody(event,false);
let hook;
try{
hook=stripe().webhooks.constructEvent(raw,signature,config.stripeWebhookSecret);
}catch(e){
throw createError({statusCode:400,statusMessage:"bad_signature"});
}
if(hook.type.startsWith("customer.subscription.")){
const sub=await stripe().subscriptions.retrieve(hook.data.object.id,{expand:["items.data.price"]});
await applySubscription(sub);
}
await referralWebhook(hook);
return{received:true};
});
