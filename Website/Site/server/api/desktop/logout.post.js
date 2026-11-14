import{desktopAction}from'../../utils/desktop-auth.js';
export default defineEventHandler(event=>desktopAction(event,'logout',30,async flow=>{
if(!event.context.desktopToken)throw createError({statusCode:401,statusMessage:'Desktop sign in required.'});
await flow.revoke(event.context.desktopToken);
return{signedOut:true};
}));
