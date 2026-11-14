import { stripe, requireBilling } from './billing';
import { Referral, ReferralCredit } from './referral-models';
import { creditInvoice } from './referrals';
import { withBillingLease } from './billing-lease';
import { recoverReferralTransfer, referralPayoutState } from './referral-transfers';
export async function payReferralInvoice(invoiceId) {
  requireBilling();
  await creditInvoice(invoiceId);
  const result = await withBillingLease(`referral:${invoiceId}`, async () => {
    let credit = await ReferralCredit.findOne({ invoiceId }).lean();
    if (!credit) return { paid: false, reason: 'not_found' };
    credit = await recoverReferralTransfer(credit);
    if (credit.transferId) return { paid: false, reason: 'already_transferred' };
    if (credit.status !== 'ready' || new Date(credit.availableAt) > new Date() || credit.commissionCents <= 0) return { paid: false, reason: 'not_eligible' };
    const ref = await Referral.findOne({ code: credit.code }).lean();
    if (!ref?.connectAccountId || !(await referralPayoutState(ref)).ready) return { paid: false, reason: 'onboarding_required' };
    if (credit.transferRequestedCents && credit.transferRequestedCents !== credit.commissionCents) return { paid: false, reason: 'payment_changed_review_required' };
    await ReferralCredit.updateOne({ invoiceId }, { $set: { transferRequestedCents: credit.commissionCents } });
    const transfer = await stripe().transfers.create({ amount: credit.commissionCents, currency: credit.currency, destination: ref.connectAccountId, transfer_group: `referral_${invoiceId}`, metadata: { referralInvoice: invoiceId, referralCode: credit.code } }, { idempotencyKey: `referral-transfer:${invoiceId}` });
    await ReferralCredit.updateOne({ invoiceId }, { $set: { transferId: transfer.id, transferredCents: transfer.amount, reversedCents: transfer.amount_reversed || 0, transferredAt: new Date(transfer.created * 1000) } });
    return { paid: true, amount: transfer.amount, currency: credit.currency };
  });
  await creditInvoice(invoiceId);
  return result;
}
