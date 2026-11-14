import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { summarizeReplay, accessibleReplays, scrubReplay } from './replay-data.mjs'

const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
export const validReplayId = id => typeof id === 'string' && idPattern.test(id)
export const consented = p => p?.acceptance?.replays?.version === '2026-09-12' && Boolean(p.acceptance.replays.at) && !p.acceptance.replays.revokedAt
const hash = (key, id) => crypto.createHmac('sha256', key).update(id).digest('hex').slice(0, 32)

async function readPrivate(file, maxBytes) {
  const stat = await fs.lstat(file)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) throw new Error('Invalid private replay file')
  const handle = await fs.open(file, 'r')
  try {
    const opened = await handle.stat()
    if (opened.ino !== stat.ino || opened.dev !== stat.dev || opened.size !== stat.size || opened.mtimeMs !== stat.mtimeMs) throw new Error('Replay changed during read')
    const bytes = await handle.readFile()
    const after = await handle.stat()
    if (after.size !== opened.size || after.mtimeMs !== opened.mtimeMs) throw new Error('Replay changed during read')
    return bytes
  } finally { await handle.close() }
}

export class ReplayStore {
  constructor(root) { this.root = path.resolve(root); this.cache = new Map() }
  async init() {
    const stat = await fs.lstat(this.root)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Invalid replay directory')
    const key = await readPrivate(path.join(this.root, '.identity-key'), 32)
    if (key.length !== 32) throw new Error('Invalid replay identity key')
    return key
  }
  async read(id) {
    if (!validReplayId(id)) throw new Error('Invalid replay ID')
    const raw = JSON.parse((await readPrivate(path.join(this.root, id + '.json'), 268435456)).toString('utf8'))
    if (raw.id !== id) throw new Error('Replay ID mismatch')
    return raw
  }
  async owners(id) {
    try {
      const directory = path.join(this.root, '.owners')
      const stat = await fs.lstat(directory)
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Invalid replay owners directory')
      const value = JSON.parse((await readPrivate(path.join(directory, id + '.json'), 1048576)).toString('utf8'))
      return Object.fromEntries(Object.entries(value).filter(([player, discord]) => /^[a-f0-9]{32}$/.test(player) && typeof discord === 'string' && /^\d{17,20}$/.test(discord)))
    } catch (e) { if (e.code === 'ENOENT') return {}; throw e }
  }
  async index() {
    if (this.indexing) return this.indexing
    this.indexing = this.buildIndex()
    try { return await this.indexing } finally { this.indexing = null }
  }
  async buildIndex() {
    const names = (await fs.readdir(this.root)).filter(n => n.endsWith('.json') && validReplayId(n.slice(0, -5)))
    if (names.length > 20000) throw new Error('Replay index capacity exceeded')
    const rows = []
    for (const name of names) {
      const id = name.slice(0, -5)
      try {
        const stat = await fs.lstat(path.join(this.root, name))
        if (!stat.isFile() || stat.isSymbolicLink()) continue
        const stamp = [stat.size, stat.mtimeMs, stat.ctimeMs, stat.ino].join(':')
        let hit = this.cache.get(id)
        if (!hit || hit.stamp !== stamp) {
          hit = { stamp, row: summarizeReplay(await this.read(id)) }
          this.cache.set(id, hit)
        }
        rows.push({ ...hit.row, owners: await this.owners(id) })
      } catch (e) { console.error('Replay index skipped an unreadable archive', id) }
    }
    const live = new Set(rows.map(r => r.id))
    for (const id of this.cache.keys()) if (!live.has(id)) this.cache.delete(id)
    return rows
  }
  async permitted(userId, profiles, entitlement, now) {
    const key = await this.init()
    const caller = profiles.find(p => p.discordId === userId)
    if (!consented(caller)) return { rows: [], identities: new Set(), key }
    const identities = new Set(caller.linked && caller.photonId ? [hash(key, caller.photonId)] : [])
    const linkedIdentities = new Set(identities)
    const rows = await this.index()
    for (const row of rows) for (const [id, owner] of Object.entries(row.owners)) if (owner === userId) identities.add(id)
    const owned = rows.filter(row => row.participants.some(id => row.owners[id] ? row.owners[id] === userId : linkedIdentities.has(id)))
    return { rows: accessibleReplays(owned, identities, entitlement, now), identities, linkedIdentities, key }
  }
  async playback(userId, profiles, entitlement, id, now) {
    if (!validReplayId(id)) return null
    const { rows, identities, linkedIdentities, key } = await this.permitted(userId, profiles, entitlement, now)
    const row = rows.find(r => r.id === id)
    if (!row) return null
    const raw = await this.read(id)
    const current = new Set(profiles.filter(p => p.linked && p.photonId && consented(p)).map(p => hash(key, p.photonId)))
    const approved = new Set(profiles.filter(consented).map(p => p.discordId))
    for (const [player, owner] of Object.entries(row.owners)) {
      if (approved.has(owner)) current.add(player)
      else current.delete(player)
    }
    for (const bot of row.bots) current.add(bot)
    const summary = summarizeReplay(raw)
    if (!accessibleReplays([summary], identities, entitlement, now).length) return null
    const self = summary.participants.find(p => current.has(p) && (row.owners[p] ? row.owners[p] === userId : linkedIdentities.has(p)))
    if (!self) return null
    return scrubReplay(raw, current, self, Math.min(60, Number(entitlement.replayMinutes) || 0) * 60000)
  }
  async ownedBy(discordId, photonId) {
    const key = await this.init()
    const identity = photonId ? hash(key, photonId) : null
    const rows = (await this.index()).filter(row => row.frames > 0 && row.participants.some(id => row.owners[id] ? row.owners[id] === discordId : id === identity)).sort((a, b) => b.startedAt - a.startedAt || a.id.localeCompare(b.id))
    return { rows, identity }
  }
  async adminPlayback(discordId, photonId, id, maximumDurationMs) {
    if (!validReplayId(id)) return null
    const { rows, identity } = await this.ownedBy(discordId, photonId)
    const row = rows.find(r => r.id === id)
    if (!row) return null
    const raw = await this.read(id)
    const summary = summarizeReplay(raw)
    const self = summary.participants.find(p => row.owners[p] ? row.owners[p] === discordId : p === identity)
    return scrubReplay(raw, new Set(summary.participants), self, maximumDurationMs)
  }
}
