import { loadPaintedMap } from './replay-renderer.js'

const CAMERA = 'uniform vec3 eye;uniform vec3 right;uniform vec3 up;uniform vec3 forward;uniform float aspect;uniform float focal;uniform float near;uniform float far;'
const RAMP = 'vec3 ramp(float v){vec3 c=mix(vec3(0.16,0.30,0.95),vec3(0.10,0.80,0.90),smoothstep(0.0,0.3,v));c=mix(c,vec3(0.35,0.90,0.30),smoothstep(0.3,0.5,v));c=mix(c,vec3(1.0,0.88,0.20),smoothstep(0.5,0.72,v));c=mix(c,vec3(0.98,0.25,0.15),smoothstep(0.72,1.0,v));return c;}'
const MAP_VERTEX = 'attribute vec3 position;attribute vec2 uv;attribute vec4 rect;attribute vec3 col;' + CAMERA + 'varying vec2 vUv;varying vec4 vRect;varying vec3 vCol;varying float vDist;varying vec3 vPos;void main(){vec3 p=position-eye;float z=dot(p,forward);vDist=length(p);vUv=uv;vRect=rect;vCol=col;vPos=position;gl_Position=vec4(dot(p,right)*focal/aspect,dot(p,up)*focal,((far+near)*z-2.0*far*near)/(far-near),z);}'
const MAP_FRAGMENT = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' + RAMP + 'uniform sampler2D atlas;uniform sampler2D grid;uniform vec3 sky;uniform float fog;uniform float cut;uniform float dim;uniform float paint;uniform vec3 origin;uniform vec3 size;uniform vec2 tiles;varying vec2 vUv;varying vec4 vRect;varying vec3 vCol;varying float vDist;varying vec3 vPos;float cellAt(vec3 q){if(q.x<0.5||q.z<0.5||q.x>size.x-0.5||q.z>size.z-0.5||q.y<0.0||q.y>=size.y)return 0.0;float l=floor(q.y);vec2 t=vec2(mod(l,tiles.x),floor(l/tiles.x));return texture2D(grid,(t+q.xz/size.xz)/tiles).r;}void main(){if(vPos.y>cut)discard;vec3 t=vRect.z>0.0?texture2D(atlas,vRect.xy+vec2(fract(vUv.x),1.0-fract(vUv.y))*vRect.zw).rgb:vec3(1.0);vec3 c=mix(t*vCol,sky,1.0-exp(-vDist*fog));float g=dot(c,vec3(0.299,0.587,0.114));vec3 base=mix(c,vec3(g)*0.85,dim);float v=0.0;if(paint>0.0){vec3 q=vPos-origin;v=max(cellAt(q+vec3(0.0,0.4,0.0)),max(cellAt(q+vec3(0.0,1.4,0.0)),cellAt(q+vec3(0.0,2.4,0.0))*0.7));}gl_FragColor=vec4(mix(base,ramp(v),smoothstep(0.03,0.25,v)*0.92*paint),1.0);}'
const DOT_VERTEX = 'attribute vec4 cell;' + CAMERA + 'uniform float pixels;uniform float radius;varying float vW;void main(){vec3 p=cell.xyz-eye;float z=dot(p,forward);vW=cell.w;gl_Position=vec4(dot(p,right)*focal/aspect,dot(p,up)*focal,0.0,z);gl_PointSize=clamp(radius*focal*pixels/max(z,0.01),2.0,220.0);}'
const DOT_FRAGMENT = 'precision mediump float;varying float vW;void main(){float d=length(gl_PointCoord-0.5)*2.0;float a=max(0.0,1.0-d);gl_FragColor=vec4(vW*a*a,0.0,0.0,1.0);}'
const BLIT_VERTEX = 'attribute vec2 corner;varying vec2 vAt;void main(){vAt=corner*0.5+0.5;gl_Position=vec4(corner,0.0,1.0);}'
const BLIT_FRAGMENT = 'precision mediump float;' + RAMP + 'uniform sampler2D heat;uniform float strength;varying vec2 vAt;void main(){float v=texture2D(heat,vAt).r;gl_FragColor=vec4(ramp(v),smoothstep(0.015,0.2,v)*0.86*strength);}'

export function heatBasis(view) {
  const sy = Math.sin(view.yaw), cy = Math.cos(view.yaw), sp = Math.sin(view.pitch), cp = Math.cos(view.pitch)
  const forward = [-cp * sy, -sp, -cp * cy]
  return { forward, right: [-cy, 0, sy], up: [-sp * sy, cp, -sp * cy], eye: view.target.map((n, i) => n - forward[i] * view.dist) }
}

function spread(values, low, high) {
  const sorted = Float32Array.from(values).sort()
  return [sorted[Math.floor((sorted.length - 1) * low)], sorted[Math.floor((sorted.length - 1) * high)]]
}

