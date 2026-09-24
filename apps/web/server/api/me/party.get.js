import{currentUser}from"../../utils/auth";
import{partyState}from"../../utils/party";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)return{party:null,invites:[],match:null,pending:0,error:null};
return await partyState(user.id);
});
