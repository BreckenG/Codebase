import fs from 'node:fs/promises'
import path from 'node:path'
import { currentUser } from '../utils/auth'

let cache = null
let stamp = 0
export default defineEventHandler(async event => {
  if (!currentUser(event)) throw createError({ statusCode: 401, statusMessage: 'Sign in to view replays' })
  const file = process.env.REPLAY_MAP_FILE
  if (!file) throw createError({ statusCode: 404, statusMessage: 'No map texture' })
  const jpg = path.join(path.dirname(file), 'forest-tex.jpg')
  try {
    const m = Math.round((await fs.stat(jpg)).mtimeMs)
    if (!cache || m !== stamp) {
      cache = await fs.readFile(jpg)
      stamp = m
    }
  } catch { throw createError({ statusCode: 404, statusMessage: 'No map texture' }) }
  const tag = `"m${stamp}"`
  setHeader(event, 'ETag', tag)
  setHeader(event, 'Cache-Control', 'private, no-cache')
  if (getRequestHeader(event, 'if-none-match') === tag) {
    setResponseStatus(event, 304)
    return null
  }
  setHeader(event, 'Content-Type', 'image/jpeg')
  return cache
})
