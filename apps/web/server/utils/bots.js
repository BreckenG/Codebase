import bots from"../../../../packages/shared/bots.cjs";
import{currentUser}from"./auth";
export function requireBots(event){
const user=currentUser(event);
if(!user)throw createError({statusCode:401,statusMessage:"sign_in_required"});
if(!bots.botsAllowed(user.id))throw createError({statusCode:403,statusMessage:bots.CLOSED});
return user;
}
export const botsOpenFor=user=>bots.botsAllowed(user?.id);
