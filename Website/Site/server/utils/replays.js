import path from 'node:path'
import crypto from 'node:crypto'
import { currentUser } from './auth'
import { entitlementFor } from './entitlements'
import { Player, MatchLedger, connectDb } from './db'
import { ReplayStore } from './replay-store.mjs'
import { evict } from './request-limits.js'
import caps from '../../../../packages/shared/capacity.cjs'

let store
let legacyIdentities = { at: 0, profiles: [] }
const requests = new Map()
export async function replayContext(event) {
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'Vary', 'Cookie, Authorization')
  const user = currentUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sign in to view your replays' })
  const now = Date.now()
  for (const [id, window] of requests) if (window.at < now - 60000) requests.delete(id)
  const window = requests.get(user.id) || { at: now, count: 0 }

  if (!requests.has(user.id) && requests.size >= caps.REPLAY_MAP_MAX) evict(requests, caps.REPLAY_MAP_MAX)
  if (++window.count > 30) throw createError({ statusCode: 429, statusMessage: 'Wait a moment before loading another replay' })
  requests.set(user.id, window)
  await connectDb()
  const entitlement = await entitlementFor(user.id)
  const caller = await Player.findOne({ discordId: user.id }, 'discordId photonId linked acceptance.replays').lean()
  return { user, entitlement, caller }
}
export async function replayService(context, replayId) {
  const root = process.env.REPLAY_DIR
  if (!root || !path.isAbsolute(root)) throw createError({ statusCode: 503, statusMessage: 'Replay storage is not configured' })
  if (!store || store.root !== path.resolve(root)) store = new ReplayStore(root)
  let profiles = [context.caller].filter(Boolean)
  if (replayId) {
    const { rows, key } = await store.permitted(context.user.id, profiles, context.entitlement)
    const row = rows.find(r => r.id === replayId)
    if (!row) return { store, profiles }
    const owners = new Set([context.user.id, ...Object.values(row.owners)])
    const legacy = new Set(row.participants.filter(id => !row.owners[id] && !row.bots.includes(id)))
    if (legacy.size) {
      if (legacyIdentities.at < Date.now() - 60000) {
        const entries = await Player.find({ linked: true, photonId: { $type: 'string' } }, 'discordId photonId linked').limit(50000).lean()
        legacyIdentities = { at: Date.now(), profiles: entries }
      }
      for (const p of legacyIdentities.profiles) if (legacy.has(crypto.createHmac('sha256', key).update(p.photonId).digest('hex').slice(0, 32))) owners.add(p.discordId)
    }
    profiles = await Player.find({ discordId: { $in: [...owners] } }, 'discordId photonId linked acceptance.replays').lean()
  }
  return { store, profiles }
}
export function replayStore() {
  const root = process.env.REPLAY_DIR
  if (!root || !path.isAbsolute(root)) throw createError({ statusCode: 503, statusMessage: 'Replay storage is not configured' })
  if (!store || store.root !== path.resolve(root)) store = new ReplayStore(root)
  return store
}
export async function adminReplayTarget(event) {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const value = String(getQuery(event).player || '').trim()
  if (!value || value.length > 64) throw createError({ statusCode: 400, statusMessage: 'Choose a player.' })
  await connectDb()
  const found = await Player.find({ $or: [{ discordId: value }, { photonId: value }] }, 'discordId photonId name username').limit(2).lean()
  const profile = found.find(p => p.discordId === value) || found[0]
  if (!profile && !/^\d{17,20}$/.test(value)) throw createError({ statusCode: 404, statusMessage: 'Player not found.' })
  return { discordId: profile ? profile.discordId || null : value, photonId: profile?.photonId || null, name: profile?.name || profile?.username || null }
}
export async function basicReplayStats(userId) {
  const rows = await MatchLedger.find({ discordId: userId }).sort({ createdAt: -1 }).limit(25).select('tags survivalSeconds isWinner').lean()
  return { rounds: rows.length, tags: rows.reduce((n, r) => n + (Number(r.tags) || 0), 0), untaggedSeconds: Math.round(rows.reduce((n, r) => n + (Number(r.survivalSeconds) || 0), 0)), wins: rows.filter(r => r.isWinner).length, scope: 'Your most recent 25 scored rounds' }
}
