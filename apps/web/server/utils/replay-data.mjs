const finite = n => typeof n === 'number' && Number.isFinite(n)
const vector = (v, size = 3) => Array.isArray(v) && v.length === size && v.every(n => finite(n) && Math.abs(n) <= 1000000)
const round = n => Math.round(n * 1000) / 1000
const text = (v, fallback = 'Unknown') => typeof v === 'string' ? v.slice(0, 80) : fallback

export function summarizeReplay(raw) {
  if (raw?.schemaVersion !== 2 || !Array.isArray(raw.records) || !finite(raw.startedAt)) throw new Error('Unsupported replay')
  const participants = new Set(), bots = new Set()
  let durationMs = 0, frames = 0
  for (const r of raw.records) {
    if (r.type === 'frame' && finite(r.t) && r.t >= 0 && r.p && typeof r.p === 'object') {
      durationMs = Math.max(durationMs, r.t)
      frames++
      for (const id of Object.keys(r.p)) participants.add(id)
    }
    if (r.type === 'players' && Array.isArray(r.players)) for (const p of r.players) if (p.bot === true) bots.add(p.id)
  }
  return { id: raw.id, startedAt: raw.startedAt, durationMs, frames, map: text(raw.map), kind: text(raw.kind), participants: [...participants], bots: [...bots] }
}

export function accessibleReplays(rows, identities, entitlement, now = Date.now()) {
  const count = Math.max(0, Math.min(100, Number(entitlement.replayCount) || 0))
  const days = Math.max(0, Math.min(30, Number(entitlement.replayDays) || 0))
  const minutes = Math.max(0, Math.min(60, Number(entitlement.replayMinutes) || 0))
  if (!count || !days || !minutes) return []
  return rows.filter(r => r.frames > 0 && r.startedAt <= now && r.startedAt >= now - days * 86400000 && r.participants.some(id => identities.has(id))).sort((a, b) => b.startedAt - a.startedAt || a.id.localeCompare(b.id)).slice(0, count).map(r => ({ ...r, actualDurationMs: r.actualDurationMs ?? r.durationMs, durationMs: Math.min(r.durationMs, minutes * 60000), clipped: r.durationMs > minutes * 60000 }))
}

function geometry(raw) {
  const g = raw.mapGeometry
  const unavailable = { available: false, reason: 'A matching captured map is unavailable for this recording.' }
  const mismatched = g?.match === 'map_name_version_mismatch'
  if (!g?.available || !raw.map || raw.map === 'Unknown' || !raw.gameVersion || raw.gameVersion === 'Unknown' || g.map?.toLowerCase() !== raw.map.toLowerCase() || (!mismatched && g.gameVersion !== raw.gameVersion) || g.match === 'unverified_reference') return unavailable
  if (!Array.isArray(g.vertices) || !Array.isArray(g.edges) || g.vertices.length > 1800000 || g.vertices.length % 3 || g.edges.length % 2 || g.edges.length > 3600000 || g.vertices.some(n => !finite(n) || Math.abs(n) > 1000000) || g.edges.some(n => !Number.isInteger(n) || n < 0 || n >= g.vertices.length / 3)) return unavailable
  const triangles = g.triangles ?? []
  if (!Array.isArray(triangles) || triangles.length % 3 || triangles.length > 1800000 || triangles.some(n => !Number.isInteger(n) || n < 0 || n >= g.vertices.length / 3)) return unavailable
  const stale = mismatched ? ` The map was captured on game version ${text(g.gameVersion)} and this recording ran on ${text(raw.gameVersion)}, so anything that update moved is not shown.` : ''
  return { available: true, vertices: g.vertices, edges: g.edges, triangles, renderMode: triangles.length ? 'surfaces' : 'wireframe', reference: true, gameVersionMatch: !mismatched, reason: (triangles.length ? 'Captured collider surfaces. Visual textures, dynamic objects and scene changes are not recorded.' : 'Captured edges only. Walls cannot hide players in this recording. Dynamic objects and scene changes are not recorded.') + stale }
}

