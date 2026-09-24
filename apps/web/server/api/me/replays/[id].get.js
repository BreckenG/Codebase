import { replayContext, replayService } from '../../../utils/replays'
import { validReplayId, consented } from '../../../utils/replay-store.mjs'
let activePlayback = 0
export default defineEventHandler(async event => {
  const context = await replayContext(event)
  if (!context.entitlement.replayCount) throw createError({ statusCode: 403, statusMessage: 'Replay playback requires Plus or Pro' })
  if (!consented(context.caller)) throw createError({ statusCode: 403, statusMessage: 'Replay consent is required' })
  const id = getRouterParam(event, 'id')
  if (!validReplayId(id)) throw createError({ statusCode: 404, statusMessage: 'Replay unavailable' })
  if (activePlayback >= 2) throw createError({ statusCode: 429, statusMessage: 'Replay loading is busy. Try again in a moment.' })
  activePlayback++
  let value
  try {
    const { store, profiles } = await replayService(context, id)
    value = await store.playback(context.user.id, profiles, context.entitlement, id)
  } catch { throw createError({ statusCode: 503, statusMessage: 'Replay storage is unavailable' }) }
  finally { activePlayback-- }
  if (!value) throw createError({ statusCode: 404, statusMessage: 'Replay unavailable for your account or plan' })
  if (!context.entitlement.replayAnalytics) delete value.analytics
  return value
})
