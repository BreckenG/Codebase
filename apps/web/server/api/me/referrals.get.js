import{requireUser}from'../../utils/auth';
import{connectDb}from'../../utils/db';
import{Referral,ReferralCredit}from'../../utils/referral-models';
import{referralPayoutState}from'../../utils/referral-transfers';
export default defineEventHandler(async event=>{
const user=requireUser(event);await connectDb();
const codes=await Referral.find({ownerId:user.id}).lean();
const credits=await ReferralCredit.find({ownerId:user.id},'commissionCents currency status availableAt createdAt transferId transferredCents reversedCents reversalPending').sort({createdAt:-1}).limit(100).lean();
return{codes:await Promise.all(codes.map(async c=>({code:c.code,discountPercent:c.discountPercent,commissionPercent:c.commissionPercent,active:c.active,payout:await referralPayoutState(c).catch(()=>({connected:!!c.connectAccountId,ready:false,unavailable:true}))}))),credits:credits.map(c=>({amount:c.commissionCents,currency:c.currency,status:c.reversalPending?'reversal_pending':c.status==='reversed'?'reversed':c.transferId?'transferred':c.status==='pending'&&new Date(c.availableAt)<=new Date()?'ready':c.status,availableAt:c.availableAt,createdAt:c.createdAt,transferredCents:c.transferredCents||0,reversedCents:c.reversedCents||0})),payoutsConfigured:codes.some(c=>c.connectAccountId)};
});
