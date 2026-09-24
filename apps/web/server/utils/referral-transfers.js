import { stripe, requireBilling } from './billing';
import { connectDb } from './db';
import { Referral, ReferralCredit } from './referral-models';
import { withBillingLease } from './billing-lease';
export async function referralPayoutState(ref) {
  if (!ref.connectAccountId) return { connected: false, ready: false, detailsSubmitted: false };
  const account = await stripe().accounts.retrieve(ref.connectAccountId);
  return { connected: true, ready: Boolean(account.payouts_enabled && account.capabilities?.transfers === 'active'), detailsSubmitted: Boolean(account.details_submitted) };
}
export async function referralOnboarding(code, country, ownerId, admin = false) {
  requireBilling();
  await connectDb();
  return withBillingLease(`referral-account:${code}`, async () => {
    const ref = await Referral.findOne({ code, ...(admin ? {} : { ownerId }) }).lean();
    if (!ref) throw createError({ statusCode: 404, statusMessage: 'Referral partner not found.' });
    let accountId = ref.connectAccountId;
    if (!accountId) {
      if (!/^[A-Z]{2}$/.test(country || '')) throw createError({ statusCode: 400, statusMessage: 'Choose your payout account country.' });
      const params = { type: 'express', country, capabilities: { transfers: { requested: true } }, metadata: { referralCode: code } };
      const key = `referral-account:${code}`;
      let account;
      try { account = await stripe().accounts.create(params, { idempotencyKey: key }); }
      catch (error) {
        if (error.type !== 'StripeInvalidRequestError' || !error.message?.includes("You can only create new accounts if you've signed up for Connect")) throw error;
        account = await stripe().accounts.create(params, { idempotencyKey: `${key}:connect-enabled` });
      }
      accountId = account.id;
      await Referral.updateOne({ code }, { $set: { connectAccountId: accountId } });
    }
    const base = useRuntimeConfig().public.baseUrl.replace(/\/$/, '');
    const page = admin ? '/admin' : '/subscribe';
    const link = await stripe().accountLinks.create({ account: accountId, type: 'account_onboarding', return_url: `${base}${page}?referral=return`, refresh_url: `${base}${page}?referral=refresh` });
    return { url: link.url };
  });
}
export async function recoverReferralTransfer(credit) {
  if (credit.transferId || !credit.transferRequestedCents) return credit;
  for await (const transfer of stripe().transfers.list({ transfer_group: `referral_${credit.invoiceId}`, limit: 100 })) {
    if (transfer.metadata?.referralInvoice !== credit.invoiceId) continue;
    const update = { transferId: transfer.id, transferredCents: transfer.amount, reversedCents: transfer.amount_reversed || 0, transferredAt: new Date(transfer.created * 1000) };
    await ReferralCredit.updateOne({ invoiceId: credit.invoiceId }, { $set: update });
    return { ...credit, ...update };
  }
  return credit;
}
export async function reverseReferralTransfer(invoiceId) {
  let credit = await ReferralCredit.findOne({ invoiceId }).lean();
  if (!credit) return;
  credit = await recoverReferralTransfer(credit);
  if (!credit.transferId) return;
  const transfer = await stripe().transfers.retrieve(credit.transferId);
  const desired = Math.max(0, transfer.amount - credit.commissionCents);
  const reversed = transfer.amount_reversed || 0;
  if (desired > reversed) {
    await ReferralCredit.updateOne({ invoiceId }, { $set: { reversalPending: true } });
    await stripe().transfers.createReversal(transfer.id, { amount: desired - reversed, metadata: { referralInvoice: invoiceId } }, { idempotencyKey: `referral-reversal:${invoiceId}:${desired}` });
  }
  await ReferralCredit.updateOne({ invoiceId }, { $set: { reversedCents: Math.max(desired, reversed), reversalPending: false } });
}
