import{currentUser}from"../../utils/auth";
import{friendsFor}from"../../utils/players";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)return{friends:[]};
return{friends:await friendsFor(user.id)};
});
