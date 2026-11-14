import mongoose from'mongoose';
import{ScrimMatch}from'./db';
ScrimMatch.schema.add({mode:String,teamPhoton1:[String],teamPhoton2:[String],region:String,requestedBy:String,phase:String,remainingSeconds:Number,overtime:Boolean,breaks:[Boolean],points:[Number],error:String,startedAt:Date,endedAt:Date,createdAt:Date,roster:[{id:String,photonId:String,name:String,color:String}],ruleset:String,log:[String]});
const schema=new mongoose.Schema({commandId:{type:String,unique:true},type:String,code:String,region:String,size:String,ruleset:String,matchId:String,requestedBy:String,member:{type:Boolean,default:false},state:{type:String,default:'pending',index:true},error:{type:String,default:null},team:Number,playerId:String,team1:[String],team2:[String],createdAt:{type:Date,default:Date.now},expiresAt:Date});
export const AdminRefCommand=mongoose.models.AdminRefCommand||mongoose.model('AdminRefCommand',schema,'admin_ref_commands');
export const AdminRefSession=ScrimMatch;
const safeErrors=new Set(['Wait for the referee to join.','Wait for round setup.','There is no active break.','Choose a valid team.','This team already used its break.','Choose a player on this team.','Relay is offline.','Room already managed.','Session already exists.','Session is no longer active.','Wait for the referee lobby before starting.','A selected player has left the room.','Command expired.','Manager restarted. Check the session before retrying.']);
export function commandView(command){
return{commandId:command.commandId,type:command.type,code:command.code,matchId:command.matchId,state:command.state==='pending'&&new Date(command.expiresAt).getTime()<Date.now()?'expired':command.state,error:command.state==='failed'?(safeErrors.has(command.error)?command.error:'The ref could not apply this request. Refresh the session and try again.'):null,createdAt:command.createdAt};
}
const SAFE=new Set([
"Room already managed.","Relay is offline.","Session is no longer active.","Wait for the referee to join.","Wait for round setup.",
"There is no active break.","Choose a valid team.","This team already used its break.","Choose a player on this team.",
"A selected player has left the room.","That player already left.","Command expired.","Wait for the referee lobby before starting.",
"Choose the required number of unique players per team.","The result did not match the teams, so nobody's rating changed.","The ref could not get into your room. You were not charged.","You have to be in the room before the match can start.","CGT is 4v4 only.",
"You already have an auto ref running. Stop it before sending another one.","Every auto ref is busy right now. Try again in a few minutes.",
"You are rank banned, so you can not use Auto Ref.","Manager restarted. Check the session before retrying.",
"Connect your Gorilla Tag account on the Play page first, the ref needs to know which player is you.",
"Auto Ref is part of Ranked World+ and Pro. Get a plan on rankedworld.com to use it.",
"That code is a public room. Auto Ref only joins private codes. You were not charged.",
"The ref could not get into your room. You were not charged.",
"No teams were picked within 12 minutes, so the ref left. You were not charged.",
"The match hit the 80 minute limit.","Referee disconnected.","The referee stopped responding.",
"Error, bots full, try again in a bit.","Error, bots are updating, try again in a few minutes.",
]);
export const ROOM_CODE=/^[A-Z0-9]{1,12}$/;
export function refError(e){
if(!e)return null;
if(SAFE.has(e)||/^You used all \d+ of your auto refs (this week|today)\./.test(e)||/^You can send up to \d+ refs a day\./.test(e))return e;
if(e.startsWith("The scrim bot could not start"))return"The ref could not start. Try again in a minute.";
return"The ref could not do that. Try again.";
}
export function refView(s,owner){
const roster=(s.roster||[]).map(p=>({id:p.id,name:p.name||"Player",color:p.color||"",you:!!owner&&p.photonId===owner}));
return{
matchId:s.matchId,code:s.code,region:s.region,size:s.size,ruleset:s.ruleset||"gtc",state:s.state,phase:s.phase||"starting",
points:s.points||[0,0],remainingSeconds:s.remainingSeconds||0,overtime:!!s.overtime,breaks:s.breaks||[false,false],
team1:s.team1||[],team2:s.team2||[],roster,ownerHere:roster.some(p=>p.you),log:(s.log||[]).slice(-5),
startedAt:s.startedAt,teamsAt:s.teamsAt||null,endedAt:s.endedAt||null,
names1:s.names1||[],names2:s.names2||[],
result:s.result?{winner:s.result.winner||0,voided:!!s.result.voided,rounds:Array.isArray(s.result.rounds)?s.result.rounds.length:0,players:(s.result.players||[]).map(p=>({name:p.name,team:p.team,tags:p.tags||0,runtimeMs:p.runtimeMs||0,leftEarly:!!p.leftEarly}))}:null,
error:refError(s.error),
};
}
