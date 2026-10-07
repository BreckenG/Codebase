import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import { promisify } from 'node:util'
import mongoose from 'mongoose'
import { scrubReplay } from './replay-data.mjs'

const gunzip = promisify(zlib.gunzip)
const KEEP_DAYS = 5
const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
const rounds = () => mongoose.connection.db.collection('ranked_replays')
let map = { stamp: 0, value: null }

function folder() {
  const root = process.env.REPLAY_DIR
  if (!root || !path.isAbsolute(root)) throw new Error('Replay storage is not configured')
  return path.join(root, 'ranked')
}
const mine = (userId, photonId) => ({ $or: [{ discordIds: userId }, ...(photonId ? [{ photonIds: photonId }] : [])] })
const row = (r, minutes = 60) => ({ id: r._id, code: r.code, startedAt: new Date(r.startedAt).getTime(), durationMs: Math.min(r.durationMs, minutes * 60000), actualDurationMs: r.durationMs, clipped: r.durationMs > minutes * 60000, map: 'Forest', kind: 'ranked' })

export async function rankedReplayRows(userId, photonId, entitlement, now = Date.now()) {
  const count = Math.max(0, Math.min(100, Number(entitlement.replayCount) || 0))
  const days = Math.min(KEEP_DAYS, Number(entitlement.replayDays) || 0)
  const minutes = Math.max(0, Math.min(60, Number(entitlement.replayMinutes) || 0))
  if (!count || !days || !minutes) return []
  const found = await rounds().find({ ...mine(userId, photonId), startedAt: { $gte: new Date(now - days * 86400000) } }).sort({ startedAt: -1 }).limit(count).project({ code: 1, startedAt: 1, durationMs: 1 }).toArray()
  return found.map(r => row(r, minutes))
}

export async function rankedReplaysOf(discordId, photonId, limit = 200) {
  if (!discordId && !photonId) return []
  const found = await rounds().find(mine(discordId || '-', photonId)).sort({ startedAt: -1 }).limit(limit).project({ code: 1, startedAt: 1, durationMs: 1 }).toArray()
  return found.map(r => row(r))
}

export async function rankedReplayFeed(before, limit) {
  const query = Number.isFinite(before) ? { startedAt: { $lt: new Date(before) } } : {}
  const [found, total] = await Promise.all([rounds().find(query).sort({ startedAt: -1 }).limit(limit + 1).toArray(), rounds().estimatedDocumentCount()])
  return { total, more: found.length > limit, rows: found.slice(0, limit).map(r => ({ id: r._id, code: r.code, startedAt: new Date(r.startedAt).getTime(), durationMs: r.durationMs, kind: 'ranked', players: r.players.map(p => p.name || 'Player'), openAs: r.discordIds[0] || r.photonIds[0] })) }
}

async function geometry() {
  const file = path.join(folder(), 'map.json')
  const stat = await fs.stat(file).catch(() => null)
  if (!stat) return { available: false }
  if (map.stamp !== stat.mtimeMs) map = { stamp: stat.mtimeMs, value: JSON.parse(await fs.readFile(file, 'utf8')) }
  return map.value
}

async function read(doc) {
  const text = (await gunzip(await fs.readFile(path.join(folder(), doc._id + '.ndjson.gz')), { maxOutputLength: 268435456 })).toString('utf8')
  const records = [], owner = new Map()
  for (const line of text.split('\n')) {
    if (!line) continue
    const r = JSON.parse(line)
    if (r.type === 'players' && Array.isArray(r.players)) {
      for (const p of r.players) owner.set(p.id, p.uid)
      records.push({ type: 'players', t: r.t, players: r.players.map(p => ({ id: p.id, name: p.name, color: p.color, platform: p.platform })) })
    } else if (r.type === 'frame' || r.type === 'tag') records.push(r)
  }
  const g = await geometry()
  const raw = { schemaVersion: 2, id: doc._id, code: doc.code, kind: 'ranked', startedAt: new Date(doc.startedAt).getTime(), map: 'Forest', gameVersion: g.match === 'map_name_version_mismatch' ? doc.gameVersion : g.gameVersion || doc.gameVersion, mapGeometry: g, records }
  return { raw, owner }
}

export async function rankedPlayback(id, viewer, maximumMs = Infinity, open = false) {
  if (typeof id !== 'string' || !idPattern.test(id)) return undefined
  const doc = await rounds().findOne({ _id: id })
  if (!doc) return undefined
  const inIt = doc.discordIds.includes(viewer.discordId) || (viewer.photonId && doc.photonIds.includes(viewer.photonId))
  if (!open && !inIt) return null
  const { raw, owner } = await read(doc)
  const ids = [...new Set(owner.keys())]
  const own = new Set(doc.players.filter(p => (viewer.discordId && p.discordId === viewer.discordId) || (viewer.photonId && p.photonId === viewer.photonId)).map(p => p.photonId))
  const linked = ids.find(a => own.has(owner.get(a)))
  const self = linked || (open ? ids[0] : null)
  if (!self) return null
  return scrubReplay(raw, new Set(ids), self, maximumMs)
}
