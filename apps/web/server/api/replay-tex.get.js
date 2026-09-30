import fs from 'node:fs/promises'
import path from 'node:path'
import { currentUser } from '../utils/auth'

let cache = null
export default defineEventHandler(async event => {
  if (!currentUser(event)) throw createError({ statusCode: 401, statusMessage: 'Sign in to view replays' })
  const file = process.env.REPLAY_MAP_FILE
  if (!file) throw createError({ statusCode: 404, statusMessage: 'No map texture' })
  try { cache ||= await fs.readFile(path.join(path.dirname(file), 'forest-tex.jpg')) } catch { throw createError({ statusCode: 404, statusMessage: 'No map texture' }) }
  setHeader(event, 'Content-Type', 'image/jpeg')
  setHeader(event, 'Cache-Control', 'private, max-age=86400')
  return cache
})
