import{currentUser}from"../../utils/auth";
import{salesConfigured,planFor}from"../../utils/billing";
import{catalog}from"../../utils/plans";
import{Player,connectDb}from'../../utils/db';
import{Referral}from'../../utils/referral-models';
import{notify}from'../../utils/notifications';
export default defineEventHandler(async event=>{
const user=currentUser(event);
const config=useRuntimeConfig();
const asked=String(getQuery(event).ref||'').trim().toUpperCase().slice(0,20);
let referral=null;
if(salesConfigured()){
await connectDb();
const account=user?await Player.findOne({discordId:user.id},'stripeSubscriptionId').lean():null;
const firstSubscription=!account?.stripeSubscriptionId;
if(user&&firstSubscription&&await Referral.exists({code:'GTC',active:true}))await notify(user.id,`offer:GTC:first-month:${user.id}`,'subscription_offer','15% off your first month','Use GTC on your first monthly subscription. Your next months renew at the regular price.','/subscribe?ref=GTC');
if(asked){
const doc=await Referral.findOne({code:asked,active:true},'code discountPercent ownerId').lean();
if(doc&&!doc.ownerId)referral={code:doc.code,percent:doc.discountPercent,interval:'monthly',eligible:!user||firstSubscription};
}
}
return{configured:salesConfigured(),publishableKey:config.public.stripePublishableKey||null,catalog:catalog(),signedIn:Boolean(user),plan:user?await planFor(user.id):null,referral};
});
