import{DIVISIONS}from"@ranked-world/ranks";
export default defineEventHandler(event=>{
setResponseHeader(event,"cache-control","public, max-age=3600");
return{divisions:DIVISIONS};
});