export async function createHeatRenderer(canvas) {
  const painted = await loadPaintedMap()
  if (!painted) throw new Error('The map could not be loaded.')
  const gl = canvas.getContext('webgl', { alpha: false, antialias: true })
  if (!gl) throw new Error('This device does not support the heat map viewer.')
  function program(vertexSource, fragmentSource, attributes, uniforms) {
    const made = [vertexSource, fragmentSource].map((source, i) => { const s = gl.createShader(i ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER); gl.shaderSource(s, source); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Heat map graphics unavailable'); return s })
    const p = gl.createProgram(); gl.attachShader(p, made[0]); gl.attachShader(p, made[1]); gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Heat map graphics unavailable')
    return { p, shaders: made, at: Object.fromEntries(attributes.map(k => [k, gl.getAttribLocation(p, k)])), un: Object.fromEntries(uniforms.map(k => [k, gl.getUniformLocation(p, k)])) }
  }
  const camera = ['eye', 'right', 'up', 'forward', 'aspect', 'focal', 'near', 'far']
  const map = program(MAP_VERTEX, MAP_FRAGMENT, ['position', 'uv', 'rect', 'col'], [...camera, 'atlas', 'grid', 'sky', 'fog', 'cut', 'dim', 'paint', 'origin', 'size', 'tiles'])
  const dots = program(DOT_VERTEX, DOT_FRAGMENT, ['cell'], [...camera, 'pixels', 'radius'])
  const blit = program(BLIT_VERTEX, BLIT_FRAGMENT, ['corner'], ['heat', 'strength'])
  const mapBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, mapBuffer); gl.bufferData(gl.ARRAY_BUFFER, painted.data, gl.STATIC_DRAW)
  const atlas = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, atlas); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, painted.image)
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
  const corner = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, corner); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const dotBuffer = gl.createBuffer(), target = gl.createFramebuffer(), heat = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, heat)
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
  const grid = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, grid)
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
  let dotCount = 0, heatSize = [0, 0], radius = 1.2, volume = { origin: [0, 0, 0], size: [1, 1, 1], tiles: [1, 1] }
  function fill(cells, weights, events) {
    const n = cells.length / 4
    let low = [0, 0, 0], high = [0, 0, 0]
    if (n) { low = [Infinity, Infinity, Infinity]; high = [-Infinity, -Infinity, -Infinity] }
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { low[k] = Math.min(low[k], cells[i * 4 + k]); high[k] = Math.max(high[k], cells[i * 4 + k]) }
    const origin = low.map(v => v - 2), sx = Math.min(200, high[0] - low[0] + 5), sy = Math.min(48, high[1] - low[1] + 5), sz = Math.min(200, high[2] - low[2] + 5)
    let boxes = new Float32Array(sx * sy * sz)
    const at = (x, y, z) => (y * sz + z) * sx + x
    for (let i = 0; i < n; i++) {
      const x = cells[i * 4] - origin[0], y = cells[i * 4 + 1] - origin[1], z = cells[i * 4 + 2] - origin[2]
      if (x < sx && y < sy && z < sz) boxes[at(x, y, z)] = Math.max(boxes[at(x, y, z)], weights[i])
    }
    for (let pass = 0; pass < (events ? 2 : 1); pass++) {
      const next = new Float32Array(boxes)
      for (let y = 0; y < sy; y++) for (let z = 1; z < sz - 1; z++) for (let x = 1; x < sx - 1; x++) {
        const v = boxes[at(x, y, z)]
        if (!v) continue
        for (const [dx, dz, f] of [[1, 0, 0.62], [-1, 0, 0.62], [0, 1, 0.62], [0, -1, 0.62], [1, 1, 0.4], [1, -1, 0.4], [-1, 1, 0.4], [-1, -1, 0.4]]) { const j = at(x + dx, y, z + dz); if (next[j] < v * f) next[j] = v * f }
      }
      boxes = next
    }
    const cols = Math.ceil(Math.sqrt(sy)), rows = Math.ceil(sy / cols), width = cols * sx, bytes = new Uint8Array(width * rows * sz)
    for (let y = 0; y < sy; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) bytes[(Math.floor(y / cols) * sz + z) * width + (y % cols) * sx + x] = Math.min(255, Math.round(boxes[at(x, y, z)] * 255))
    gl.bindTexture(gl.TEXTURE_2D, grid); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, rows * sz, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, bytes)
    volume = { origin, size: [sx, sy, sz], tiles: [cols, rows] }
  }
  const xs = [], ys = [], zs = []
  for (let i = 0; i < painted.count; i += 7) { xs.push(painted.data[i * 12]); ys.push(painted.data[i * 12 + 1]); zs.push(painted.data[i * 12 + 2]) }
  const [x0, x1] = spread(xs, 0.12, 0.88), [z0, z1] = spread(zs, 0.12, 0.88), [y0, y1] = spread(ys, 0.02, 0.98)
  const bounds = { center: [(x0 + x1) / 2, y0, (z0 + z1) / 2], half: Math.max(x1 - x0, z1 - z0) / 2 * 1.25, floor: y0, top: y1 }
  function setCells(cells, events) {
    const n = cells.length / 4, counts = []
    for (let i = 0; i < n; i++) counts.push(cells[i * 4 + 3])
    const ref = n ? Math.max(1, spread(counts, 0, 0.95)[1]) : 1, data = new Float32Array(n * 4), weights = new Float32Array(n)
    for (let i = 0; i < n; i++) { weights[i] = Math.min(1, Math.sqrt(cells[i * 4 + 3] / ref)); data.set([cells[i * 4] + 0.5, cells[i * 4 + 1] + 0.5, cells[i * 4 + 2] + 0.5, weights[i] * (events ? 0.5 : 0.2)], i * 4) }
    fill(cells, weights, events)
    dotCount = n; radius = events ? 2.6 : 2.1
    gl.bindBuffer(gl.ARRAY_BUFFER, dotBuffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
  }
  function uniforms(un, view, basis, aspect) {
    for (const key of ['eye', 'right', 'up', 'forward']) gl.uniform3fv(un[key], basis[key])
    gl.uniform1f(un.aspect, aspect); gl.uniform1f(un.focal, view.focal)
    gl.uniform1f(un.near, view.dist > 60 ? view.dist * 0.4 : 0.1); gl.uniform1f(un.far, view.dist + 500)
  }
  function render(view) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2), width = Math.max(1, Math.round(canvas.clientWidth * ratio)), height = Math.max(1, Math.round(canvas.clientHeight * ratio))
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
    const basis = heatBasis(view), aspect = width / height, sky = [0.07, 0.09, 0.12]
    const hw = Math.max(1, width >> 1), hh = Math.max(1, height >> 1)
    if (heatSize[0] !== hw || heatSize[1] !== hh) {
      heatSize = [hw, hh]
      gl.bindTexture(gl.TEXTURE_2D, heat); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, hw, hh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, heat, 0)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, hw, hh); gl.disable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT)
    if (dotCount) {
      gl.useProgram(dots.p); uniforms(dots.un, view, basis, aspect)
      gl.uniform1f(dots.un.pixels, hh); gl.uniform1f(dots.un.radius, radius)
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE)
      gl.bindBuffer(gl.ARRAY_BUFFER, dotBuffer); gl.vertexAttribPointer(dots.at.cell, 4, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(dots.at.cell)
      gl.drawArrays(gl.POINTS, 0, dotCount); gl.disableVertexAttribArray(dots.at.cell)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, width, height); gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST)
    gl.clearColor(sky[0], sky[1], sky[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(map.p); uniforms(map.un, view, basis, aspect)
    gl.uniform3fv(map.un.sky, sky); gl.uniform1f(map.un.fog, view.fog ?? 0); gl.uniform1f(map.un.cut, view.cut ?? 1e6); gl.uniform1f(map.un.dim, view.dim ?? 0.45)
    gl.uniform1f(map.un.paint, view.paint ?? 0); gl.uniform3fv(map.un.origin, volume.origin); gl.uniform3fv(map.un.size, volume.size); gl.uniform2fv(map.un.tiles, volume.tiles)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, grid); gl.uniform1i(map.un.grid, 1)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlas); gl.uniform1i(map.un.atlas, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, mapBuffer)
    for (const [name, size, offset] of [['position', 3, 0], ['uv', 2, 12], ['rect', 4, 20], ['col', 3, 36]]) { gl.vertexAttribPointer(map.at[name], size, gl.FLOAT, false, 48, offset); gl.enableVertexAttribArray(map.at[name]) }
    gl.drawArrays(gl.TRIANGLES, 0, painted.count)
    for (const name of ['position', 'uv', 'rect', 'col']) gl.disableVertexAttribArray(map.at[name])
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(blit.p); gl.bindTexture(gl.TEXTURE_2D, heat); gl.uniform1i(blit.un.heat, 0); gl.uniform1f(blit.un.strength, view.overlay ?? 1)
    gl.bindBuffer(gl.ARRAY_BUFFER, corner); gl.vertexAttribPointer(blit.at.corner, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(blit.at.corner)
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disableVertexAttribArray(blit.at.corner); gl.disable(gl.BLEND)
  }
  function dispose() {
    for (const made of [map, dots, blit]) { gl.deleteProgram(made.p); for (const s of made.shaders) gl.deleteShader(s) }
    for (const b of [mapBuffer, corner, dotBuffer]) gl.deleteBuffer(b)
    gl.deleteTexture(atlas); gl.deleteTexture(heat); gl.deleteTexture(grid); gl.deleteFramebuffer(target); gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
  return { render, setCells, bounds, dispose }
}
