import mongoose from 'mongoose'
import { connectDb } from './db'
import { desktopClientIp } from './desktop-client.js'
import { scramble } from './devices.js'

const QUIET_MS = 600000
const SKIP = ['/api/avatar', '/api/replay-map', '/api/replay-tex', '/api/me/notifications', '/api/billing/webhook']
const seen = new Map()
let indexed = false

export function activityAction(method, path) {
  const clean = String(path || '').split('?')[0].split('/').map(part => /^\d{15,20}$/.test(part) || /^[a-f0-9-]{24,}$/i.test(part) ? ':id' : part.slice(0, 40)).join('/')
  return `${method} ${clean}`.slice(0, 120)
}

export function recordActivity(event, user) {
  const path = event.path || '', method = event.node.req.method || 'GET'
  if (!user?.id || SKIP.some(prefix => path.startsWith(prefix))) return
  const action = activityAction(method, path), key = user.id + ' ' + action, now = Date.now()
  if (method === 'GET' && seen.get(key) > now - QUIET_MS) return
  seen.set(key, now)
  if (seen.size > 20000) for (const [k, at] of seen) if (at < now - QUIET_MS) seen.delete(k)
  const ip = desktopClientIp(event)
  const row = {
    at: new Date(now), discordId: user.id, username: String(user.username || '').slice(0, 40), source: event.context?.desktopUser ? 'launcher' : 'web', action,
    ip: ip === 'unknown' ? null : scramble('ip', ip),
    device: String(getRequestHeader(event, 'user-agent') || '').slice(0, 160),
    lang: String(getRequestHeader(event, 'accept-language') || '').split(',')[0].slice(0, 12) || null,
  }
  connectDb().then(async () => {
    const rows = mongoose.connection.db.collection('activity')
    if (!indexed) {
      indexed = true
      await Promise.all([rows.createIndex({ discordId: 1, at: -1 }), rows.createIndex({ ip: 1, at: -1 }), rows.createIndex({ at: 1 }, { expireAfterSeconds: 180 * 86400 })])
    }
    await rows.insertOne(row)
  }).catch(e => console.error('activity', e.message))
}
