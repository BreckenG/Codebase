import { currentUser } from '../utils/auth.js'
import { recordActivity } from '../utils/activity.js'
import { noteDevices } from '../utils/devices.js'
export default defineEventHandler(event => {
  if ('__unenv__' in event.node.req) return
  const path = event.path || ''
  if (!path.startsWith('/api/') || event.context.sessionRevoked) return
  const user = currentUser(event)
  if (!user) return
  recordActivity(event, user)
  noteDevices(event, user)
})
