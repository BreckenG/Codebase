<script setup>
import { createHeatRenderer, heatBasis } from '~/utils/heat-renderer'
const LAYERS = [
  { key: 'run', label: 'Running', note: 'Where you spend your time while you are not tagged.' },
  { key: 'chase', label: 'Chasing', note: 'Where you spend your time while you are tagged.' },
  { key: 'caught', label: 'Got tagged', note: 'Where other players catch you.', events: true },
  { key: 'tags', label: 'Your tags', note: 'Where you catch other players.', events: true },
]
const data = ref(null), failure = ref(''), layer = ref('run'), explore = ref(false), ready = ref(false), mapError = ref('')
const stage = ref(null), canvas = ref(null)
const current = computed(() => LAYERS.find(l => l.key === layer.value))
const empty = computed(() => data.value && !data.value.locked && !LAYERS.some(l => data.value.layers?.[l.key]?.length))
let renderer, view, from, to, started = 0, frame = 0, watcher, resizer, drag = null, disposed = false
const keys = new Set()
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const mix = (a, b, t) => a + (b - a) * t
function topView() { const b = renderer.bounds, size = b.half * 1.06; return { yaw: 0, pitch: Math.PI / 2 - 0.0005, focal: 14, size, dist: size * 14, target: [...b.center], fog: 0, dim: 0.88, paint: 0, overlay: 1 } }
function groundView() { const b = renderer.bounds, size = b.half * 0.95; return { yaw: 0.7, pitch: 0.82, focal: 1.5, size, dist: size * 1.5, target: [...b.center], fog: 0.004, dim: 0.72, paint: 1, overlay: 0.22 } }
function draw() { if (!renderer || !view) return; if (explore.value && !to) { const b = renderer.bounds, reach = b.half * 1.3; view.target = [Math.max(b.center[0] - reach, Math.min(b.center[0] + reach, view.target[0])), Math.max(b.floor - 2, Math.min(b.top + 5, view.target[1])), Math.max(b.center[2] - reach, Math.min(b.center[2] + reach, view.target[2]))] } renderer.render(view) }
function step(now) {
  frame = 0
  if (disposed || !renderer) return
  let again = false
  if (to) {
    const t = Math.min(1, (now - started) / 1300), k = ease(t), focal = Math.exp(mix(Math.log(from.focal), Math.log(to.focal), k)), size = mix(from.size, to.size, k)
    view = { yaw: mix(from.yaw, to.yaw, k), pitch: mix(from.pitch, to.pitch, k), focal, size, dist: size * focal, target: from.target.map((n, i) => mix(n, to.target[i], k)), fog: mix(from.fog, to.fog, k), dim: mix(from.dim, to.dim, k), paint: mix(from.paint, to.paint, k), overlay: mix(from.overlay, to.overlay, k) }
    if (t >= 1) { view = to; to = null } else again = true
  } else if (explore.value && keys.size) {
    const basis = heatBasis(view), speed = Math.max(0.08, view.dist * 0.012)
    const ahead = [Math.sin(view.yaw), 0, Math.cos(view.yaw)].map(n => -n), side = basis.right
    const move = (dir, amount) => { view.target = view.target.map((n, i) => n + dir[i] * amount) }
    if (keys.has('w')) move(ahead, speed); if (keys.has('s')) move(ahead, -speed)
    if (keys.has('d')) move(side, speed); if (keys.has('a')) move(side, -speed)
    if (keys.has('e')) view.target[1] += speed; if (keys.has('q')) view.target[1] -= speed
    again = true
  }
  draw()
  if (again) frame = requestAnimationFrame(step)
}
function kick() { if (!frame) frame = requestAnimationFrame(step) }
function glide(target, open) { if (!renderer || to) return; from = { ...view, target: [...view.target] }; to = target; started = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? -1e9 : performance.now(); explore.value = open; keys.clear(); kick() }
function enter() { if (!explore.value) glide(groundView(), true) }
function leave() { if (explore.value) glide(topView(), false) }
function show() { if (!renderer || !data.value?.layers) return; renderer.setCells(data.value.layers[layer.value] || [], Boolean(current.value.events)); kick() }
function down(event) { if (!explore.value || to) return; canvas.value.setPointerCapture(event.pointerId); drag = { x: event.clientX, y: event.clientY, pan: event.button === 0 && !event.shiftKey } }
function moved(event) {
  if (!drag || !explore.value) return
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y
  drag.x = event.clientX; drag.y = event.clientY
  if (drag.pan) { const basis = heatBasis(view), scale = view.dist / view.focal / canvas.value.clientHeight * 2, ahead = [-Math.sin(view.yaw), 0, -Math.cos(view.yaw)]; view.target = view.target.map((n, i) => n - basis.right[i] * dx * scale + ahead[i] * dy * scale / Math.max(0.35, Math.sin(view.pitch))) }
  else { view.yaw -= dx * 0.006; view.pitch = Math.max(0.12, Math.min(Math.PI / 2 - 0.02, view.pitch + dy * 0.005)) }
  kick()
}
function up() { drag = null }
function wheel(event) { if (!explore.value || to) return; event.preventDefault(); view.dist = Math.max(3, Math.min(140, view.dist * Math.exp(event.deltaY * 0.0012))); view.size = view.dist / view.focal; kick() }
function key(event, held) {
  const k = event.key.toLowerCase()
  if (!explore.value || !['w', 'a', 's', 'd', 'q', 'e'].includes(k) || /^(input|textarea|select)$/i.test(event.target?.tagName || '')) return
  if (held) { keys.add(k); kick() } else keys.delete(k)
}
const keyDown = e => key(e, true), keyUp = e => key(e, false)
async function build() {
  if (renderer || disposed) return
  try { const made = await createHeatRenderer(canvas.value); if (disposed) { made.dispose(); return } renderer = made; view = topView(); ready.value = true; show() }
  catch (e) { mapError.value = e.message || 'The map could not be loaded.' }
}
onMounted(async () => {
  try { data.value = await apiFetch('/api/me/heatmap') }
  catch (e) { failure.value = e?.data?.statusMessage || 'Could not load your heat map.'; return }
  if (data.value.locked || empty.value) return
  await nextTick()
  watcher = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { watcher.disconnect(); build() } }, { rootMargin: '200px' })
  watcher.observe(stage.value)
  resizer = new ResizeObserver(() => kick()); resizer.observe(stage.value)
  window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp)
})
onBeforeUnmount(() => { disposed = true; if (frame) cancelAnimationFrame(frame); watcher?.disconnect(); resizer?.disconnect(); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); renderer?.dispose(); renderer = null })
watch(layer, show)
</script>

