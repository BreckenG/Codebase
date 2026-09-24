import { prepareReplayGeometry } from './replay-geometry.js'
import { loadQuestModel, loadIndexModel, loadViveModel, createReplayAvatars } from './replay-avatar.mjs'

const sub = (a, b) => a.map((n, i) => n - b[i])
const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0)
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const unit = a => { const n = Math.hypot(...a) || 1; return a.map(v => v / n) }
export function rotatedForward(q) {
  if (!q) return [0, 0, 1]
  const [x, y, z, w] = unit(q)
  return [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)]
}
export function frameAt(frames, t) {
  let low = 0, high = frames.length - 1, found = -1
  while (low <= high) { const mid = (low + high) >> 1; if (frames[mid].t <= t) { found = mid; low = mid + 1 } else high = mid - 1 }
  if (found < 0 || t - frames[found].t > 500) return {}
  const a = frames[found], b = frames[found + 1]
  if (!b || b.t - a.t > 500 || b.t <= a.t) return a.p
  const ratio = (t - a.t) / (b.t - a.t), result = {}
  for (const [id, p] of Object.entries(a.p)) {
    const next = b.p[id]
    result[id] = { ...p }
    if (next) for (const k of ['h', 'b', 'l', 'r']) result[id][k] = p[k].map((n, i) => n + (next[k][i] - n) * ratio)
  }
  return result
}

export async function createReplayRenderer(canvas, geometry) {
  const [assets, indexAssets, viveAssets] = await Promise.all([loadQuestModel(), loadIndexModel(), loadViveModel()])
  const gl = canvas.getContext('webgl', { alpha: false, antialias: true, stencil: true })
  if (!gl) throw new Error('This device does not support the replay graphics viewer.')
  function shader(type, source) { const value = gl.createShader(type); gl.shaderSource(value, source); gl.compileShader(value); if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error('Replay shader unavailable'); return value }
  const vertex = shader(gl.VERTEX_SHADER, 'attribute vec3 position;attribute float light;uniform vec3 eye;uniform vec3 right;uniform vec3 up;uniform vec3 forward;uniform float aspect;varying float distanceToEye;varying float illumination;void main(){vec3 p=position-eye;float z=dot(p,forward);distanceToEye=length(p);illumination=light;gl_Position=vec4(dot(p,right)*1.5/aspect,dot(p,up)*1.5,1.00004*z-0.0400008,z);}')
  const fragment = shader(gl.FRAGMENT_SHADER, 'precision mediump float;uniform vec3 color;varying float distanceToEye;varying float illumination;void main(){float fog=1.0-exp(-distanceToEye*0.008);gl_FragColor=vec4(mix(color*illumination,vec3(0.025,0.038,0.06),fog),1.0);}')
  const program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Replay graphics unavailable')
  const position = gl.getAttribLocation(program, 'position')
  const light = gl.getAttribLocation(program, 'light')
  const uniforms = Object.fromEntries(['eye', 'right', 'up', 'forward', 'aspect', 'color'].map(k => [k, gl.getUniformLocation(program, k)]))
  const map = gl.createBuffer(), solid = gl.createBuffer(), avatars = createReplayAvatars(gl, assets, indexAssets, viveAssets)
  const prepared = prepareReplayGeometry(geometry)
  gl.bindBuffer(gl.ARRAY_BUFFER, solid); gl.bufferData(gl.ARRAY_BUFFER, prepared.surfaces, gl.STATIC_DRAW)
  let mapCount = 0
  if (geometry?.available && !prepared.surfaces.length) {
    const vertices = new Float32Array(geometry.edges.length * 3)
    geometry.edges.forEach((index, i) => { for (let k = 0; k < 3; k++) vertices[i * 3 + k] = geometry.vertices[index * 3 + k] })
    mapCount = vertices.length / 3
    gl.bindBuffer(gl.ARRAY_BUFFER, map); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
  }
  gl.enable(gl.DEPTH_TEST)
  function bind(buffer, surface = false) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, surface ? 16 : 0, 0); gl.enableVertexAttribArray(position)
    if (surface) { gl.vertexAttribPointer(light, 1, gl.FLOAT, false, 16, 12); gl.enableVertexAttribArray(light) }
    else { gl.disableVertexAttribArray(light); gl.vertexAttrib1f(light, 1) }
  }
  function render(eye, target, poses, players, hide, selected) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2), width = Math.max(1, Math.round(canvas.clientWidth * ratio)), height = Math.max(1, Math.round(canvas.clientHeight * ratio))
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
    const direction = sub(target, eye), forward = Math.hypot(...direction) > 0.0001 ? unit(direction) : [0, 0, 1], right = unit(cross(Math.abs(forward[1]) > 0.999 ? [0, 0, 1] : [0, 1, 0], forward)), up = cross(forward, right)
    gl.viewport(0, 0, width, height); gl.clearColor(0.025, 0.038, 0.06, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.useProgram(program)
    for (const [key, value] of Object.entries({ eye, right, up, forward })) gl.uniform3fv(uniforms[key], value)
    gl.uniform1f(uniforms.aspect, width / height)
    if (prepared.surfaces.length) {
      bind(solid, true); gl.uniform3fv(uniforms.color, [0.28, 0.38, 0.42]); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1)
      gl.drawArrays(gl.TRIANGLES, 0, prepared.surfaces.length / 4); gl.disable(gl.POLYGON_OFFSET_FILL)
    }
    if (mapCount) { bind(map); gl.uniform3fv(uniforms.color, prepared.surfaces.length ? [0.12, 0.18, 0.21] : [0.24, 0.42, 0.48]); gl.drawArrays(gl.LINES, 0, mapCount) }
    avatars.render({ eye, right, up, forward, aspect: width / height }, poses, players, hide, selected)
    const labels = []
    for (const player of players) {
      const p = poses[player.id]
      if (!p || player.id === hide) continue
      const delta = sub([p.h[0], p.h[1] + 0.4, p.h[2]], eye), depth = dot(delta, forward)
      if (depth > 0.1) {
        const x = (0.5 + dot(delta, right) * 0.75 / (width / height) / depth) * 100, y = (0.5 - dot(delta, up) * 0.75 / depth) * 100
        if (x > 0 && x < 100 && y > 0 && y < 100 && !prepared.occluded(eye, p.h) && !prepared.occluded(eye, [p.h[0], p.h[1] + 0.4, p.h[2]])) labels.push({ id: player.id, name: player.name, x, y, tagged: p.tag === 1, selected: player.id === selected })
      }
    }
    return labels
  }
  return { render, dispose() { gl.deleteBuffer(map); avatars.dispose(); gl.deleteBuffer(solid); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); gl.getExtension('WEBGL_lose_context')?.loseContext() } }
}
