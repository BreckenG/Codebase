import{requireUser}from"../../utils/auth";
import{requireBilling,customerFor,savedCards}from"../../utils/billing";
export default defineEventHandler(async event=>{
requireBilling();
const user=requireUser(event);
return{methods:await savedCards(await customerFor(user))};
});
