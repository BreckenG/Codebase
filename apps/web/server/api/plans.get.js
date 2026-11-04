import{TRAINER_CATEGORIES,PRACTICE_PER_WEEK}from"../utils/plans";
export default defineEventHandler(event=>{
setResponseHeader(event,"cache-control","public, max-age=3600");
return{trainerCategories:TRAINER_CATEGORIES,practicePerWeek:PRACTICE_PER_WEEK};
});
