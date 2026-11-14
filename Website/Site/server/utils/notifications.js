import{Notification,Party,connectDb}from"./db";
export async function notify(userId,eventKey,kind,title,body,to='/notifications'){
await connectDb();
await Notification.updateOne({eventKey},{$setOnInsert:{userId,kind,title,body,to,status:'info',expiresAt:new Date(Date.now()+2592000000)}},{upsert:true});
}
export async function listNotifications(userId){
await connectDb();
const now=Date.now();
const filter={userId,expiresAt:{$gt:new Date(now)},kind:{$ne:'code_preview'}};
const[ordinary,ordinaryUnread,previews]=await Promise.all([Notification.find(filter).sort({createdAt:-1,_id:-1}).limit(50).lean(),Notification.countDocuments({...filter,readAt:null}),Notification.find({userId,kind:'code_preview',expiresAt:{$gt:new Date(now)},createdAt:{$gt:new Date(now-900000)}}).sort({createdAt:-1,_id:-1}).lean()]);
const preview=previews.filter(n=>{
if(new Date(n.expiresAt).getTime()<=now)return false;
if(n.eventKey===`codepreview:${userId}`)return true;
const legacy=/^codepreview:[^:]+:(\d+):[^:]+$/.exec(n.eventKey||'');
return legacy&&Number(legacy[1])>now&&Number(legacy[1])<=now+900000;
}).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)||String(b._id).localeCompare(String(a._id)))[0];
const items=[...ordinary,...(preview?[preview]:[])].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)||String(b._id).localeCompare(String(a._id))).slice(0,50);
const unread=ordinaryUnread+(preview&&!preview.readAt?1:0);
const parties=await Party.find({leaderId:{$in:[...new Set(items.filter(n=>n.status==="pending").map(n=>n.actorId))]},"invites.toId":userId},{leaderId:1,invites:1}).lean();
return{unread,items:items.map(n=>n.kind!=='party_invite'?{id:String(n._id),kind:n.kind,title:n.title||'Ranked World',body:n.body||'You have an update.',actorName:'Ranked World',avatar:'/img/planet.png',createdAt:n.createdAt,readAt:n.readAt||null,status:'info',to:typeof n.to==='string'&&n.to.startsWith('/')&&!n.to.startsWith('//')&&!/[\\\u0000-\u0020]/.test(n.to)?n.to:'/notifications'}:({id:String(n._id),kind:n.kind,title:"Party invitation",body:`${n.actorName||"A player"} invited you to their party.`,actorName:n.actorName||"A player",avatar:n.avatar||"",createdAt:n.createdAt,readAt:n.readAt||null,status:n.status!=="pending"?n.status:parties.some(p=>p.leaderId===n.actorId&&p.invites.some(i=>i.toId===userId&&new Date(i.at).getTime()===new Date(n.invitedAt).getTime()))?"pending":"unavailable",to:"/play?mode=scrims"}))};
}
export async function markNotificationsRead(userId,body){
const filter={userId,readAt:null};
if(body?.all!==true){if(!Array.isArray(body?.ids)||!body.ids.length||body.ids.length>50||body.ids.some(id=>typeof id!=="string"||! /^[a-f0-9]{24}$/i.test(id)))throw createError({statusCode:400,statusMessage:"Choose valid notifications"});filter._id={$in:[...new Set(body.ids)]}}
await connectDb();
await Notification.updateMany(filter,{$set:{readAt:new Date()}});
return{ok:true};
}
