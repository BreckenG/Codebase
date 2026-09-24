import{requireUser,clearAuthSession}from'../../utils/auth';
import{revokeAllForUser}from'../../utils/session-store.js';
export default defineEventHandler(async event=>{
const user=requireUser(event);
const body=await readBody(event);
if(body?.action!=='logout-everywhere')throw createError({statusCode:400,statusMessage:'Unknown action.'});
const counts=await revokeAllForUser(user.id);
clearAuthSession(event);
return{signedOut:true,...counts};
});
