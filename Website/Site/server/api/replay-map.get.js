import fs from 'node:fs/promises'
import zlib from 'node:zlib'
import { currentUser } from '../utils/auth'

let cache = null
let stamp = 0
async function build(file, m) {
  const b = await fs.readFile(file)
  if (b.length < 20 || b.readUInt32LE(0) !== 0x334d5447) throw new Error('bad map')
  const n = b.readInt32LE(4), tiles = b.readInt32LE(8), h0 = 20 + tiles * 12
  if (n <= 0 || tiles < 0 || h0 + n * 74 !== b.length) throw new Error('bad map')
  const out = Buffer.alloc(h0 + n * 53)
  b.copy(out, 0, 0, h0)
  out.writeUInt32LE(0x31575447, 0)
  for (let i = 0; i < n * 9; i++) out.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(b.readFloatLE(h0 + i * 4) * 100))), h0 + i * 2)
  b.copy(out, h0 + n * 18, h0 + n * 36, h0 + n * 62)
  const tint = h0 + n * 62, light = h0 + n * 65, col = h0 + n * 44
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++)
    out[col + (i * 3 + k) * 3 + c] = Math.min(255, Math.round(b[tint + i * 3 + c] / 255 * b[light + (i * 3 + k) * 3 + c]))
  return { raw: out, gz: zlib.gzipSync(out, { level: 6 }), tag: `"m${m}"` }
}
export default defineEventHandler(async event => {
  if (!currentUser(event)) throw createError({ statusCode: 401, statusMessage: 'Sign in to view replays' })
  const file = process.env.REPLAY_MAP_FILE
  if (!file) throw createError({ statusCode: 404, statusMessage: 'No colored map' })
  try {
    const m = Math.round((await fs.stat(file)).mtimeMs)
    if (!cache || m !== stamp) {
      cache = await build(file, m)
      stamp = m
    }
  } catch { throw createError({ statusCode: 404, statusMessage: 'No colored map' }) }
  setHeader(event, 'ETag', cache.tag)
  setHeader(event, 'Cache-Control', 'private, no-cache')
  setHeader(event, 'Vary', 'Cookie, Accept-Encoding')
  if (getRequestHeader(event, 'if-none-match') === cache.tag) {
    setResponseStatus(event, 304)
    return null
  }
  setHeader(event, 'Content-Type', 'application/octet-stream')
  if (/\bgzip\b/.test(getRequestHeader(event, 'accept-encoding') || '')) {
    setHeader(event, 'Content-Encoding', 'gzip')
    return cache.gz
  }
  return cache.raw
})
