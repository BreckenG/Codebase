export function publicProfile(profile,isOwner){
if(isOwner)return profile;
const{discordId,name,username,avatar,linked,ranked,scrim,discord,position,playerCard,matches}=profile;
return{discordId,name,username,avatar,linked,ranked,scrim,discord,position,playerCard,matches:matches.map(({track,category,delta,afterElo,placement,lobbySize,tags,won,at})=>({track,category,delta,afterElo,placement,lobbySize,tags,won,at}))};
}
