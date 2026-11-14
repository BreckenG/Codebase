import{requireUser}from'../../utils/auth';
import{sessionCounts}from'../../utils/session-store.js';
export default defineEventHandler(async event=>{
const user=requireUser(event);
return await sessionCounts(user.id);
});
