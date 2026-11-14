import{requireUser}from"../../utils/auth";
import{requireBilling,customerFor,resumeSubscription}from"../../utils/billing";
export default defineEventHandler(async event=>{
requireBilling();
const user=requireUser(event);
const customerId=await customerFor(user);
const result=await resumeSubscription(customerId);
if(!result.resumed)throw createError({statusCode:400,statusMessage:result.reason});
return result;
});
