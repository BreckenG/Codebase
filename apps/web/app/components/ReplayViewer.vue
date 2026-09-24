<script setup>
import { createReplayRenderer, frameAt, rotatedForward } from '~/utils/replay-renderer'
import { initialCamera, selectCameraPlayer, changeCameraMode } from '~/utils/replay-camera.mjs'
const props = defineProps({ replay: { type: Object, required: true } })
const initial = initialCamera(props.replay.players)
let cameraState = initial
const loadingModels = ref(true), mouseLocked = ref(false), mouseError = ref('')
let disposed = false, rightHeld = false
const canvas = ref(null), clock = ref(props.replay.frames.find(frame => frame.p[initial.selected])?.t || 0), playing = ref(false), speed = ref(1), mode = ref(initial.mode), selected = ref(initial.selected), labels = shallowRef([]), failure = ref(''), currentPoses = shallowRef({}), cameraHint = ref('')
const colors = [[0.4, 0.84, 1], [0.83, 0.66, 1], [0.49, 0.93, 0.65], [1, 0.79, 0.4], [0.96, 0.58, 0.82]]
const players = computed(() => props.replay.players.map((p, i) => ({ ...p, renderColor: p.color && Math.max(...p.color) > 0.3 ? p.color : colors[i % colors.length] })))
const stats = computed(() => props.replay.analytics?.players.find(p => p.id === selected.value))
const recentTags = computed(() => props.replay.events.filter(e => e.t <= clock.value && clock.value - e.t < 4000).slice(-3))
const selectedPlayer = computed(() => players.value.find(p => p.id === selected.value))
const duration = t => `${Math.floor(t / 60000)}:${String(Math.floor(t / 1000) % 60).padStart(2, '0')}`
const name = id => players.value.find(p => p.id === id)?.name || 'Unknown'
const number = (n, unit = '') => n === null || n === undefined ? 'Unavailable' : `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit}`
const colorCode = player => player.color ? `Color ${player.color.map(n => Math.round(n * 9)).join(' ')}` : 'Color unknown'
const speedOptions = [0.25, 0.5, 1, 1.5, 2, 4].map(value => ({ value, label: `${value}x` }))
const cameraOptions = [{ value: 'free', label: 'Free camera', key: 'F' }, { value: 'first', label: 'First person', key: 'I' }, { value: 'third', label: 'Third person', key: 'T' }]
let renderer, animation, last = 0, distance = 4, yaw = 0, pitch = -0.22, eye = [0, 6, -10], drag = null
let rendered = '', poseTime = -1, poses = {}
const keys = new Set()
function resetCamera() {
  const p = frameAt(props.replay.frames, clock.value)[selected.value] || Object.values(frameAt(props.replay.frames, clock.value))[0]
  if (p) eye = [p.b[0], p.b[1] + 4, p.b[2] - 9]
  yaw = 0; pitch = -0.22; distance = 4
}
function applyCamera(next) { cameraState = next; selected.value = next.selected; mode.value = next.mode; keys.clear() }
function selectPlayer(id, toggle = true) { applyCamera(selectCameraPlayer(cameraState, id, toggle)) }
function setMode(value) { applyCamera(changeCameraMode(cameraState, value, players.value)) }
function seek(value) { clock.value = Math.max(0, Math.min(props.replay.durationMs, Number(value))); last = 0 }
function toggle() { if (clock.value >= props.replay.durationMs) seek(0); playing.value = !playing.value }
function keydown(event) {
  if (event.key === 'Escape') { releaseMouse(); return }
  if (event.ctrlKey || event.metaKey || event.altKey || event.target.isContentEditable) return
  if (event.target.matches('input:not([type="range"]), textarea, select, [role="combobox"]')) return
  const key = event.key.toLowerCase()
  if (key === 'arrowleft' || key === 'arrowright') { event.preventDefault(); seek(clock.value + (key === 'arrowleft' ? -5000 : 5000)); return }
  const camera = cameraOptions.find(option => option.key.toLowerCase() === key)
  if (camera || /^\d$/.test(key)) {
    event.preventDefault()
    if (event.repeat) return
    if (camera) setMode(camera.value)
    else { const player = players.value[Number(key)]; if (player) selectPlayer(player.id, false) }
    return
  }
  if (event.target !== canvas.value) return
  if ([' ', 'w', 'a', 's', 'd'].includes(key)) event.preventDefault()
  if (event.code === 'Space' && !event.repeat) toggle()
  keys.add(key)
}
async function pointerDown(event) {
  canvas.value.focus()
  if (event.pointerType === 'touch') { canvas.value.setPointerCapture(event.pointerId); drag = [event.clientX, event.clientY]; return }
  if (event.button !== 2) return
  rightHeld = true
  if (document.pointerLockElement === canvas.value) return
  mouseError.value = ''
  try { await canvas.value.requestPointerLock() } catch { if (rightHeld && !disposed) mouseError.value = 'Hold right click again to capture your mouse.' }
}
function releaseMouse() { rightHeld = false; drag = null; keys.clear(); if (document.pointerLockElement === canvas.value) document.exitPointerLock() }
function mouseUp(event) { if (event.button === 2) releaseMouse() }
function lockChanged() {
  mouseLocked.value = document.pointerLockElement === canvas.value
  if (mouseLocked.value && (!rightHeld || disposed)) { document.exitPointerLock(); return }
  if (!mouseLocked.value) { rightHeld = false; keys.clear() }
  drag = null
}
function pointerMove(event) {
  if ((!mouseLocked.value && !drag) || mode.value === 'first') return
  const x = mouseLocked.value ? event.movementX : event.clientX - drag[0], y = mouseLocked.value ? event.movementY : event.clientY - drag[1]
  yaw += x * 0.005; pitch = Math.max(-1.4, Math.min(1.4, pitch - y * 0.005))
  if (drag) drag = [event.clientX, event.clientY]
}
function zoom(event) { if (mode.value === 'third') { distance = Math.max(1, Math.min(15, distance + Math.sign(event.deltaY))); return } if (mode.value !== 'free') return; const amount = Math.sign(event.deltaY) * 1.5; eye[0] -= Math.sin(yaw) * amount; eye[2] -= Math.cos(yaw) * amount }
function tick(now) {
  const delta = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now
  if (playing.value) { clock.value = Math.min(props.replay.durationMs, clock.value + delta * 1000 * Number(speed.value)); if (clock.value >= props.replay.durationMs) playing.value = false }
  if (poseTime !== clock.value) { poseTime = clock.value; poses = frameAt(props.replay.frames, clock.value); currentPoses.value = poses }
  const p = poses[selected.value]
  let viewEye = eye, target, hide
  const direction = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)]
  cameraHint.value = ''
  if (mode.value === 'first' && p?.q) { viewEye = p.h; const forward = rotatedForward(p.q); target = p.h.map((n, k) => n + forward[k]); hide = selected.value }
  else if (mode.value === 'third' && p) { target = p.h; viewEye = p.h.map((n, k) => n - direction[k] * distance) }
  else {
    if (mode.value !== 'free') cameraHint.value = p ? 'Head rotation is unavailable for first person at this time.' : 'The selected player has no fresh pose at this time.'
    const move = delta * (keys.has('shift') ? 14 : 6)
    const forward = Number(keys.has('w')) - Number(keys.has('s')), side = Number(keys.has('d')) - Number(keys.has('a'))
    eye[0] += (direction[0] * forward + Math.cos(yaw) * side) * move
    eye[2] += (direction[2] * forward - Math.sin(yaw) * side) * move
    eye[1] += direction[1] * forward * move
    target = eye.map((n, k) => n + direction[k])
  }
  eye = [...viewEye]
  const view = [clock.value, selected.value, mode.value, ...viewEye, ...target, canvas.value.clientWidth, canvas.value.clientHeight, window.devicePixelRatio].join(':')
  if (view !== rendered) {
    try { labels.value = renderer.render(viewEye, target, poses, players.value, hide, selected.value); rendered = view } catch { failure.value = 'The graphics viewer stopped. Reload this replay to try again.'; playing.value = false; return }
  }
  animation = requestAnimationFrame(tick)
}
function stopHidden() { if (document.hidden) { playing.value = false; releaseMouse() } }
onMounted(async () => {
  document.addEventListener('visibilitychange', stopHidden)
  document.addEventListener('pointerlockchange', lockChanged)
  document.addEventListener('mouseup', mouseUp)
  window.addEventListener('blur', releaseMouse)
  try { renderer = await createReplayRenderer(canvas.value, props.replay.mapGeometry); if (disposed) { renderer.dispose(); return }; resetCamera(); animation = requestAnimationFrame(tick) } catch (e) { if (!disposed) failure.value = e.message } finally { loadingModels.value = false }
})
onBeforeUnmount(() => { disposed = true; releaseMouse(); document.removeEventListener('mouseup', mouseUp); window.removeEventListener('blur', releaseMouse); document.removeEventListener('pointerlockchange', lockChanged); cancelAnimationFrame(animation); renderer?.dispose(); document.removeEventListener('visibilitychange', stopHidden) })
</script>