function cleanPose(p) {
  if (!p || !['h', 'b', 'l', 'r'].every(k => vector(p[k])) || finite(p.ageMs) && p.ageMs > 500) return null
  return { h: p.h, b: p.b, l: p.l, r: p.r, q: vector(p.q, 4) && Math.hypot(...p.q) > 0.001 ? p.q : null, tag: p.tag === 0 || p.tag === 1 ? p.tag : null }
}

export function scrubReplay(raw, allowed, self, maximumDurationMs = Infinity) {
  const complete = summarizeReplay(raw)
  const end = Math.max(0, Math.min(complete.durationMs, maximumDurationMs))
  const records = raw.records.filter(r => !finite(r.t) || r.t <= end)
  const summary = summarizeReplay({ ...raw, records })
  const ids = summary.participants.filter(id => allowed.has(id))
  const aliases = new Map(ids.map((id, i) => [id, `p${i + 1}`]))
  const metadata = new Map()
  for (const r of records) if (r.type === 'players' && Array.isArray(r.players)) for (const p of r.players) if (aliases.has(p.id)) metadata.set(p.id, p)
  const players = ids.map(id => {
    const p = metadata.get(id)
    return { id: aliases.get(id), name: text(p?.name, `Player ${aliases.get(id).slice(1)}`), self: id === self, bot: p?.bot === true, platform: ['steam', 'meta'].includes(p?.platform) ? p.platform : 'unknown', color: vector(p?.color) ? p.color.map(n => Math.max(0, Math.min(1, n))) : null }
  })
  const frames = records.filter(r => r.type === 'frame' && finite(r.t) && r.t >= 0).sort((a, b) => a.t - b.t).flatMap(r => {
    const p = {}
    for (const [id, pose] of Object.entries(r.p || {})) {
      if (!aliases.has(id)) continue
      const clean = cleanPose(pose)
      if (clean) p[aliases.get(id)] = clean
    }
    return Object.keys(p).length ? [{ t: r.t, p }] : []
  })
  const events = records.filter(r => r.type === 'tag' && finite(r.t) && r.t >= 0 && aliases.has(r.tagger) && aliases.has(r.target)).map(r => ({ type: 'tag', t: r.t, tagger: aliases.get(r.tagger), target: aliases.get(r.target) })).sort((a, b) => a.t - b.t)
  const stats = players.map(player => {
    let last, distance = 0, seconds = 0, peak = 0, tagged = 0, untagged = 0, known = 0
    for (const f of frames) {
      const p = f.p[player.id]
      if (!p) { last = null; continue }
      if (last) {
        const dt = (f.t - last.t) / 1000
        if (dt > 0 && dt <= 0.5) {
          const d = Math.hypot(...p.b.map((n, k) => n - last.p.b[k]))
          if (d / dt <= 30) {
            distance += d; seconds += dt; peak = Math.max(peak, d / dt)
            if (last.p.tag !== null) { known += dt; if (last.p.tag) tagged += dt; else untagged += dt }
          }
        }
      }
      last = { p, t: f.t }
    }
    return { id: player.id, distanceMeters: round(distance), sampledSeconds: round(seconds), averageSpeedMps: seconds ? round(distance / seconds) : null, peakSpeedMps: seconds ? round(peak) : null, taggedSeconds: known ? round(tagged) : null, untaggedSeconds: known ? round(untagged) : null, tags: events.filter(e => e.tagger === player.id).length, timesTagged: events.filter(e => e.target === player.id).length }
  })
  return { id: summary.id, startedAt: summary.startedAt, durationMs: end, actualDurationMs: complete.durationMs, clipped: end < complete.durationMs, map: summary.map, kind: summary.kind, players, frames, events, mapGeometry: geometry(raw), analytics: { players: stats, estimated: true, surfaceTime: null, jukes: null, note: 'Movement and runtime estimates use poses in the available playback segment. Gaps over 0.5 seconds, stale poses and jumps over 30 m/s are excluded. Tags count recorded events only. Surface time and jukes are unavailable because this telemetry does not reliably identify them.' } }
}
