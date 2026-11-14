import{requireUser}from"../../utils/auth";
import{requireSales,stripe,customerFor,quote,assertPlan}from"../../utils/billing";
import{referralDiscount}from'../../utils/referrals';
export default defineEventHandler(async event=>{
requireSales();
const user=requireUser(event);
const{tier,interval,referralCode,paymentMethodId}=await readBody(event);
assertPlan(tier,interval);
const customerId=await customerFor(user);
if(paymentMethodId){
const method=await stripe().paymentMethods.retrieve(paymentMethodId);
if((typeof method.customer==='string'?method.customer:method.customer?.id)!==customerId)throw createError({statusCode:403,statusMessage:'Choose a payment method saved to your account.'});
if(method.billing_details?.address?.country)await stripe().customers.update(customerId,{address:method.billing_details.address});
}
const referral=await referralDiscount(referralCode,user.id,customerId,interval);
return{...await quote(customerId,tier,interval,referral),referral:referral?{code:referral.code,percent:referral.percent}:null};
});
