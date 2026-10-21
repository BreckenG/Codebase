import{currentUser}from"../../utils/auth";
import{Player,CodeSession,connectDb}from"../../utils/db";
import{findPlayer}from"../../utils/players";
import{entitlementFor}from"../../utils/entitlements";
export default defineEventHandler(async event=>{
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"Sign in first"});
const body=await readBody(event);
const kind=body?.kind;
if(kind!=="peek"&&kind!=="first-in")throw createError({statusCode:400,statusMessage:"Unknown try"});
const doc=await findPlayer(user.id);
if(!doc?.linked)throw createError({statusCode:400,statusMessage:"Connect Gorilla Tag first"});
const perks=await entitlementFor(user.id);
if(kind==="peek"?perks.lobbyPreview:perks.firstIn)throw createError({statusCode:400,statusMessage:"Your plan already has this"});
const field=kind==="peek"?"tries.peekAt":"tries.firstInAt";
const set={[field]:new Date()};
if(kind==="peek"){
const code=String(body.code||"").toUpperCase();
if(!await CodeSession.exists({code,purpose:"ranked",active:true}))throw createError({statusCode:404,statusMessage:"That code is closed"});
set["tries.peekCode"]=code;
}
await connectDb();
const res=await Player.updateOne({_id:doc._id,[field]:null},{$set:set});
if(!res.modifiedCount)throw createError({statusCode:409,statusMessage:"You already used your free try"});
return{ok:true};
});
