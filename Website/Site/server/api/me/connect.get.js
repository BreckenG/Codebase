import{currentUser}from"../../utils/auth";
import{connectState}from"../../utils/connect";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)return{code:null,live:false,expiresAt:null};
return await connectState(user.id);
});
