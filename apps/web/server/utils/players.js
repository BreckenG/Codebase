import{publicProfile}from"./public-profile.js";
import{cardProfile}from"./player-card.js";
import{entitlementFor}from"./entitlements";
import{clampCard}from"../../app/utils/profile-card.js";
import{DIVISIONS,tierForElo}from"@ranked-world/ranks";
import{Player,MatchLedger,CodeSession,RankedBan,Social,WebUser,connectDb}from"./db";
const PAGE_SIZES=[20,50,100];
const MAX_PAGE=500;
const MAX_Q=64;
const SNOWFLAKE=/^\d{17,20}$/;
const reSpecial=/[.*+?^${}()|[\]\\]/g;
function escapeRe(s){
return s.replace(reSpecial,"\\$&");
}
function shapeTrack(tr){
tr={elo:0,peakElo:0,roundsPlayed:0,wins:0,tags:0,survivalSeconds:0,winStreak:0,lossStreak:0,...tr};
const t=tierForElo(tr.elo);
const losses=Math.max(0,tr.roundsPlayed-tr.wins);
let winRate=0;
if(tr.roundsPlayed)winRate=Math.round(tr.wins/tr.roundsPlayed*100);
return{elo:tr.elo,peakElo:tr.peakElo,rounds:tr.roundsPlayed,wins:tr.wins,losses,winRate,tags:tr.tags,survivalSeconds:tr.survivalSeconds,winStreak:tr.winStreak,lossStreak:tr.lossStreak,tier:t};
}
function shapePlayer(p){
return{photonId:p.photonId,discordId:p.discordId||null,name:p.name||p.username||"Unknown player",username:p.username||"",avatar:p.avatar||"",linked:Boolean(p.linked),ranked:shapeTrack(p.ranked||{}),scrim:shapeTrack(p.scrim||{})};
}
export async function findPlayer(id){
await connectDb();
const key=String(id||"").trim();
if(!SNOWFLAKE.test(key))return null;
return Player.findOne({discordId:key}).lean();
}
export const LEADERBOARD_METRICS=[{key:"elo",label:"Elo",field:"elo"},{key:"peak",label:"Peak Elo",field:"peakElo"},{key:"rounds",label:"Rounds",field:"roundsPlayed"},{key:"wins",label:"Wins",field:"wins"},{key:"winrate",label:"Win rate",field:null},{key:"tags",label:"Tags",field:"tags"},{key:"runtime",label:"Runtime",field:"survivalSeconds"},{key:"streak",label:"Win streak",field:"winStreak"}];
export const LEADERBOARD_SORTS=[{key:"relevance",label:"Relevance"},{key:"desc",label:"Highest to lowest"},{key:"asc",label:"Lowest to highest"},{key:"friends",label:"Friends",requires:"plus"}];
async function leaderboardFilter(){
const bans=await RankedBan.find({active:true,$or:[{expiresAt:null},{expiresAt:{$gt:new Date()}}]},'discordId photonId').lean();
return{linked:true,serverBanned:{$ne:true},discordId:{$regex:SNOWFLAKE,$nin:bans.map(b=>b.discordId).filter(Boolean)},photonId:{$nin:bans.map(b=>b.photonId).filter(Boolean)}};
}
export async function leaderboard({track="ranked",page=1,per=20,q="",category="",metric="elo",sort="relevance",viewerId=null,viewerIsPlus=false}={}){
await connectDb();
const field=track==="scrim"?"scrim":"ranked";
const size=PAGE_SIZES.includes(Number(per))?Number(per):PAGE_SIZES[0];
const asked=Math.max(1,Math.min(MAX_PAGE,Math.floor(Number(page))||1));
const skip=(asked-1)*size;
const term=String(q||"").trim().slice(0,MAX_Q);
let met=null;
for(const m of LEADERBOARD_METRICS){
if(m.key===metric)met=m;
}
if(!met)met=LEADERBOARD_METRICS[0];
let known="relevance";
for(const s of LEADERBOARD_SORTS){
if(s.key===sort)known=sort;
}
const wantFriends=known==="friends";
const canFriends=wantFriends&&Boolean(viewerId)&&viewerIsPlus;
const chosen=wantFriends&&!canFriends?"relevance":known;
const match=await leaderboardFilter();
if(term){const re=new RegExp(escapeRe(term),"i");match.$or=[{name:re},{username:re},{names:re}];}
if(category)match[`${field}.category`]=String(category).toUpperCase();
if(canFriends){
const social=await Social.findOne({discordId:viewerId},{friends:1}).lean();
const ids=new Set();
ids.add(viewerId);
for(const id of social?.friends||[])ids.add(id);
match.discordId.$in=[...ids];
}
const pipe=[{$match:match}];
let key;
if(met.key==="winrate"){
key="__metric";
pipe.push({$addFields:{__metric:{$cond:[{$gt:[`$${field}.roundsPlayed`,0]},{$divide:[`$${field}.wins`,`$${field}.roundsPlayed`]},0]}}});
}else{
key=`${field}.${met.field}`;
}
const dir=chosen==="asc"?1:-1;
if(chosen==="relevance"&&term){
const lower=term.toLowerCase();
pipe.push({$addFields:{__hit:{$cond:[{$eq:[{$toLower:"$name"},lower]},0,{$cond:[{$eq:[{$indexOfCP:[{$toLower:"$name"},lower]},0]},1,2]}]}}});
pipe.push({$sort:{__hit:1,[key]:-1,name:1}});
}else{
pipe.push({$sort:{[key]:dir,name:1}});
}
pipe.push({$skip:skip},{$limit:size});
const[found,total]=await Promise.all([Player.aggregate(pipe),Player.countDocuments(match)]);
const rows=[];
for(let i=0;i<found.length;i++){
const {photonId,...player}=shapePlayer(found[i]);
rows.push({rank:skip+i+1,...player});
}
return{track:field,page:asked,per:size,pages:Math.max(1,Math.ceil(total/size)),total,sort:chosen,metric:met.key,friendsLocked:wantFriends&&!canFriends,rows};
}
export async function playerProfile(id,viewer=null){
await connectDb();
const doc=await findPlayer(id);
if(!doc?.photonId||!doc.linked&&viewer?.id!==doc.discordId)return null;
const or=[{photonId:doc.photonId}];
if(doc.discordId)or.push({discordId:doc.discordId});
const[history,ban,standing]=await Promise.all([MatchLedger.find({photonId:doc.photonId}).sort({createdAt:-1}).limit(20).lean(),RankedBan.findOne({active:true,$or:or}).lean(),CodeSession.findOne({active:true,players:{$elemMatch:{photonId:doc.photonId,leftAt:null}}}).sort({openedAt:-1}).lean()]);
const player=shapePlayer(doc);
const visible=await leaderboardFilter();
const hidden=doc.serverBanned||visible.discordId.$nin.includes(doc.discordId)||visible.photonId.$nin.includes(doc.photonId);
const above=await Player.countDocuments({...visible,"ranked.elo":{$gt:doc.ranked.elo}});
const matches=[];
for(const m of history){
matches.push({code:m.code,track:m.track,category:m.category,delta:m.delta,afterElo:m.afterElo,placement:m.placement,lobbySize:m.track==="scrim"&&m.ratingSystem==="openskill"?2:m.lobbySize,tags:m.tags,won:Boolean(m.isWinner),at:m.createdAt});
}
let inCode=null;
if(standing){
inCode={code:null,purpose:standing.purpose,category:standing.category};
const mine=viewer&&viewer.id&&viewer.id===doc.discordId;
if(mine||viewer&&viewer.bracket&&(viewer.bracket==="*"||viewer.bracket===standing.category)){
inCode.code=standing.code;
}
}
let discord=null;
if(doc.discordId){
const wu=await WebUser.findOne({discordId:doc.discordId},"username avatar").lean();
if(wu)discord={name:wu.username||"",avatar:wu.avatar||""};
}
const position=doc.linked&&!hidden?above+1:null;
const entitlement=await entitlementFor(doc.discordId);
const playerCard={profile:cardProfile(doc,position),card:clampCard(doc.profileCard,entitlement.cardLevel)};
return publicProfile({...player,discord,position,playerCard,banned:Boolean(ban),inCode,matches},viewer?.id===doc.discordId);
}
export async function rankBanned(doc){
await connectDb();
const or=[{photonId:doc.photonId}];
if(doc.discordId)or.push({discordId:doc.discordId});
return Boolean(await RankedBan.exists({active:true,$and:[{$or:or},{$or:[{expiresAt:null},{expiresAt:{$gt:new Date()}}]}]}));
}
export async function codes(category,all=false){
await connectDb();
if(!category&&!all)return[];
const sessions=await CodeSession.find(all?{purpose:"ranked",active:true}:{category}).sort({active:-1,openedAt:-1}).limit(all?120:60).lean();
const out=[];
for(const s of sessions){
const here=[];
const left=[];
for(const p of s.players){
const label=p.name||"Unknown player";
if(p.leftAt){
left.push({name:label,leftAt:p.leftAt});
}else{
here.push({name:label});
}
}
out.push({code:s.code,purpose:s.purpose,category:s.category||null,active:s.active,openedAt:s.openedAt,closedAt:s.closedAt,count:here.length,players:here,left});
}
return out;
}
export async function stats(){
await connectDb();
const dayAgo=new Date(Date.now()-86400000);
const[players,live,rounds]=await Promise.all([Player.countDocuments({linked:true}),CodeSession.countDocuments({active:true}),MatchLedger.distinct('roundId',{createdAt:{$gte:dayAgo}}).then(list=>list.length)]);
return{players,live,rounds,divisions:DIVISIONS.length};
}
