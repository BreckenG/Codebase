import{currentUser}from"../../../utils/auth";
import{searchInvitees}from"../../../utils/party";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)return{hits:[]};
const{q}=getQuery(event);
return{hits:await searchInvitees(user.id,q)};
});
