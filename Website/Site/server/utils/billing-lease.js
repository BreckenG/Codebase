import crypto from 'node:crypto';
import { connectDb } from './db';
import { BillingLease } from './referral-models';
export async function withBillingLease(id, operation) {
  await connectDb();
  const token = crypto.randomUUID();
  try {
    const lease = await BillingLease.findOneAndUpdate({ _id: id, expiresAt: { $lte: new Date() } }, { $set: { token, expiresAt: new Date(Date.now() + 300000) } }, { upsert: true, new: true });
    if (!lease) throw createError({ statusCode: 409, statusMessage: 'Billing is processing another request. Try again shortly.' });
  } catch (error) {
    if (error.code === 11000) throw createError({ statusCode: 409, statusMessage: 'Billing is processing another request. Try again shortly.' });
    throw error;
  }
  try { return await operation(); }
  finally { await BillingLease.deleteOne({ _id: id, token }); }
}
