export const CURRENCY="usd";
export const INTERVALS=[{key:"monthly",label:"Monthly",months:1,recurring:{interval:"month",interval_count:1}},{key:"quarterly",label:"Quarterly",months:3,recurring:{interval:"month",interval_count:3}},{key:"biannual",label:"Bi-annual",months:6,recurring:{interval:"month",interval_count:6}},{key:"yearly",label:"Yearly",months:12,recurring:{interval:"year",interval_count:1}}];
export const TRAINER_CATEGORIES=[{key:"ground",label:"Basic ground",tier:"free"},{key:"walls",label:"Basic walls",tier:"free"},{key:"branches",label:"Basic branches",tier:"free"},{key:"ground-adv",label:"Advanced ground",tier:"plus"},{key:"walls-adv",label:"Advanced walls",tier:"plus"},{key:"branches-adv",label:"Advanced branches",tier:"plus"},{key:"cutoffs",label:"Cut offs",tier:"plus"},{key:"pinches",label:"Pinches",tier:"pro"},{key:"tagging",label:"Tagging",tier:"pro"}];
export const PRACTICE_PER_DAY={free:1,plus:3,pro:10};
export const PRACTICE_DIFFICULTIES=[{value:"noob",label:"Noob",blurb:"Slow, loses speed on every turn, reacts late.",tier:"free"},{value:"easy",label:"Easy",blurb:"Runs clean lines but gives you room.",tier:"free"},{value:"average",label:"Average",blurb:"Plays like the middle of a public lobby.",tier:"free"},{value:"good",label:"Good",blurb:"Holds speed through turns and cuts you off.",tier:"plus"},{value:"best",label:"Best",blurb:"Everything it learned, at full speed.",tier:"pro"}];
const RANK={free:0,plus:1,pro:2};
export function trainerCategoriesFor(plan){
const rank=RANK[plan]??0;
const out=[];
for(const c of TRAINER_CATEGORIES){
if(RANK[c.tier]<=rank)out.push(c);
}
return out;
}
const FREE_PERKS=["Ranked codes and leaderboards","Basic profile card and movement stats","Practice matches: 1/day","AI Trainer: Basic categories (coming soon)","Match history: last 25 matches"];
export const TIERS=[{key:"plus",name:"Plus",blurb:"More stats and a recent replay library.",amounts:{monthly:299,quarterly:799,biannual:1499,yearly:2799},perks:["10 replays from the last 7 days, up to 15 minutes each","All available movement stats","More profile card themes and fonts","Priority scrim queue","Friend leaderboards and full Elo breakdowns","Practice matches: 3/day","Good practice difficulty","Advanced AI Trainer categories (coming soon)","Unlimited match history"]},{key:"pro",name:"Pro",blurb:"The full replay library and customization collection.",amounts:{monthly:799,quarterly:2099,biannual:3999,yearly:7499},perks:["100 replays from the last 30 days, up to 60 minutes each","All profile card themes, fonts and layouts","Upcoming ranked codes 15 minutes before rotation","Upcoming code notifications","Practice matches: 10/day and Best difficulty","All AI Trainer categories (coming soon)","All Plus benefits"]}];
const DEFAULT_INTERVAL="yearly";
export function lookupKey(tierKey,intervalKey){
return`rw_${tierKey}_${intervalKey}`;
}
function savingsPercent(t,i){
if(i.months===1)return 0;
const full=t.amounts.monthly*i.months;
return Math.round((1-t.amounts[i.key]/full)*100);
}
export function money(cents){
return`$${(cents/100).toFixed(2)}`;
}
export function tier(key){
for(const t of TIERS){
if(t.key===key)return t;
}
return null;
}
export function interval(key){
for(const i of INTERVALS){
if(i.key===key)return i;
}
return null;
}
export function catalog(){
const tiers=[];
for(const t of TIERS){
const intervals=[];
for(const i of INTERVALS){
intervals.push({key:i.key,label:i.label,months:i.months,lookupKey:lookupKey(t.key,i.key),amount:t.amounts[i.key],price:money(t.amounts[i.key]),perMonth:money(Math.round(t.amounts[i.key]/i.months)),savings:savingsPercent(t,i)});
}
tiers.push({key:t.key,name:t.name,blurb:t.blurb,perks:t.perks,monthly:money(t.amounts.monthly),intervals});
}
return{currency:CURRENCY,defaultInterval:DEFAULT_INTERVAL,free:{key:"free",name:"Free",perks:FREE_PERKS},trainerCategories:TRAINER_CATEGORIES,practicePerDay:PRACTICE_PER_DAY,tiers};
}
