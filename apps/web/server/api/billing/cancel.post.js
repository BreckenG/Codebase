import{requireUser}from"../../utils/auth";
import{requireBilling,customerFor,cancelSubscription}from"../../utils/billing";
export default defineEventHandler(async event=>{
requireBilling();
const user=requireUser(event);
const customerId=await customerFor(user);
const result=await cancelSubscription(customerId);
if(!result.canceled)throw createError({statusCode:400,statusMessage:result.reason});
return result;
});
