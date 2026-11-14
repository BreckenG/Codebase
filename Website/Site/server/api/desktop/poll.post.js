import{desktopAction}from'../../utils/desktop-auth.js';
export default defineEventHandler(event=>desktopAction(event,'poll',120,async flow=>{
const body=await readBody(event);
return flow.poll(body?.deviceCode);
}));
