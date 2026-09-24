import{currentUser}from"../../utils/auth";
import{playerProfile}from"../../utils/players";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)return{player:null};
return{player:await playerProfile(user.id,{id:user.id,bracket:null})};
});
