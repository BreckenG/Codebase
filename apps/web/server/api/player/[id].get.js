import{playerProfile}from"../../utils/players";
import{viewerFor}from"../../utils/viewer";
export default defineEventHandler(async event=>{
const viewer=await viewerFor(event);
const player=await playerProfile(getRouterParam(event,"id"),viewer);
if(!player)throw createError({statusCode:404,statusMessage:"not_found"});
return player;
});
