import mongoose from 'mongoose'
import { currentUser } from '../../utils/auth'
import { entitlementFor } from '../../utils/entitlements'
import { Player, connectDb } from '../../utils/db'

const LAYERS = ['run', 'chase', 'caught', 'tags']
function cells(value) {
  const out = []
  for (const [key, n] of Object.entries(value || {})) {
    const at = key.split('_').map(Number)
    if (at.length === 3 && at.every(Number.isInteger) && Number.isFinite(n) && n > 0) out.push(at[0], at[1], at[2], Math.round(n))
  }
  return out
}
export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'Vary', 'Cookie, Authorization')
  const user = currentUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in to view your heat map' })
  await connectDb()
  const entitlement = await entitlementFor(user.id)
  if (!entitlement.isPro) return { locked: true }
  const caller = await Player.findOne({ discordId: user.id }, 'photonId linked').lean()
  const doc = caller?.linked && caller.photonId ? await mongoose.connection.db.collection('heatmaps').findOne({ _id: caller.photonId }) : null
  return { locked: false, linked: Boolean(caller?.linked && caller.photonId), rounds: doc?.rounds || 0, layers: Object.fromEntries(LAYERS.map(k => [k, cells(doc?.[k])])) }
})
