import{tierForElo}from"@ranked-world/ranks";
import{currentUser}from"./auth";
import{findPlayer,rankBanned}from"./players";
export async function viewerFor(event){
const user=currentUser(event);
if(!user)return null;
const doc=await findPlayer(user.id);
if(!doc||!doc.linked||await rankBanned(doc))return{id:user.id,bracket:null};
if(doc.modMode)return{id:user.id,bracket:"*"};
return{id:user.id,bracket:tierForElo(doc.ranked?.elo||0).category};
}
