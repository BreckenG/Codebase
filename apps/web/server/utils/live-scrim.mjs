import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const TAIL_BYTES = 3 * 1024 * 1024
const WINDOW_MS = 12000
const hash = (key, id) => crypto.createHmac('sha256', key).update(id).digest('hex').slice(0, 32)
const finite = n => typeof n === 'number' && Number.isFinite(n)
const vector = (v, n = 3) => Array.isArray(v) && v.length === n && v.every(finite)
let mapCache = null

async function firstLine(file) {
  const handle = await fs.open(file, 'r')
  try {
    const buf = Buffer.alloc(65536)
    const { bytesRead } = await handle.read(buf, 0, buf.length, 0)
    const text = buf.subarray(0, bytesRead).toString('utf8')
    const end = text.indexOf('\n')
    return end > 0 ? JSON.parse(text.slice(0, end)) : null
  } finally { await handle.close() }
}

async function tail(file) {
  const handle = await fs.open(file, 'r')
  try {
    const { size } = await handle.stat()
    const start = Math.max(0, size - TAIL_BYTES)
    const buf = Buffer.alloc(size - start)
    await handle.read(buf, 0, buf.length, start)
    const lines = buf.toString('utf8').split('\n')
    if (start > 0) lines.shift()
    return lines.flatMap(line => { try { return line ? [JSON.parse(line)] : [] } catch { return [] } })
  } finally { await handle.close() }
}

async function journalFor(root, code) {
  const dir = path.join(root, '.pending')
  let names
  try { names = await fs.readdir(dir) } catch { return null }
  let best = null
  for (const name of names.filter(n => n.endsWith('.ndjson'))) {
    const file = path.join(dir, name)
    try {
      const stat = await fs.stat(file)
      if (best && stat.mtimeMs <= best.mtime) continue
      const header = await firstLine(file)
      if (header?.code === code) best = { file, header, mtime: stat.mtimeMs }
    } catch {}
  }
  return best
}

export async function liveView(root, key, code, roster) {
  const journal = await journalFor(root, code)
  if (!journal) return { available: false, frames: [], events: [], startedAt: null }
  const byHash = new Map(roster.map(p => [hash(key, p.photonId), p.id]))
  const records = await tail(journal.file)
  const frames = records.filter(r => r.type === 'frame' && finite(r.t))
  const latest = frames.length ? frames[frames.length - 1].t : 0
  const out = frames.filter(r => r.t >= latest - WINDOW_MS).map(r => {
    const p = {}
    for (const [id, pose] of Object.entries(r.p || {})) {
      const rid = byHash.get(id)
      if (!rid || !pose || !['h', 'b', 'l', 'r'].every(k => vector(pose[k]))) continue
      p[rid] = { h: pose.h, b: pose.b, l: pose.l, r: pose.r, q: vector(pose.q, 4) ? pose.q : null, tag: pose.tag === 1 ? 1 : 0 }
    }
    return { t: r.t, p }
  }).filter(f => Object.keys(f.p).length)
  const events = records.filter(r => r.type === 'tag' && finite(r.t) && r.t >= latest - WINDOW_MS && byHash.has(r.tagger) && byHash.has(r.target))
    .map(r => ({ type: 'tag', t: r.t, tagger: byHash.get(r.tagger), target: byHash.get(r.target) }))
  return { available: true, startedAt: journal.header.startedAt, latest, updatedAt: journal.mtime, frames: out, events }
}

export async function liveMap(root) {
  if (mapCache && Date.now() - mapCache.at < 3600000) return mapCache.value
  const names = (await fs.readdir(root)).filter(n => n.endsWith('.json'))
  const stats = await Promise.all(names.map(async n => ({ n, m: (await fs.stat(path.join(root, n))).mtimeMs })))
  stats.sort((a, b) => b.m - a.m)
  for (const { n } of stats.slice(0, 10)) {
    try {
      const raw = JSON.parse(await fs.readFile(path.join(root, n), 'utf8'))
      const g = raw.mapGeometry
      if (!g?.available || !Array.isArray(g.vertices) || !Array.isArray(g.edges)) continue
      const triangles = Array.isArray(g.triangles) ? g.triangles : []
      const value = { available: true, vertices: g.vertices, edges: g.edges, triangles, renderMode: triangles.length ? 'surfaces' : 'wireframe', reference: true, gameVersionMatch: true, reason: 'Forest reference map.' }
      mapCache = { at: Date.now(), value }
      return value
    } catch {}
  }
  return { available: false, reason: 'No captured map yet.' }
}
