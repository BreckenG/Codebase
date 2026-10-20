import{currentUser}from"../utils/auth";
import features from"../../../../packages/shared/features.cjs";

const PRACTICE_TESTERS=new Set(["1185849692395929611","1075160686000349286","1269741594538414122","1226251910961430589"]);
export default defineEventHandler((event)=>{const locked={...features.LOCKED};if(PRACTICE_TESTERS.has(String(currentUser(event)?.id)))delete locked.practice;return{locked};});
