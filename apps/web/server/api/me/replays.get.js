import { replayContext, replayService, basicReplayStats } from '../../utils/replays'
import { consented } from '../../utils/replay-store.mjs'
export default defineEventHandler(async event => {
  const context = await replayContext(event)
  const { user, entitlement, caller } = context
  const basic = await basicReplayStats(user.id)
  const result = { rows: [], basic, plan: entitlement.plan, limits: { count: entitlement.replayCount || 0, days: entitlement.replayDays || 0, minutes: entitlement.replayMinutes || 0 }, locked: !entitlement.replayCount, consentRequired: !consented(caller), analytics: Boolean(entitlement.replayAnalytics) }
  if (result.locked || result.consentRequired) return result
  try {
    const { store, profiles } = await replayService(context)
    const { rows } = await store.permitted(user.id, profiles, entitlement)
    result.rows = rows.map(r => ({ id: r.id, startedAt: r.startedAt, durationMs: r.durationMs, actualDurationMs: r.actualDurationMs, clipped: r.clipped, map: r.map, kind: r.kind }))
    return result
  } catch { throw createError({ statusCode: 503, statusMessage: 'Replay storage is unavailable' }) }
})
