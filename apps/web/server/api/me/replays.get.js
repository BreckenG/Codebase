import { replayContext, replayService, basicReplayStats } from '../../utils/replays'
import { consented } from '../../utils/replay-store.mjs'
import { rankedReplayRows } from '../../utils/ranked-replays.mjs'
export default defineEventHandler(async event => {
  const context = await replayContext(event)
  const { user, entitlement, caller } = context
  const basic = await basicReplayStats(user.id)
  const result = { rows: [], basic, plan: entitlement.plan, limits: { count: entitlement.replayCount || 0, days: entitlement.replayDays || 0, minutes: entitlement.replayMinutes || 0 }, locked: !entitlement.replayCount, consentRequired: !consented(caller), analytics: Boolean(entitlement.replayAnalytics) }
  if (result.locked) return result
  const ranked = await rankedReplayRows(user.id, caller?.linked ? caller.photonId : null, entitlement).catch(() => [])
  result.rows = ranked
  if (result.consentRequired) {
    result.consentRequired = !ranked.length
    return result
  }
  try {
    const { store, profiles } = await replayService(context)
    const { rows } = await store.permitted(user.id, profiles, entitlement)
    result.rows = [...ranked, ...rows.map(r => ({ id: r.id, startedAt: r.startedAt, durationMs: r.durationMs, actualDurationMs: r.actualDurationMs, clipped: r.clipped, map: r.map, kind: r.kind }))].sort((a, b) => b.startedAt - a.startedAt).slice(0, result.limits.count)
    return result
  } catch { throw createError({ statusCode: 503, statusMessage: 'Replay storage is unavailable' }) }
})
