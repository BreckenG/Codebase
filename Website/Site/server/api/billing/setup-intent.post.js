import{requireUser}from"../../utils/auth";
import{requireSales,stripe,customerFor,savedCards}from"../../utils/billing";
export default defineEventHandler(async event=>{
requireSales();
const user=requireUser(event);
const customerId=await customerFor(user);
const intent=await stripe().setupIntents.create({customer:customerId,usage:"off_session",payment_method_types:["card"]});
return{clientSecret:intent.client_secret,methods:await savedCards(customerId)};
});
