import{LEADERBOARD_SORTS,LEADERBOARD_METRICS}from"../utils/players";
export default defineEventHandler(event=>{
setResponseHeader(event,"cache-control","public, max-age=3600");
const metrics=[];
for(const m of LEADERBOARD_METRICS)metrics.push({key:m.key,label:m.label});
return{sorts:LEADERBOARD_SORTS,metrics};
});