<template>
<section v-if="data || failure" class="profile-heat" aria-labelledby="heat-title">
<div class="world-section-head"><h2 id="heat-title">Heat map</h2><span class="meta">Only you can see this</span></div>
<p v-if="failure" class="world-error" role="alert">{{ failure }}</p>
<div v-else-if="data.locked" class="profile-heat__locked"><div><span class="chip">Pro</span><h3>See where you play</h3><p>Your ranked rounds drawn on the real map: where you run, where you chase, where you get tagged and where you tag.</p><p class="meta">Top down or in 3D. Private to you.</p><NuxtLink class="btn btn--brand btn--large" to="/subscribe">Compare plans</NuxtLink></div></div>
<div v-else-if="empty" class="world-empty"><AppIcon name="compass" /><h3>No rounds mapped yet</h3><p class="meta">{{ data.linked ? 'Play a ranked round and your heat map starts filling in.' : 'Connect your Gorilla Tag account, then play a ranked round.' }}</p></div>
<template v-else>
<div class="world-mode-nav profile-heat__tabs" role="tablist" aria-label="Heat map type"><button v-for="l in LAYERS" :key="l.key" type="button" role="tab" :aria-selected="layer === l.key" :class="{ selected: layer === l.key }" @click="layer = l.key">{{ l.label }}</button></div>
<div ref="stage" class="profile-heat__stage" :class="{ 'is-open': explore, 'is-ready': ready }">
<canvas ref="canvas" :aria-label="`${current.label} heat map of the forest`" @click="enter" @pointerdown="down" @pointermove="moved" @pointerup="up" @pointercancel="up" @wheel="wheel" @contextmenu.prevent />
<p v-if="mapError" class="profile-heat__status" role="alert">{{ mapError }}</p>
<p v-else-if="!ready" class="profile-heat__status" role="status">Loading the map...</p>
<template v-else>
<button v-if="explore" type="button" class="btn btn--ghost profile-heat__back" @click="leave"><AppIcon name="arrowLeft" />Top view</button>
<span class="profile-heat__hint">{{ explore ? 'Hold left click to move. Hold right click to look. Scroll to zoom.' : 'Click the map to explore in 3D' }}</span>
<span class="profile-heat__legend" aria-hidden="true">Less<i />More</span>
</template>
</div>
<p class="meta profile-heat__note">{{ current.note }} Built from {{ num(data.rounds) }} ranked {{ data.rounds === 1 ? 'round' : 'rounds' }}.</p>
</template>
</section>
</template>

