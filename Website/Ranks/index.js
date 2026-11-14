export const DIVISIONS=["Bronze 1", "Bronze 2", "Bronze 3", "Silver 1", "Silver 2", "Silver 3", "Gold 1", "Gold 2", "Gold 3", "Platinum 1", "Platinum 2", "Platinum 3", "Ruby 1", "Ruby 2", "Sapphire"];
export const CATEGORY_RANGES=[{"category": "LOW", "maxIndex": 5}, {"category": "MID", "maxIndex": 8}, {"category": "HIGH", "maxIndex": 11}, {"category": "TOP", "maxIndex": 14}];
export const TIER_NAMES=["Bronze","Silver","Gold","Platinum","Ruby","Sapphire"];
export const ELO_PER_DIVISION=100;
export const RANKED_SLOTS=10;
export const TOP_INDEX=DIVISIONS.length-1;
function clamp(n,lo,hi){
if(n<lo)return lo;
if(n>hi)return hi;
return n;
}
function divIndex(elo){
return clamp(Math.floor(elo/ELO_PER_DIVISION),0,TOP_INDEX);
}
function category(idx){
for(let i=0;i<CATEGORY_RANGES.length;i++){
if(idx<=CATEGORY_RANGES[i].maxIndex)return CATEGORY_RANGES[i].category;
}
return CATEGORY_RANGES[CATEGORY_RANGES.length-1].category;
}
export function tierForElo(elo){
elo=Math.max(0,Math.round(elo||0));
const index=divIndex(elo);
const floor=index*ELO_PER_DIVISION;
const isTop=index===TOP_INDEX;
const into=elo-floor;
let frac=into/ELO_PER_DIVISION;
if(isTop)frac=1;
const percent=Math.round(clamp(frac,0,1)*100);
const name=DIVISIONS[index];
return{elo,index,name,tier:name.split(" ")[0],category:category(index),isTop,eloToNext:isTop?null:floor+ELO_PER_DIVISION-elo,percent};
}
