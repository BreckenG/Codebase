import{currentUser}from"../utils/auth";
import{codes,findPlayer,rankBanned}from"../utils/players";
import{tierForElo}from"@ranked-world/ranks";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)return{codes:[],bracket:null,reason:"signed-out"};
const doc=await findPlayer(user.id);
if(!doc||!doc.linked)return{codes:[],bracket:null,reason:"unlinked"};
if(await rankBanned(doc))return{codes:[],bracket:null,reason:"banned"};
if(doc.modMode)return{codes:await codes(null,true),bracket:"All (moderation mode)",reason:null};
const bracket=tierForElo(doc.ranked?.elo||0).category;
return{codes:await codes(bracket),bracket,reason:null};
});
