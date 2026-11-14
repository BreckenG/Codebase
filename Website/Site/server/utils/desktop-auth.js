import mongoose from'mongoose';
import{connectDb}from'./db.js';
import{createDeviceFlow,tokenHash}from'./desktop-flow.js';
import{desktopRateIdentity}from'./desktop-client.js';
const user=new mongoose.Schema({id:String,username:String,avatar:String},{_id:false});
const grantDef=new mongoose.Schema({deviceHash:{type:String,unique:true,required:true},userCode:{type:String,unique:true,required:true},state:{type:String,required:true},user,createdAt:Date,expiresAt:{type:Date,expires:0,required:true}});
const sessionDef=new mongoose.Schema({tokenHash:{type:String,unique:true,required:true},user,revoked:{type:Boolean,default:false},createdAt:Date,expiresAt:{type:Date,expires:0,required:true}});
sessionDef.index({'user.id':1});
const limitDef=new mongoose.Schema({_id:String,count:Number,expiresAt:{type:Date,expires:0}});
const grants=mongoose.models.DesktopGrant||mongoose.model('DesktopGrant',grantDef,'desktop_grants');
const sessions=mongoose.models.DesktopSession||mongoose.model('DesktopSession',sessionDef,'desktop_sessions');
const limits=mongoose.models.DesktopLimit||mongoose.model('DesktopLimit',limitDef,'desktop_limits');
let indexes;
export async function deviceFlow(){
await connectDb();
indexes||=Promise.all([grants.init(),sessions.init(),limits.init()]);
await indexes;
return createDeviceFlow({grants,sessions});
}
export async function limitDeviceRequest(event,action,maximum=30){
await deviceFlow();
const identity=desktopRateIdentity(event);
const bucket=Math.floor(Date.now()/60000);
const id=tokenHash(action+':'+identity+':'+bucket);
let record;
try{
record=await limits.findOneAndUpdate({_id:id},{$inc:{count:1},$setOnInsert:{expiresAt:new Date((bucket+2)*60000)}},{upsert:true,new:true});
}catch(error){
if(error.code!==11000)throw error;
record=await limits.findOneAndUpdate({_id:id},{$inc:{count:1}},{new:true});
}
if(!record||record.count>maximum){
setResponseHeader(event,'Retry-After','60');
throw createError({statusCode:429,statusMessage:'Please wait before trying again.'});
}
}
export async function desktopAction(event,action,maximum,run){
try{
await limitDeviceRequest(event,action,maximum);
return await run(await deviceFlow());
}catch(error){
if(error.statusCode)throw error;
throw createError({statusCode:503,statusMessage:'Desktop sign in is unavailable. Try again.'});
}
}
