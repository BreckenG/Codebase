export function commissionCents(paid,tax,percent,refunded=0,disputed=false){
if(disputed||paid<=0)return 0;
const remaining=Math.max(0,1-Math.max(0,refunded)/paid);
return Math.max(0,Math.round(Math.max(0,paid-tax)*Math.min(100,Math.max(0,percent))/100*remaining));
}
export function referralCode(value){
const code=String(value||'').trim().toUpperCase();
return /^[A-Z0-9]{3,20}$/.test(code)?code:null;
}
