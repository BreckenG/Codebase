import{randomUUID}from"node:crypto";
import{currentUser}from"../../utils/auth";
import{entitlementFor}from"../../utils/entitlements";
import{requireReplayConsent}from"../../utils/consent";
import{Player,connectDb}from"../../utils/db";
import{AdminRefCommand,AdminRefSession}from"../../utils/autoref";
import{ROOM_CODE}from"../../utils/autoref";
const TYPES=["spawn","start","stop","ready","break","resume","tagger","kick"];
const SIZES=["2v2","3v3","4v4","5v5"];
const bad=m=>createError({statusCode:400,statusMessage:m});
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"sign_in_required"});
const body=await readBody(event);
if(!body||typeof body!=="object"||Array.isArray(body)||!TYPES.includes(body.type))throw bad("Choose a valid ref action.");
await connectDb();
const ent=await entitlementFor(user.id);
if(!ent.autoRef)throw createError({statusCode:403,statusMessage:"Auto Ref is part of Ranked World+ and Pro."});
const command={commandId:randomUUID(),type:body.type,requestedBy:user.id,member:true,createdAt:new Date(),expiresAt:new Date(Date.now()+120000),state:"pending"};
if(body.type==="spawn"){
await requireReplayConsent(user.id);
const p=await Player.findOne({discordId:user.id,linked:true},{_id:1}).lean();
if(!p)throw bad("Connect your Gorilla Tag account first.");
const code=typeof body.code==="string"?body.code.trim().toUpperCase():"";
if(!ROOM_CODE.test(code))throw bad("Enter your private room code, letters and numbers only.");
const region=ent.isPro?body.region:"usw";
if(!["us","usw","eu"].includes(region))throw bad("Choose a region.");
if(!SIZES.includes(body.size))throw bad("Choose how many players.");
if(!["gtc","cgt"].includes(body.ruleset))throw bad("Choose a mode.");
if(body.ruleset==="cgt"&&body.size!=="4v4")throw bad("CGT is 4v4 only.");
Object.assign(command,{code,region,size:body.size,ruleset:body.ruleset,matchId:randomUUID()});
}else{
if(typeof body.matchId!=="string"||body.matchId.length>80)throw bad("Choose a valid session.");
const m=await AdminRefSession.findOne({matchId:body.matchId,mode:"member",requestedBy:user.id}).lean();
if(!m||m.state==="ended")throw createError({statusCode:404,statusMessage:"That ref already left."});
Object.assign(command,{matchId:m.matchId,code:m.code,region:m.region});
const roster=new Set((m.roster||[]).map(p=>p.id));
if(body.type==="start"){
const a=body.team1,b=body.team2;
const ruleset=["gtc","cgt"].includes(body.ruleset)?body.ruleset:m.ruleset;
const n=Array.isArray(a)?a.length:0;
const ok=ruleset==="cgt"?n===4:n>=2&&n<=5;
if(!Array.isArray(b)||!ok||b.length!==n||[...a,...b].some(id=>typeof id!=="string"||!roster.has(id))||new Set([...a,...b]).size!==n*2)throw bad(ruleset==="cgt"?"Pick 4 different players for each team.":"Pick 2 to 5 different players for each team, the same number on both.");
command.team1=a;command.team2=b;
if(ruleset)command.ruleset=ruleset;
}
if(["break","tagger"].includes(body.type)){
if(![1,2].includes(body.team))throw bad("Choose a team.");
command.team=body.team;
}
if(["kick","tagger"].includes(body.type)){
if(typeof body.playerId!=="string"||!roster.has(body.playerId))throw bad("That player already left.");
command.playerId=body.playerId;
}
}
const busy=await AdminRefCommand.exists({$or:[{requestedBy:user.id,member:true},{code:command.code}],state:{$in:["pending","processing"]},expiresAt:{$gt:new Date()}});
if(busy)throw createError({statusCode:409,statusMessage:"Your last request is still going through."});
await AdminRefCommand.create(command);
setResponseStatus(event,202);
return{queued:true};
});