<template>
  <section class="replay-viewer" aria-label="Movement replay" @keydown="keydown" @keyup="keys.delete($event.key.toLowerCase())">
    <div class="replay-viewer__main">
      <div class="replay-stage">
        <canvas ref="canvas" tabindex="0" aria-label="Replay camera. Hold right click to look. WASD moves where you look. Left and Right skip five seconds. F selects free camera, I first person, T third person. Number keys select players. Space plays or pauses." @blur="keys.clear()" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="drag = null" @pointercancel="releaseMouse" @contextmenu.prevent @wheel.prevent="zoom" />
        <div class="replay-stage__labels" aria-hidden="true"><span v-for="label in labels" :key="label.id" :style="{ left: label.x + '%', top: label.y + '%' }">{{ label.name }}<em v-if="label.tagged">Tagged</em></span></div>
        <div class="replay-stage__top"><span class="replay-badge">{{ replay.map }} · {{ mode === 'free' ? 'Free camera' : mode === 'first' ? 'First person' : 'Third person' }}</span><span class="replay-badge replay-following">{{ selectedPlayer ? 'Following ' + selectedPlayer.name : 'No player selected' }}</span></div>
        <div v-if="failure" class="replay-stage__message" role="alert">{{ failure }}</div>
        <div v-else-if="loadingModels" class="replay-stage__message" role="status">Loading player models...</div>
        <div v-else-if="!replay.frames.length" class="replay-stage__message">No fresh player poses remain available in this recording.</div>
        <TransitionGroup name="tag" tag="div" class="replay-stage__alerts" aria-live="polite"><p v-for="e in recentTags" :key="`${e.t}-${e.tagger}-${e.target}`">{{ name(e.tagger) }} tagged {{ name(e.target) }}</p></TransitionGroup>
        <p v-if="cameraHint || mouseError" class="replay-stage__hint">{{ cameraHint || mouseError }}</p>
      </div>
      <div class="replay-controls">
        <div class="replay-transport"><button class="btn btn--brand" :disabled="loadingModels || !!failure || !replay.frames.length" @click="toggle"><svg v-if="playing" class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg><AppIcon v-else name="play" />{{ playing ? 'Pause' : 'Play' }}</button><button class="btn btn--ghost" aria-label="Back 5 seconds" @click="seek(clock - 5000)">Back 5s</button><button class="btn btn--ghost" aria-label="Forward 5 seconds" @click="seek(clock + 5000)">Forward 5s</button><span class="replay-time mono">{{ duration(clock) }} <span>/ {{ duration(replay.durationMs) }}</span></span><ThemedSelect v-model="speed" class="themed-select--inline" :options="speedOptions" label="Speed" /></div>
        <div class="replay-timeline"><label for="replay-time">Timeline</label><input id="replay-time" type="range" min="0" :max="replay.durationMs || 1" step="50" :value="clock" :aria-valuetext="duration(clock)" :style="{ '--progress': `${clock / (replay.durationMs || 1) * 100}%` }" @input="seek($event.target.value)" /><div class="replay-event-track" aria-label="Tag moments"><button v-for="(event, i) in replay.events" :key="i" :style="{ left: `${event.t / (replay.durationMs || 1) * 100}%` }" :aria-label="`${duration(event.t)}: ${name(event.tagger)} tagged ${name(event.target)}`" :title="`${duration(event.t)}: ${name(event.tagger)} tagged ${name(event.target)}`" @click="seek(event.t)" /></div><div class="replay-scale"><span>0:00</span><span>Tag moments</span><span>{{ duration(replay.durationMs) }}</span></div></div>
        <div class="replay-camera-bar"><div class="replay-camera-modes" aria-label="Camera mode"><button v-for="option in cameraOptions" :key="option.value" :aria-pressed="mode === option.value" :title="`${option.label} (${option.key})`" :aria-keyshortcuts="option.key" :disabled="option.value !== 'free' && !players.length" @click="setMode(option.value)">{{ option.label }} <kbd>{{ option.key }}</kbd></button></div><button class="btn btn--ghost" @click="resetCamera">Reset view</button></div>
        <details class="replay-help"><summary>{{ mouseLocked ? 'Mouse captured. Release right click to stop' : 'Camera controls' }}</summary><p>Hold right click to look, then release it to free your mouse. WASD moves where you look. Shift moves faster. Left and Right skip five seconds. F selects free camera, I first person, and T third person. Keys 0 through 9 select the first through tenth players. Scroll to zoom. Space plays or pauses while the view is focused. On touchscreens, drag to look.</p></details>
      </div>
      <p v-if="replay.clipped" class="replay-note">Preview first {{ Math.floor(replay.durationMs / 60000) }}m of {{ duration(replay.actualDurationMs) }}. Movement statistics cover this preview only.</p>
      <details class="replay-note"><summary>About this recording</summary><p>{{ replay.mapGeometry.reason }} Bots use Vive. Steam players use the Index model. Meta and unknown platforms use the Quest model. Headsets follow recorded head rotation. Controllers follow recorded hand positions with approximate orientation.</p><p>Quest 2 model by <a href="https://sketchfab.com/3d-models/oculus-quest-2-c6a1c2623d224a1bbb81a38915f7e898" target="_blank" rel="noopener noreferrer">NosTeam</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Geometry and textures optimized for replay playback.</p><p>Vive headset by <a href="https://sketchfab.com/3d-models/htc-vive-4cee0970fe60444ead77d41fbb052a33" target="_blank" rel="noopener noreferrer">Eternal Realm</a> and controllers by <a href="https://sketchfab.com/3d-models/htc-vive-controller-9f03e4a80c5a4b31a24bb122f17cb229" target="_blank" rel="noopener noreferrer">iShoNz</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Geometry and textures optimized and models aligned for replay playback.</p></details>
    </div>
    <aside class="replay-roster" aria-label="Replay players">
      <h2>Players <span>{{ players.length }}</span></h2><p class="replay-roster-hint">Select a player to follow</p>
      <button v-for="(player, index) in players" :key="player.id" class="replay-player" :aria-keyshortcuts="index < 10 ? String(index) : undefined" :title="index < 10 ? `Select player (${index})` : undefined" :class="{ 'is-selected': selected === player.id }" :aria-pressed="selected === player.id" @click="selectPlayer(player.id)"><span class="replay-player__dot" :style="{ background: `rgb(${player.renderColor.map(n => Math.round(n * 255)).join(',')})` }" /><span><b>{{ player.name }}{{ player.self ? ' (you)' : '' }}</b><small>{{ player.bot ? 'Bot · ' : '' }}{{ !currentPoses[player.id] ? 'No fresh pose' : currentPoses[player.id].tag === 1 ? 'Tagged' : currentPoses[player.id].tag === 0 ? 'Untagged' : 'Tag state unavailable' }}</small><small v-if="selected === player.id" class="replay-selected-label">{{ mode === 'first' ? 'First person' : 'Following' }}</small><small v-if="currentPoses[player.id]?.tag !== 1">{{ colorCode(player) }}</small></span><kbd v-if="index < 10" class="replay-player-key">{{ index }}</kbd></button>
