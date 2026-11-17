import{RankedBan,Subscription,connectDb}from"../utils/db";
import{billingConfigured,cancelSubscription}from"../utils/billing";
const EVERY=15*60e3;
let busy=false;
async function sweep(){
if(busy||!billingConfigured())return;
busy=true;
try{
await connectDb();
const bans=await RankedBan.find({active:true,expiresAt:null},"discordId photonId").lean();
const ids=bans.map(b=>b.discordId).filter(Boolean);
const photons=bans.map(b=>b.photonId).filter(Boolean);
if(!ids.length&&!photons.length)return;
const subs=await Subscription.find({stripeCustomerId:{$nin:[null,""]},cancelAtPeriodEnd:{$ne:true},status:{$in:["active","trialing","past_due"]},$or:[{discordId:{$in:ids}},{photonId:{$in:photons}}]},"discordId stripeCustomerId").lean();
for(const s of subs){
try{
const r=await cancelSubscription(s.stripeCustomerId);
if(r.canceled)console.log(`ban renewals: turned off renewal for ${s.discordId}`);
}catch(e){console.error(`ban renewals: ${s.discordId} failed: ${e.message}`);}
}
}catch(e){console.error(`ban renewals: ${e.message}`);}
finally{busy=false;}
}
export default defineNitroPlugin(()=>{
if(process.env.NODE_ENV!=="production")return;
setTimeout(sweep,60e3).unref?.();
setInterval(sweep,EVERY).unref?.();
});
