import crypto from'node:crypto';
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const validUserCode=value=>typeof value==='string'&&/^[A-HJ-NP-Z2-9]{8}$/.test(value);
export const tokenHash=value=>crypto.createHash('sha256').update(value).digest('hex');
const validToken=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
export function createDeviceFlow({grants,sessions,now=Date.now}){
return{async start(origin){
for(let attempt=0;attempt<5;attempt++){
const deviceCode=crypto.randomBytes(32).toString('base64url');
const userCode=Array.from(crypto.randomBytes(8),byte=>ALPHABET[byte%32]).join('');
try{
await grants.create({deviceHash:tokenHash(deviceCode),userCode,state:'pending',createdAt:new Date(now()),expiresAt:new Date(now()+600000)});
return{deviceCode,userCode,verificationUri:origin+'/launcher/connect?code='+userCode,expiresIn:600,interval:5};
}catch(error){
if(error.code!==11000)throw error;
}
}
throw new Error('Device authorization unavailable');
},async request(userCode){
if(!validUserCode(userCode))return null;
const grant=await grants.findOne({userCode,state:'pending',expiresAt:{$gt:new Date(now())}});
return grant?{userCode,application:'Ranked World desktop',expiresAt:grant.expiresAt}:null;
},async approve(userCode,user,approved){
if(approved!==true||!validUserCode(userCode)||!/^\d{17,20}$/.test(user?.id||''))return false;
const identity={id:user.id,username:user.username||'',avatar:user.avatar||''};
return Boolean(await grants.findOneAndUpdate({userCode,state:'pending',expiresAt:{$gt:new Date(now())}},{$set:{state:'approved',user:identity}},{new:true}));
},async poll(deviceCode){
if(!validToken(deviceCode))return{status:'expired'};
const filter={deviceHash:tokenHash(deviceCode),expiresAt:{$gt:new Date(now())}};
const grant=await grants.findOneAndUpdate({...filter,state:'approved'},{$set:{state:'claimed'}},{new:true});
if(!grant)return{status:(await grants.findOne({...filter,state:'pending'}))?'pending':'expired'};
const token=crypto.randomBytes(32).toString('base64url');
const expiresAt=new Date(now()+30*86400000);
await sessions.create({tokenHash:tokenHash(token),user:grant.user,revoked:false,createdAt:new Date(now()),expiresAt});
return{status:'approved',token,expiresAt:expiresAt.toISOString()};
},async authenticate(token){
if(!validToken(token))return null;
return sessions.findOne({tokenHash:tokenHash(token),revoked:false,expiresAt:{$gt:new Date(now())}});
},async revoke(token){
if(validToken(token))await sessions.updateOne({tokenHash:tokenHash(token)},{$set:{revoked:true}});
},async revokeAllFor(userId){
if(!/^\d{17,20}$/.test(userId||''))return 0;
const result=await sessions.updateMany({'user.id':userId,revoked:false},{$set:{revoked:true}});
return result?.modifiedCount||0;
},async countFor(userId){
if(!/^\d{17,20}$/.test(userId||''))return 0;
return sessions.countDocuments({'user.id':userId,revoked:false,expiresAt:{$gt:new Date(now())}});
}};
}