<p v-if="!players.length" class="meta">No players are available in this recording.</p>
    </aside>
    <section v-if="stats" class="replay-analytics">
      <div class="replay-analytics__heading"><h2>{{ selectedPlayer?.name }} <span>Movement analysis</span></h2><span class="chip">Pose estimates</span></div>
      <div class="replay-metrics"><div><span>Distance</span><b>{{ number(stats.distanceMeters, ' m') }}</b></div><div><span>Average speed</span><b>{{ number(stats.averageSpeedMps, ' m/s') }}</b></div><div><span>Peak speed</span><b>{{ number(stats.peakSpeedMps, ' m/s') }}</b></div><div><span>Untagged runtime</span><b>{{ number(stats.untaggedSeconds, ' s') }}</b></div><div><span>Tagged time</span><b>{{ number(stats.taggedSeconds, ' s') }}</b></div><div><span>Recorded tags</span><b>{{ stats.tags }}</b></div><div><span>Times tagged</span><b>{{ stats.timesTagged }}</b></div><div><span>Sample coverage</span><b>{{ number(stats.sampledSeconds, ' s') }}</b></div><div><span>Time on surfaces</span><b class="unavailable">Unavailable</b></div><div><span>Jukes</span><b class="unavailable">Unavailable</b></div></div>
      <p class="meta">{{ replay.analytics.note }}</p>
      <details v-if="replay.events.length" class="replay-events"><summary>Recorded tag events ({{ replay.events.length }})</summary><div><button v-for="(e, index) in replay.events" :key="index" class="btn btn--ghost" @click="seek(e.t)">{{ duration(e.t) }} · {{ name(e.tagger) }} tagged {{ name(e.target) }}</button></div></details>
    </section>
  </section>
