import{desktopAction}from'../../utils/desktop-auth.js';
export default defineEventHandler(event=>desktopAction(event,'start',10,flow=>flow.start(new URL(useRuntimeConfig().public.baseUrl).origin)));
