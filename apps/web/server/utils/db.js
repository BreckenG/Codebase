import profileSchema from"../../../../packages/shared/profile.cjs";
import mongoose from"mongoose";
let ready=null;
function model(name,schema,collection){
return mongoose.models[name]||mongoose.model(name,schema,collection);
}
export const CodePlan=model("CodePlan",new mongoose.Schema({sourceCode:String,nextCode:String,category:String,rotateAt:Date,status:String}),"codeplans");
export const Player=model("Player",profileSchema(mongoose),"profiles");
export const Party=model("Party",new mongoose.Schema({leaderId:{type:String,index:true},members:{type:[String],default:[]},size:String,ready:{type:[String],default:[]},invites:{type:[{toId:String,at:Date}],default:[]},queuedAt:{type:Date,default:null}}),"parties");
export const WebUser=Player;
export const PartyCommand=model("PartyCommand",new mongoose.Schema({userId:{type:String,required:true,index:true},action:{type:String,required:true},arg:{type:String,default:null},state:{type:String,default:"pending",index:true},error:{type:String,default:null},createdAt:{type:Date,default:Date.now},expiresAt:{type:Date,default:()=>new Date(Date.now()+600000),index:{expires:0}}}),"party_commands");
export const ScrimMatch=model("ScrimMatch",new mongoose.Schema({matchId:{type:String,index:true},size:String,state:{type:String,index:true},code:String,team1:{type:[String],default:[]},team2:{type:[String],default:[]}}),"scrim_matches");
export const Social=Player;
export const MatchLedger=model("MatchLedger",new mongoose.Schema({roundId:String,photonId:{type:String,index:true},discordId:String,name:String,track:String,code:String,category:String,beforeElo:Number,delta:Number,afterElo:Number,placement:Number,lobbySize:Number,tags:Number,survivalSeconds:Number,isWinner:Boolean,score:Number,teamScore:Number,ratingSystem:String,skillBefore:{mu:Number,sigma:Number},skillAfter:{mu:Number,sigma:Number},place01:Number,perf01:Number,eventMultiplier:Number,wasInfected:Boolean,firstTagged:Boolean,leftEarly:Boolean,provisional:Boolean,createdAt:{type:Date,default:Date.now}}),"match_ledger");
const seat=new mongoose.Schema({photonId:String,discordId:{type:String,default:null},name:String,joinedAt:Date,seenAt:{type:Date,default:null},leftAt:{type:Date,default:null}},{_id:false});
const sessions=new mongoose.Schema({code:{type:String,index:true},category:String,purpose:String,active:{type:Boolean,index:true},openedAt:Date,closedAt:Date,players:{type:[seat],default:[]},expiresAt:Date});
sessions.index({category:1,active:-1,openedAt:-1});
export const CodeSession=model("CodeSession",sessions,"code_sessions");

export const RankedBan=model("RankedBan",new mongoose.Schema({discordId:String,photonId:String,reason:String,active:Boolean,expiresAt:Date}),"rankedbans");
export const PracticeSession=model("PracticeSession",new mongoose.Schema({userId:{type:String,index:true},photonId:String,code:{type:String,index:true},difficulty:String,mode:String,mirror:{picked:String,base:String,q:Number,confidence:Number,source:String,offset:Number},state:{type:String,index:true},phase:String,points:{type:[Number],default:[0,0]},outcome:{type:String,default:null},rounds:{type:[{it:String,ms:Number,end:String}],default:undefined},startedAt:Date,endedAt:{type:Date,default:null}}),"practice_sessions");

export const Subscription=Player;
const notifications=new mongoose.Schema({eventKey:{type:String,required:true,unique:true},userId:{type:String,required:true},previewKeys:[String],title:String,body:String,to:String,actorId:String,actorName:String,avatar:{type:String,default:""},kind:{type:String,default:"party_invite"},status:{type:String,default:"pending"},invitedAt:Date,readAt:{type:Date,default:null},createdAt:{type:Date,default:Date.now},expiresAt:{type:Date,default:()=>new Date(Date.now()+2592000000),index:{expires:0}}});
notifications.index({userId:1,createdAt:-1});
export const Notification=model("Notification",notifications,"notifications");
export async function connectDb(){
if(ready)return ready;
const uri=useRuntimeConfig().mongoUri;
if(!uri)throw createError({statusCode:503,statusMessage:"Service unavailable"});
mongoose.set("strictQuery",true);
ready=mongoose.connect(uri).then(m=>{
return m;
}).catch(()=>{ready=null;throw createError({statusCode:503,statusMessage:"Service unavailable"});});
return ready;
}
