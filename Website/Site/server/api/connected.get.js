import crypto from"node:crypto";
import{Player,connectDb}from"../utils/db";
export default defineEventHandler(async event=>{
const want=Buffer.from(useRuntimeConfig().linkApiKey||"");
const got=Buffer.from(String(getHeader(event,"x-api-key")||getQuery(event).key||""));
if(!want.length||got.length!==want.length||!crypto.timingSafeEqual(got,want))throw createError({statusCode:401,statusMessage:"Bad key"});
const id=String(getQuery(event).user||"");
if(!/^\d{17,20}$/.test(id))throw createError({statusCode:400,statusMessage:"Give a Discord ID"});
await connectDb();
setResponseHeader(event,"Content-Type","text/plain; charset=utf-8");
return await Player.exists({discordId:id,linked:true})?"User is connected":"User is disconnected";
});