</template>

<style scoped>
.replay-viewer{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:16px;color:var(--color-text-primary)}.replay-viewer__main,.replay-roster,.replay-analytics{min-width:0;border:1px solid var(--color-divider);border-radius:var(--radius-xl);background:var(--surface-2)}.replay-stage{position:relative;height:clamp(360px,48vw,570px);overflow:hidden;border-radius:15px 15px 0 0;background:#10151c}.replay-stage canvas{width:100%;height:100%;display:block;touch-action:none}.replay-stage__top{position:absolute;inset:16px 16px auto;display:flex;gap:8px;justify-content:space-between;pointer-events:none}.replay-badge{background:#101318e8;color:#fff;padding:8px 12px;border:1px solid #ffffff20;border-radius:8px;font-size:11px;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.replay-following{border-color:var(--color-brand-strong)}.replay-stage__labels{position:absolute;inset:0;pointer-events:none}.replay-stage__labels>span{position:absolute;transform:translate(-50%,-100%);background:#101318d9;color:#fff;padding:4px 7px;border-radius:5px;font-size:11px;white-space:nowrap}.replay-stage__labels em{display:block;color:#ff9292;font-style:normal}.replay-stage__message{position:absolute;inset:35% 10% auto;background:#111820ed;padding:24px;border-radius:12px;text-align:center;color:#fff}.replay-stage__alerts{position:absolute;bottom:18px;left:18px;right:18px;display:grid;justify-content:start;gap:6px;pointer-events:none}.replay-stage__alerts p{margin:0;padding:9px 13px;background:#201719ed;border:1px solid #ff777740;color:#ffe8e8;font-size:12px;border-radius:8px}.replay-stage__hint{position:absolute;bottom:12px;left:16px;right:16px;padding:10px;background:#111820ec;color:#ddd;font-size:12px}.replay-controls{padding:18px}.replay-transport,.replay-camera-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.replay-transport .btn{min-height:40px;font-size:12px}.replay-time{font-size:13px;white-space:nowrap;margin-left:auto}.replay-time span{color:var(--color-text-secondary)}.replay-transport>.themed-select{margin-left:8px}.replay-timeline{margin:22px 0 18px;position:relative}.replay-timeline>label{display:block;font-size:11px;color:var(--color-text-secondary)}.replay-timeline input{display:block;width:100%;height:26px;accent-color:var(--color-brand);cursor:pointer;margin:0}.replay-event-track{height:18px;position:relative;margin:0 7px}.replay-event-track button{position:absolute;width:12px;height:18px;transform:translateX(-50%);border:0;background:transparent;padding:0;cursor:pointer}.replay-event-track button:after{content:'';display:block;width:4px;height:7px;border-radius:2px;background:var(--color-red);margin:auto}.replay-event-track button:hover:after,.replay-event-track button:focus-visible:after{height:14px}.replay-scale{display:flex;justify-content:space-between;font-size:10px;color:var(--color-text-secondary)}.replay-camera-bar{justify-content:space-between;padding-top:16px;border-top:1px solid var(--color-divider)}.replay-camera-modes{display:flex;gap:3px;padding:4px;background:var(--surface-1);border-radius:10px;flex-wrap:wrap}.replay-camera-modes button{border:0;border-radius:7px;padding:10px;background:transparent;color:var(--color-text-secondary);font:inherit;font-size:11px;cursor:pointer;transition:background .15s,color .15s}.replay-camera-modes button[aria-pressed=true]{background:var(--color-brand-highlight);color:var(--color-brand)}.replay-help{font-size:11px;color:var(--color-text-secondary);margin-top:16px}.replay-help summary{cursor:pointer;width:fit-content;min-height:24px}.replay-help p{line-height:1.8;max-width:650px}.replay-note{font-size:11px;color:var(--color-text-secondary);padding:0 18px 14px;margin:0;line-height:1.6}.replay-roster{padding:20px 12px;align-self:start}.replay-roster h2{font-size:15px;display:flex;justify-content:space-between;padding:0 8px}.replay-roster h2 span{font-size:12px;color:var(--color-text-secondary)}.replay-roster-hint{font-size:11px;color:var(--color-text-secondary);padding:0 8px;margin:8px 0 18px}.replay-player{width:100%;display:flex;gap:10px;align-items:center;text-align:left;padding:12px 10px;margin-top:4px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--color-text-primary);cursor:pointer;transition:background .15s,border-color .15s}.replay-player:hover{background:var(--surface-3)}.replay-player.is-selected{background:var(--color-brand-highlight);border-color:var(--color-brand-strong)}.replay-player__dot{width:10px;height:10px;border:1px solid #ffffff55;border-radius:50%;flex:none}.replay-player b{display:block;font-size:12px;overflow-wrap:anywhere}.replay-player small{display:block;color:var(--color-text-secondary);font-size:10px;margin-top:4px}.replay-player .replay-selected-label{color:var(--color-brand)}.replay-analytics{grid-column:1/-1;padding:24px}.replay-analytics__heading{display:flex;gap:16px;justify-content:space-between;align-items:center;margin-bottom:24px}.replay-analytics h2{font-size:19px}.replay-analytics h2 span{display:block;font-size:12px;font-weight:400;color:var(--color-text-secondary);margin-top:7px}.replay-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px 16px;margin-bottom:24px}.replay-metrics span{display:block;font-size:11px;color:var(--color-text-secondary);margin-bottom:8px}.replay-metrics b{font-size:22px;font-variant-numeric:tabular-nums}.replay-metrics .unavailable{font-size:14px;color:var(--color-text-secondary)}.replay-analytics>.meta{font-size:11px;line-height:1.8}.replay-events{border-top:1px solid var(--color-divider);padding-top:18px;margin-top:18px}.replay-events summary{font-size:12px;cursor:pointer;min-height:32px}.replay-events>div{display:flex;gap:8px;flex-wrap:wrap;max-height:220px;overflow:auto}.replay-events button{font-size:11px}.tag-enter-active,.tag-leave-active{transition:opacity .18s,transform .18s}.tag-enter-from,.tag-leave-to{opacity:0;transform:translateY(6px)}
@media(max-width:1100px){.replay-viewer{grid-template-columns:1fr}.replay-roster{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.replay-roster h2,.replay-roster-hint{grid-column:1/-1}.replay-roster-hint{margin-bottom:4px}.replay-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:600px){.replay-stage{height:360px}.replay-stage__top{inset:10px 10px auto;flex-direction:column;align-items:start}.replay-roster{grid-template-columns:repeat(2,minmax(0,1fr))}.replay-controls{padding:12px}.replay-transport{gap:4px}.replay-transport .btn{padding:8px}.replay-time{margin-left:0;flex:1}.replay-transport>.themed-select{margin-left:auto}.replay-camera-bar{gap:8px}.replay-camera-modes{width:100%}.replay-camera-modes button{flex:1;padding:10px 6px}.replay-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.replay-analytics{padding:18px}.replay-analytics__heading{align-items:start}.replay-analytics__heading .chip{font-size:10px;white-space:nowrap}}
@media(prefers-reduced-motion:reduce){.tag-enter-active,.tag-leave-active,.replay-player,.replay-camera-modes button{transition:none}}
</style>
<style scoped>
.replay-viewer kbd{font:inherit;font-size:10px;opacity:.65}.replay-camera-modes kbd{margin-left:4px}.replay-player-key{margin-left:auto;align-self:center}.replay-note summary{cursor:pointer;min-height:24px}.replay-note p{margin-bottom:0}.replay-stage__labels>span{max-width:160px;overflow:hidden;text-overflow:ellipsis}.replay-timeline input{appearance:none;background:transparent}.replay-timeline input::-webkit-slider-runnable-track{height:5px;border-radius:8px;background:linear-gradient(to right,var(--color-brand) var(--progress),var(--surface-5) var(--progress))}.replay-timeline input::-webkit-slider-thumb{appearance:none;width:14px;height:14px;margin-top:-4.5px;background:var(--color-brand);border:2px solid var(--surface-2);border-radius:50%;box-shadow:0 0 0 1px var(--color-brand)}.replay-timeline input::-moz-range-track{height:5px;background:var(--surface-5);border-radius:8px}.replay-timeline input::-moz-range-progress{height:5px;background:var(--color-brand)}.replay-timeline input::-moz-range-thumb{width:12px;height:12px;border:2px solid var(--surface-2);border-radius:50%;background:var(--color-brand)}
@media(max-width:1100px){.replay-roster{grid-row:1;display:flex;flex-wrap:nowrap;overflow-x:auto;gap:8px;padding:10px}.replay-roster h2{flex:0 0 60px;display:block}.replay-roster h2 span{display:block;margin-top:6px}.replay-roster-hint{display:none}.replay-player{flex:0 0 180px;width:180px;margin:0;min-height:78px}.replay-viewer__main{grid-row:2}.replay-analytics{grid-row:3}}
</style>
