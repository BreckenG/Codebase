import{desktopAction}from'../../utils/desktop-auth.js';
export default defineEventHandler(event=>desktopAction(event,'request',30,async flow=>{
const grant=await flow.request(getQuery(event).code);
if(!grant)throw createError({statusCode:404,statusMessage:'This request is unavailable or expired.'});
return grant;
}));
