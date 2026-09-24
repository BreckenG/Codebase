import crypto from'node:crypto';
import mongoose from'mongoose';
import{connectDb}from'./db.js';
import{MAX_AGE_MS}from'./auth.js';
import{deviceFlow}from'./desktop-auth.js';
const CACHE_MS=60000;
const CACHE_MAX=5000;
const sessionDef=new mongoose.Schema({_id:String,userId:{type:String,index:true},createdAt:Date,revoked:{type:Boolean,default:false},expiresAt:{type:Date,expires:0,required:true}});
const epochDef=new mongoose.Schema({_id:String,at:Date,expiresAt:{type:Date,expires:0,required:true}});
export const WebSession=mongoose.models.WebSession||mongoose.model('WebSession',sessionDef,'web_sessions');
export const WebSessionEpoch=mongoose.models.WebSessionEpoch||mongoose.model('WebSessionEpoch',epochDef,'web_session_epochs');
export const validSid=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{22}$/.test(value);
const validUser=value=>/^\d{17,20}$/.test(value||'');
const cache=new Map();
function remember(sid,ok){
if(cache.size>=CACHE_MAX){
let drop=CACHE_MAX>>2;
for(const key of cache.keys()){
cache.delete(key);
if(--drop<=0)break;
}
}
cache.set(sid,{ok,until:Date.now()+CACHE_MS});
}
export async function mintSession(userId,expiresAt){
if(!validUser(userId))throw new Error('bad session owner');
const sid=crypto.randomBytes(16).toString('base64url');
await connectDb();
await WebSession.create({_id:sid,userId,createdAt:new Date(),revoked:false,expiresAt:new Date(expiresAt)});
remember(sid,true);
return sid;
}
export async function sessionLive(sid){
if(!validSid(sid))return false;
const hit=cache.get(sid);
if(hit&&hit.until>Date.now())return hit.ok;
try{
await connectDb();
const doc=await WebSession.findOne({_id:sid,revoked:false,expiresAt:{$gt:new Date()}}).lean();
remember(sid,Boolean(doc));
return Boolean(doc);
}catch{

if(hit)return hit.ok;
return false;
}
}
export async function revokeSession(sid){
if(!validSid(sid))return false;
await connectDb();
await WebSession.updateOne({_id:sid},{$set:{revoked:true}});
remember(sid,false);
return true;
}
export async function revokeAllForUser(userId){
if(!validUser(userId))return{browser:0,desktop:0};
await connectDb();
const result=await WebSession.updateMany({userId,revoked:false},{$set:{revoked:true}});
await WebSessionEpoch.updateOne({_id:userId},{$set:{at:new Date(),expiresAt:new Date(Date.now()+MAX_AGE_MS)}},{upsert:true});
const desktop=await(await deviceFlow()).revokeAllFor(userId);
cache.clear();
return{browser:result?.modifiedCount||0,desktop};
}
export async function sessionCounts(userId){
if(!validUser(userId))return{browser:0,desktop:0};
await connectDb();
const browser=await WebSession.countDocuments({userId,revoked:false,expiresAt:{$gt:new Date()}});
return{browser,desktop:await(await deviceFlow()).countFor(userId)};
}
export async function legacyAllowed(userId,exp){
if(!validUser(userId)||!Number.isSafeInteger(exp))return false;
const key='legacy:'+userId+':'+exp;
const hit=cache.get(key);
if(hit&&hit.until>Date.now())return hit.ok;
try{
await connectDb();
const epoch=await WebSessionEpoch.findOne({_id:userId}).lean();
const ok=!(epoch?.at&&exp-MAX_AGE_MS<=epoch.at.getTime());
remember(key,ok);
return ok;
}catch{
if(hit)return hit.ok;
return false;
}
}
