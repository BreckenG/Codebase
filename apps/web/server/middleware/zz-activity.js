import { currentUser } from '../utils/auth.js'
import { recordActivity, noteDevices, activityAction } from '../utils/devices.js'
import { Player, connectDb } from '../utils/db'
import { POLICY_VERSION } from '../../app/utils/legal.js'
const SLOW_MS = 1500
const agreed = new Map()
async function current(id) {
  const hit = agreed.get(id)
  if (hit && hit.at > Date.now() - 60000) return hit.ok
  await connectDb()
  const doc = await Player.findOne({ discordId: id }, 'acceptance.account.version').lean()
  const ok = doc?.acceptance?.account?.version === POLICY_VERSION
  if (agreed.size > 20000) agreed.clear()
  agreed.set(id, { ok, at: Date.now() })
  return ok
}
export default defineEventHandler(async event => {
  if ('__unenv__' in event.node.req) return
  const path = event.path || ''
  if (!path.startsWith('/api/')) return
  const start = Date.now()
  event.node.res.once('finish', () => {
    const ms = Date.now() - start
    if (ms >= SLOW_MS) console.warn(`slow api ${event.method} ${activityAction('', path).trim()} ${event.node.res.statusCode} ${ms}ms`)
  })
  if (event.context.sessionRevoked) return
  const user = currentUser(event)
  if (!user || !(await current(user.id).catch(() => false))) return
  recordActivity(event, user)
  noteDevices(event, user)
})
