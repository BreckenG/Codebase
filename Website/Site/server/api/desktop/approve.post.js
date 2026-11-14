import{desktopAction}from'../../utils/desktop-auth.js';
import{cookieUser}from'../../utils/auth.js';
export default defineEventHandler(event=>desktopAction(event,'approve',20,async flow=>{
const user=cookieUser(event);
if(!user)throw createError({statusCode:401,statusMessage:'Sign in with Discord first.'});
const body=await readBody(event);
if(!(await flow.approve(body?.userCode,user,body?.approved)))throw createError({statusCode:400,statusMessage:'This request is unavailable or expired.'});
return{approved:true};
}));
