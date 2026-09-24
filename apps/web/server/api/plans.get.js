import{TRAINER_CATEGORIES,PRACTICE_PER_DAY}from"../utils/plans";
export default defineEventHandler(event=>{
setResponseHeader(event,"cache-control","public, max-age=3600");
return{trainerCategories:TRAINER_CATEGORIES,practicePerDay:PRACTICE_PER_DAY};
});
