import mirrorConfig from'../../../../packages/shared/mirror.cjs';
export const MIRROR=mirrorConfig;
export const PROVISIONAL_SIGMA=25/6;
const ELO_PER_DIVISION=100;
const TOP_INDEX=14;
export function mirrorEnabled(){
return process.env.MIRROR_BOT==="1";
}
export function rankedInput(p){
const r=p?.ranked;
if(!r||!r.roundsPlayed)return null;
const idx=Math.max(0,Math.min(TOP_INDEX,Math.floor(Math.max(0,r.elo||0)/ELO_PER_DIVISION)));
return{q:idx/TOP_INDEX,provisional:!r.skill||!(r.skill.sigma<=PROVISIONAL_SIGMA)};
}
