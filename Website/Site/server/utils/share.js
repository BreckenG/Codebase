import mongoose from 'mongoose';
import { stripe, requireBilling } from './billing';
import { connectDb, Player } from './db';
import { ReferralCredit } from './referral-models';
import { withBillingLease } from './billing-lease';
const model = (name, fields, collection) => mongoose.models[name] || mongoose.model(name, new mongoose.Schema(fields), collection);
export const ShareMember = model('ShareMember', { userId: { type: String, unique: true, required: true }, name: String, percent: { type: Number, default: 20 }, manual: { type: Boolean, default: false }, connectAccountId: String, createdAt: { type: Date, default: Date.now } }, 'share_members');
export const SharePayout = model('SharePayout', { _id: String, month: String, userId: String, cents: Number, method: String, transferId: String, paidAt: Date, paidBy: String }, 'share_payouts');
const ShareCharge = model('ShareCharge', { _id: String, gtc: Boolean }, 'share_charges');
const ShareMonth = model('ShareMonth', { _id: String, statement: mongoose.Schema.Types.Mixed, at: Date }, 'share_months');
export const FLOOR_CENTS = 6000;
const FIRST = '2026-09';
const SALE = new Set(['charge', 'payment']);
const SKIP = new Set(['transfer', 'transfer_refund', 'transfer_cancel', 'transfer_failure', 'payout', 'payout_cancel', 'payout_failure', 'topup', 'topup_reversal']);
const id = value => typeof value === 'string' ? value : value?.id;
const bounds = month => { const [y, m] = month.split('-').map(Number); return [Date.UTC(y, m - 1, 1) / 1000, Date.UTC(y, m, 1) / 1000]; };
const closed = month => bounds(month)[1] * 1000 <= Date.now();
const monthOf = date => new Date(date).toISOString().slice(0, 7);
export function months() {
  const out = [], now = new Date();
  for (let y = now.getUTCFullYear(), m = now.getUTCMonth() + 1; ; m--) {
    if (m === 0) { m = 12; y--; }
    const month = `${y}-${String(m).padStart(2, '0')}`;
    if (month < FIRST) break;
    out.push(month);
  }
  return out;
}
async function fromGtc(chargeId) {
  const known = await ShareCharge.findById(chargeId).lean();
  if (known) return known.gtc;
  const charge = await stripe().charges.retrieve(chargeId);
  const invoices = new Set(charge.invoice ? [id(charge.invoice)] : []);
  const intent = id(charge.payment_intent);
  if (intent) for await (const payment of stripe().invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: intent }, limit: 100 })) invoices.add(id(payment.invoice));
  const gtc = invoices.size > 0 && !!(await ReferralCredit.exists({ invoiceId: { $in: [...invoices] }, code: 'GTC' }));
  await ShareCharge.updateOne({ _id: chargeId }, { $set: { gtc } }, { upsert: true });
  return gtc;
}
async function tally(month) {
  const [gte, lt] = bounds(month);
  const s = { month, sales: 0, grossCents: 0, feeCents: 0, refundCents: 0, gtcSales: 0, gtcGrossCents: 0, gtcFeeCents: 0, gtcRefundCents: 0, otherCurrency: 0, failed: [], payers: [] };
  for await (const charge of stripe().charges.list({ created: { gte, lt }, limit: 100 })) {
    if (charge.currency !== 'usd') continue;
    if (charge.status === 'succeeded') s.payers.push({ customerId: id(charge.customer), at: charge.created });
    else if (charge.status === 'failed') s.failed.push({ customerId: id(charge.customer), at: charge.created, cents: charge.amount, blocked: charge.outcome?.type === 'blocked', why: charge.outcome?.seller_message || charge.failure_message || 'Declined' });
  }
  for await (const txn of stripe().balanceTransactions.list({ created: { gte, lt }, limit: 100, expand: ['data.source'] })) {
    if (SKIP.has(txn.type)) continue;
    if (txn.currency !== 'usd') { s.otherCurrency++; continue; }
    const source = txn.source && typeof txn.source === 'object' ? txn.source : null;
    const sale = SALE.has(txn.type);
    const chargeId = sale ? id(txn.source) : id(source?.charge);
    if (!chargeId) { s.feeCents += txn.fee - txn.amount; continue; }
    const gtc = await fromGtc(chargeId);
    if (sale) { s.grossCents += txn.amount; s.sales++; } else s.refundCents -= txn.amount;
    s.feeCents += txn.fee;
    if (!gtc) continue;
    if (sale) { s.gtcGrossCents += txn.amount; s.gtcSales++; } else s.gtcRefundCents -= txn.amount;
    s.gtcFeeCents += txn.fee;
  }
  return s;
}
async function monthStats(month) {
  const key = 'v3:' + month;
  const saved = closed(month) ? await ShareMonth.findById(key).lean() : null;
  const s = saved?.statement || await tally(month);
  if (closed(month) && !saved) await ShareMonth.updateOne({ _id: key }, { $set: { statement: s, at: new Date() } }, { upsert: true });
  const [gte, lt] = bounds(month).map(t => new Date(t * 1000));
  const [credits, gifts] = await Promise.all([
    ReferralCredit.find({ createdAt: { $gte: gte, $lt: lt }, status: { $ne: 'reversed' } }, 'commissionCents').lean(),
    SharePayout.find({ paidAt: { $gte: gte, $lt: lt } }, 'cents').lean(),
  ]);
  const netCents = s.grossCents - s.feeCents - s.refundCents;
  const partnerCents = credits.reduce((n, c) => n + (c.commissionCents || 0), 0);
  const givenCents = gifts.reduce((n, g) => n + (g.cents || 0), 0);
  const directNetCents = netCents - (s.gtcGrossCents - s.gtcFeeCents - s.gtcRefundCents);
  const failed = s.failed || [];
  return { ...s, closed: closed(month), netCents, partnerCents, givenCents, keptCents: netCents - partnerCents - givenCents, spareCents: Math.max(0, directNetCents - FLOOR_CENTS), failedCount: failed.length, failedCents: failed.reduce((n, f) => n + f.cents, 0), blockedCount: failed.filter(f => f.blocked).length };
}
async function memberState(member) {
  if (member.manual) return { manual: true, ready: true };
  if (!member.connectAccountId) return { connected: false, ready: false };
  const account = await stripe().accounts.retrieve(member.connectAccountId);
  return { connected: true, ready: Boolean(account.payouts_enabled && account.capabilities?.transfers === 'active'), detailsSubmitted: Boolean(account.details_submitted) };
}
async function subscribers() {
  const paying = [];
  for await (const sub of stripe().subscriptions.list({ status: 'active', limit: 100, expand: ['data.items.data.price'] })) {
    const item = sub.items?.data?.[0];
    const price = item?.price;
    const every = { day: 1 / 30, week: 12 / 52, month: 1, year: 12 }[price?.recurring?.interval] * (price?.recurring?.interval_count || 1) || 1;
    paying.push({ customerId: id(sub.customer), cents: price?.unit_amount || 0, months: every, monthlyCents: Math.round((price?.unit_amount || 0) / every), since: new Date(sub.created * 1000), renews: new Date((item?.current_period_end || sub.current_period_end || 0) * 1000), ending: !!sub.cancel_at_period_end, referral: sub.metadata?.referralCode || null });
  }
  const docs = await Player.find({ plan: { $in: ['plus', 'pro'] } }, 'discordId name username plan interval stripeCustomerId discordPlan').lean();
  const rows = docs.map(d => {
    const sub = paying.find(p => p.customerId && p.customerId === d.stripeCustomerId);
    return { userId: d.discordId, name: d.name || d.username || 'Unknown', username: d.username || null, plan: d.plan, interval: d.interval || null, source: sub ? 'stripe' : d.discordPlan ? 'discord' : 'granted', cents: sub?.cents || 0, monthlyCents: sub?.monthlyCents || 0, since: sub?.since || null, renews: sub?.renews || null, ending: sub?.ending || false, referral: sub?.referral || null };
  });
  return rows.sort((a, b) => b.monthlyCents - a.monthlyCents || a.name.localeCompare(b.name));
}
const CACHE_MS = 300000;
export const forget = () => ShareMonth.deleteOne({ _id: 'finance' });
export async function finance(fresh = false) {
  requireBilling();
  await connectDb();
  const saved = fresh ? null : await ShareMonth.findById('finance').lean();
  if (saved && Date.now() - new Date(saved.at).getTime() < CACHE_MS) return { ...saved.statement, cachedAt: saved.at };
  const out = await build();
  await ShareMonth.updateOne({ _id: 'finance' }, { $set: { statement: out, at: new Date() } }, { upsert: true });
  return out;
}
async function build() {
  const list = months();
  const stats = await Promise.all(list.map(monthStats));
  const [members, gifts, subs, balance] = await Promise.all([
    ShareMember.find({}, '-_id -__v').sort({ createdAt: 1 }).lean(),
    SharePayout.find({ paidAt: { $ne: null } }, '-__v').sort({ paidAt: -1 }).limit(200).lean(),
    subscribers(),
    stripe().balance.retrieve(),
  ]);
  const usd = rows => (rows || []).filter(b => b.currency === 'usd').reduce((n, b) => n + b.amount, 0);
  const sum = key => stats.reduce((n, s) => n + s[key], 0);
  const last = stats.find(s => s.closed) || stats[0];
  const paying = subs.filter(s => s.source === 'stripe');
  const payers = stats.flatMap(s => s.payers || []);
  const failed = stats.flatMap(s => s.failed || []).sort((a, b) => b.at - a.at).slice(0, 40);
  const who = await Player.find({ stripeCustomerId: { $in: [...new Set(failed.map(f => f.customerId).filter(Boolean))] } }, 'stripeCustomerId name username').lean();
  return {
    floorCents: FLOOR_CENTS,
    totals: { grossCents: sum('grossCents'), feeCents: sum('feeCents'), refundCents: sum('refundCents'), netCents: sum('netCents'), partnerCents: sum('partnerCents'), givenCents: sum('givenCents'), keptCents: sum('keptCents'), sales: sum('sales'), failedCount: sum('failedCount'), failedCents: sum('failedCents'), blockedCount: sum('blockedCount') },
    failed: failed.map(f => { const p = who.find(x => x.stripeCustomerId === f.customerId); return { at: new Date(f.at * 1000), name: p?.name || p?.username || 'Unknown', cents: f.cents, blocked: f.blocked, why: f.why, paidLater: payers.some(x => x.customerId && x.customerId === f.customerId && x.at > f.at) }; }),
    balance: { availableCents: usd(balance.available), pendingCents: usd(balance.pending) },
    subs: { paying: paying.length, granted: subs.length - paying.length, pro: subs.filter(s => s.plan === 'pro').length, plus: subs.filter(s => s.plan === 'plus').length, monthlyCents: paying.reduce((n, s) => n + s.monthlyCents, 0) },
    months: stats.map(({ failed: _f, payers: _p, ...s }) => s),
    suggest: { month: last.month, spareCents: last.spareCents, options: [10, 15, 20, 25].map(percent => ({ percent, cents: Math.floor(last.spareCents * percent / 100) })).filter(o => o.cents >= 100) },
    members: await Promise.all(members.map(async ({ connectAccountId, ...m }) => ({ ...m, givenCents: gifts.filter(g => g.userId === m.userId).reduce((n, g) => n + g.cents, 0), payout: await memberState({ ...m, connectAccountId }).catch(() => ({ connected: !!connectAccountId, ready: false, unavailable: true })) }))),
    gifts: gifts.map(g => ({ id: g._id, userId: g.userId, name: members.find(m => m.userId === g.userId)?.name || g.userId, cents: g.cents, method: g.method, paidAt: g.paidAt })),
    subscribers: subs,
  };
}
export async function memberView(userId) {
  await connectDb();
  const member = await ShareMember.findOne({ userId }).lean();
  if (!member) return null;
  const gifts = await SharePayout.find({ userId, paidAt: { $ne: null } }, 'cents method paidAt').sort({ paidAt: -1 }).limit(100).lean();
  return { payout: await memberState(member).catch(() => ({ ready: false, unavailable: true })), totalCents: gifts.reduce((n, g) => n + g.cents, 0), gifts: gifts.map(g => ({ cents: g.cents, method: g.method, paidAt: g.paidAt })) };
}
export async function memberOnboarding(userId, country, page) {
  requireBilling();
  await connectDb();
  return withBillingLease(`share-account:${userId}`, async () => {
    const member = await ShareMember.findOne({ userId }).lean();
    if (!member || member.manual) throw createError({ statusCode: 404, statusMessage: 'No payout setup for this account.' });
    let accountId = member.connectAccountId;
    if (!accountId) {
      if (!/^[A-Z]{2}$/.test(country || '')) throw createError({ statusCode: 400, statusMessage: 'Enter your two letter country code, like US.' });
      const account = await stripe().accounts.create({ type: 'express', country, capabilities: { transfers: { requested: true } }, metadata: { shareMember: userId } }, { idempotencyKey: `share-account:${userId}` });
      accountId = account.id;
      await ShareMember.updateOne({ userId }, { $set: { connectAccountId: accountId } });
    }
    const base = useRuntimeConfig().public.baseUrl.replace(/\/$/, '');
    const link = await stripe().accountLinks.create({ account: accountId, type: 'account_onboarding', return_url: `${base}${page}`, refresh_url: `${base}${page}` });
    return { url: link.url };
  });
}
export async function give(userId, cents, requestId, paidBy) {
  requireBilling();
  if (!Number.isInteger(cents) || cents < 100 || cents > 200000) throw createError({ statusCode: 400, statusMessage: 'Pick an amount from $1 to $2,000.' });
  if (!/^[a-f0-9-]{36}$/.test(requestId || '')) throw createError({ statusCode: 400, statusMessage: 'Try that again.' });
  await connectDb();
  const key = `gift:${requestId}`;
  return withBillingLease(`share:${key}`, async () => {
    if (await SharePayout.exists({ _id: key })) return { paid: false, reason: 'already_sent' };
    const member = await ShareMember.findOne({ userId }).lean();
    if (!member) throw createError({ statusCode: 404, statusMessage: 'That person is not on the list.' });
    const base = { month: monthOf(Date.now()), userId, cents, paidBy };
    if (member.manual) {
      await SharePayout.create({ _id: key, ...base, method: 'manual', paidAt: new Date() });
      return { paid: true, amount: cents, method: 'manual' };
    }
    if (!(await memberState(member)).ready) return { paid: false, reason: 'onboarding_required' };
    let transfer;
    try { transfer = await stripe().transfers.create({ amount: cents, currency: 'usd', destination: member.connectAccountId, transfer_group: `share_${base.month}`, metadata: { shareMember: userId, shareRequest: requestId } }, { idempotencyKey: `share-gift:${requestId}` }); }
    catch (error) {
      if (error.code === 'balance_insufficient') return { paid: false, reason: 'balance' };
      throw error;
    }
    await SharePayout.create({ _id: key, ...base, cents: transfer.amount, method: 'stripe', transferId: transfer.id, paidAt: new Date(transfer.created * 1000) });
    return { paid: true, amount: transfer.amount, method: 'stripe' };
  });
}
