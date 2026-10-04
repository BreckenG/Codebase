<script setup>
import { createReplayRenderer, frameAt } from '~/utils/replay-renderer'
const props = defineProps({ matchId: { type: String, required: true }, roster: { type: Array, default: () => [] }, follow: { type: String, default: '' } })
const emit = defineEmits(['poses', 'follow'])
const canvas = ref(null), labels = ref([]), status = ref('Connecting to the live feed...'), live = ref(false), lagSeconds = ref(0)
let renderer = null, frames = [], latest = 0, receivedAt = 0, timer = 0, raf = 0, disposed = false, lastEmit = 0, drag = null
let focus = [-62, 3, -62]
const yaw = ref(0.9), pitch = ref(0.85), dist = ref(42)
let mapPromise = null
const colorOf = p => { const m = /^(\d)-(\d)-(\d)$/.exec(p.color || ''); return m ? [m[1] / 9, m[2] / 9, m[3] / 9] : null }
const players = computed(() => props.roster.map(p => ({ id: p.id, name: p.name, color: colorOf(p), platform: 'unknown', bot: false })))
function map() { mapPromise ??= apiFetch('/api/admin/live/map').catch(() => ({ available: false })); return mapPromise }
async function poll() {
  try {
    const r = await apiFetch(`/api/admin/live/${props.matchId}`)
    if (disposed) return
    if (!r?.available || !r.frames?.length) {
      live.value = false
      status.value = r?.ended ? 'This session has ended.' : 'Waiting for movement. Players show up once they move and have agreed to replays.'
      return
    }
    const seen = new Set(frames.map(f => f.t))
    for (const f of r.frames) if (!seen.has(f.t)) frames.push(f)
    frames.sort((a, b) => a.t - b.t)
    latest = r.latest
    receivedAt = performance.now()
    frames = frames.filter(f => f.t >= latest - 15000)
    lagSeconds.value = Math.max(0, Math.round((Date.now() - r.updatedAt) / 1000))
    live.value = true
    status.value = ''
  } catch { if (!disposed) status.value = 'The live feed is unavailable right now.' }
}
function tick() {
  if (disposed) return
  raf = requestAnimationFrame(tick)
  if (!renderer) return
  const t = Math.min(latest, latest - 1500 + (performance.now() - receivedAt))
  const poses = live.value ? frameAt(frames, t) : {}
  const bodies = Object.entries(poses).map(([id, p]) => [id, p.b])
  const followed = props.follow && poses[props.follow]
  const want = followed ? followed.b : bodies.length ? bodies.reduce((a, [, b]) => a.map((n, i) => n + b[i] / bodies.length), [0, 0, 0]) : focus
  focus = focus.map((n, i) => n + (want[i] - n) * 0.08)
  const c = Math.cos(pitch.value)
  const eye = [focus[0] + Math.cos(yaw.value) * c * dist.value, focus[1] + Math.sin(pitch.value) * dist.value, focus[2] + Math.sin(yaw.value) * c * dist.value]
  try { labels.value = renderer.render(eye, focus, poses, players.value, null, props.follow || null) } catch { status.value = 'The live view stopped. Reload the page to restart it.' }
  const now = performance.now()
  if (now - lastEmit > 500) { lastEmit = now; emit('poses', poses) }
}
function down(e) { drag = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture?.(e.pointerId) }
function move(e) {
  if (!drag) return
  yaw.value += (e.clientX - drag.x) * 0.006
  pitch.value = Math.max(0.15, Math.min(1.45, pitch.value + (e.clientY - drag.y) * 0.005))
  drag = { x: e.clientX, y: e.clientY }
}
function up() { drag = null }
function wheel(e) { dist.value = Math.max(6, Math.min(120, dist.value * (e.deltaY > 0 ? 1.1 : 0.9))) }
onMounted(async () => {
  poll()
  timer = setInterval(() => { if (!document.hidden) poll() }, 1000)
  try {
    const geometry = await map()
    if (disposed) return
    renderer = await createReplayRenderer(canvas.value, geometry)
    if (disposed) { renderer.dispose(); renderer = null; return }
    raf = requestAnimationFrame(tick)
  } catch (e) { status.value = e?.message || 'The live view could not start on this device.' }
})
onBeforeUnmount(() => { disposed = true; clearInterval(timer); cancelAnimationFrame(raf); renderer?.dispose() })
</script>
<template>
<div class="live" @pointerdown="down" @pointermove="move" @pointerup="up" @pointerleave="up" @wheel.prevent="wheel">
  <canvas ref="canvas" class="live__canvas" aria-label="Live view of the scrim" />
  <button v-for="l in labels" :key="l.id" type="button" class="live__label" :class="{ 'is-tagged': l.tagged, 'is-selected': l.selected }" :style="{ left: l.x + '%', top: l.y + '%' }" @pointerdown.stop @click="emit('follow', l.selected ? '' : l.id)">{{ l.name }}</button>
  <div class="live__badge"><span class="dot" :class="{ 'dot--beat': live }" />{{ live ? 'Live' : 'Offline' }}<span v-if="live" class="meta"> about {{ 2 + lagSeconds }}s behind</span></div>
  <p v-if="status" class="live__status meta">{{ status }}</p>
  <p class="live__hint meta">Drag to orbit, scroll to zoom, click a name to follow</p>
</div>
</template>
<style scoped>
.live{position:relative;width:100%;aspect-ratio:16/9;border-radius:var(--radius-12,12px);overflow:hidden;background:#06090f;touch-action:none;cursor:grab}
.live:active{cursor:grabbing}
.live__canvas{width:100%;height:100%;display:block}
.live__label{position:absolute;transform:translate(-50%,-100%);font-size:12px;padding:2px 8px;border-radius:999px;border:0;background:rgba(0,0,0,.55);color:#f4f2ee;white-space:nowrap;cursor:pointer}
.live__label.is-tagged{background:rgba(217,45,32,.85)}
.live__label.is-selected{outline:2px solid var(--color-brand,#e87d1a)}
.live__badge{position:absolute;top:10px;left:10px;display:flex;gap:6px;align-items:center;font-size:12px;padding:4px 10px;border-radius:999px;background:rgba(0,0,0,.55);color:#f4f2ee}
.live__status{position:absolute;inset:auto 0 44% 0;text-align:center;color:#cbd5e1;padding:0 16px}
.live__hint{position:absolute;bottom:8px;right:10px;font-size:11px;color:#94a3b8;margin:0}
</style>