<style scoped>
.profile-heat{margin:36px 0;padding-top:28px;border-top:1px solid #ffffff16}
.profile-heat__tabs{margin-bottom:18px}
.profile-heat__stage{position:relative;height:clamp(340px,46vw,560px);overflow:hidden;border:1px solid var(--color-divider);border-radius:var(--radius-lg);background:#10151c}
.profile-heat__stage canvas{display:block;width:100%;height:100%;opacity:0;transition:opacity .4s var(--ease-standard);cursor:pointer;touch-action:none}
.profile-heat__stage.is-ready canvas{opacity:1}
.profile-heat__stage.is-open canvas{cursor:grab}
.profile-heat__stage.is-open canvas:active{cursor:grabbing}
.profile-heat__status{position:absolute;inset:0;display:grid;place-items:center;margin:0;font-size:13px;color:var(--color-text-secondary)}
.profile-heat__back{position:absolute;top:14px;left:14px;background:color-mix(in srgb,var(--surface-1) 82%,transparent)}
.profile-heat__hint,.profile-heat__legend{position:absolute;bottom:14px;display:inline-flex;align-items:center;gap:8px;min-height:28px;padding:0 10px;border-radius:var(--radius-sm);background:color-mix(in srgb,var(--surface-1) 82%,transparent);font-size:12px;color:var(--color-text-secondary);pointer-events:none}
.profile-heat__hint{left:14px}
.profile-heat__legend{right:14px}
.profile-heat__legend i{width:72px;height:6px;border-radius:var(--radius-max);background:linear-gradient(90deg,#294df2,#1acce6,#59e64d,#ffe033,#fa4026)}
.profile-heat__note{margin-top:14px;font-size:12px}
.profile-heat__locked{padding:36px;border:1px solid var(--surface-4);border-radius:var(--radius-lg);background:radial-gradient(ellipse at 90% 0%,color-mix(in srgb,var(--color-brand) 9%,transparent),transparent 65%),var(--surface-1)}
.profile-heat__locked h3{font-size:30px;margin:18px 0 14px;letter-spacing:-.03em}
.profile-heat__locked p{max-width:560px;font-size:14px;line-height:1.8;margin-bottom:18px}
.profile-heat__locked .meta{font-size:12px}
@media(max-width:760px){.profile-heat__locked{padding:24px}.profile-heat__hint{display:none}}
@media(prefers-reduced-motion:reduce){.profile-heat__stage canvas{transition:none}}
</style>
