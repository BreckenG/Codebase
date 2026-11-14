import { replayContext, replayService } from '../../../utils/replays'
import { validReplayId, consented } from '../../../utils/replay-store.mjs'
import { rankedPlayback } from '../../../utils/ranked-replays.mjs'
let activePlayback = 0
export default defineEventHandler(async event => {
  const context = await replayContext(event)
  if (!context.entitlement.replayCount) throw createError({ statusCode: 403, statusMessage: 'Replay playback requires Plus or Pro' })
  const id = getRouterParam(event, 'id')
  if (!validReplayId(id)) throw createError({ statusCode: 404, statusMessage: 'Replay unavailable' })
  if (activePlayback >= 2) throw createError({ statusCode: 429, statusMessage: 'Replay loading is busy. Try again in a moment.' })
  activePlayback++
  let value
  try {
    const viewer = { discordId: context.user.id, photonId: context.caller?.linked ? context.caller.photonId : null }
    value = await rankedPlayback(id, viewer, Math.min(60, Number(context.entitlement.replayMinutes) || 0) * 60000)
    if (value === undefined && consented(context.caller)) {
      const { store, profiles } = await replayService(context, id)
      value = await store.playback(context.user.id, profiles, context.entitlement, id)
    }
  } catch { throw createError({ statusCode: 503, statusMessage: 'Replay storage is unavailable' }) }
  finally { activePlayback-- }
  if (value === undefined) throw createError({ statusCode: 403, statusMessage: 'Replay consent is required' })
  if (!value) throw createError({ statusCode: 404, statusMessage: 'Replay unavailable for your account or plan' })
  if (!context.entitlement.replayAnalytics) delete value.analytics
  return value
})
