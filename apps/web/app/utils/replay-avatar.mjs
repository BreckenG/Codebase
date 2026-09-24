export function parseQuestModel(bytes) {
  if (bytes.byteLength < 16) throw new Error('Player model is incomplete.')
  const header = new DataView(bytes)
  if (header.getUint32(0, true) !== 0x32515752) throw new Error('Player model is invalid.')
  const counts = [4, 8, 12].map(offset => header.getUint32(offset, true))
  if (counts.some(count => !count || count % 3 || count > 60000) || bytes.byteLength !== 16 + counts.reduce((sum, count) => sum + count * 32, 0)) throw new Error('Player model geometry is invalid.')
  let offset = 16
  return counts.map(count => { const part = new Float32Array(bytes, offset, count * 8); offset += count * 32; return part })
}
export function controllerHeading(q) {
  if (!q) return [0, 0, 0, 1]
  const length = Math.hypot(...q), [x, y, z, w] = q.map(v => v / length)
  const forwardX = 2 * (x * z + w * y), forwardZ = 1 - 2 * (x * x + y * y)
  const yaw = Math.hypot(forwardX, forwardZ) < 0.0001 ? 0 : Math.atan2(forwardX, forwardZ)
  return [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)]
}
const models = new Map()
function loadModel(name) {
  if (!models.has(name)) models.set(name, Promise.all([
    fetch(`/models/${name}.bin`).then(response => { if (!response.ok) throw new Error('Could not load replay player models.'); return response.arrayBuffer() }).then(parseQuestModel),
    ...['head', 'controllers'].map(part => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not load replay player textures.')); image.src = `/models/${name}-${part}.jpg` }))
  ]).catch(error => { models.delete(name); throw error }))
  return models.get(name)
}
export const loadQuestModel = () => loadModel('quest-2')
export const loadIndexModel = () => loadModel('valve-index')
export const loadViveModel = () => loadModel('htc-vive')
export function avatarModel(platform, bot = false) { return bot ? 'vive' : platform === 'steam' ? 'index' : 'quest' }
export function createReplayAvatars(gl, assets, indexAssets, viveAssets) {
  function shader(type, source) { const result = gl.createShader(type); gl.shaderSource(result, source); gl.compileShader(result); if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error('Player graphics unavailable.'); return result }
  const vertex = shader(gl.VERTEX_SHADER, 'attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform vec3 origin;uniform vec4 rotation;uniform mediump float outline;uniform vec3 eye;uniform vec3 right;uniform vec3 up;uniform vec3 forward;uniform float aspect;varying vec2 tex;varying float light;varying float depth;vec3 rotate(vec3 v){vec4 q=normalize(rotation);return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}void main(){vec3 n=rotate(normal);vec3 p=origin+rotate(position)+n*outline-eye;float z=dot(p,forward);tex=uv;depth=length(p);light=0.45+0.55*max(0.0,dot(n,normalize(vec3(0.3,0.85,0.43))));gl_Position=vec4(dot(p,right)*1.5/aspect,dot(p,up)*1.5,1.00004*z-0.0400008,z);}')
  const fragment = shader(gl.FRAGMENT_SHADER, 'precision mediump float;uniform sampler2D surface;uniform vec3 color;uniform mediump float outline;varying vec2 tex;varying float light;varying float depth;void main(){vec3 base=outline>0.0?color:texture2D(surface,tex).rgb*light;gl_FragColor=vec4(mix(base,vec3(0.025,0.038,0.06),1.0-exp(-depth*0.008)),1.0);}')
  const program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Player graphics unavailable.')
  const attributes = ['position', 'normal', 'uv'].map(name => gl.getAttribLocation(program, name))
  const uniforms = Object.fromEntries(['origin', 'rotation', 'outline', 'eye', 'right', 'up', 'forward', 'aspect', 'surface', 'color'].map(name => [name, gl.getUniformLocation(program, name)]))
  const geometry = [assets, indexAssets, viveAssets].filter(Boolean).map(assets => {
  const buffers = assets[0].map(part => { const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, part, gl.STATIC_DRAW); return { buffer, count: part.length / 8 } })
  const textures = assets.slice(1).map(image => { const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.generateMipmap(gl.TEXTURE_2D); return texture })
    return { buffers, textures }
  })
  function render(view, poses, players, hide, selected) {
    gl.useProgram(program)
    for (const name of ['eye', 'right', 'up', 'forward']) gl.uniform3fv(uniforms[name], view[name])
    gl.uniform1f(uniforms.aspect, view.aspect); gl.uniform1i(uniforms.surface, 0); gl.activeTexture(gl.TEXTURE0)
    gl.stencilMask(255); gl.clear(gl.STENCIL_BUFFER_BIT); gl.enable(gl.STENCIL_TEST); gl.frontFace(gl.CW)
    let silhouette = 0
    for (const player of players) {
      const pose = poses[player.id]
      if (!pose) continue
      const color = pose.tag === 1 ? [1, 0.39, 0.36] : player.renderColor
      gl.uniform3fv(uniforms.color, color.map(value => Math.max(0.2, value)))
      const { buffers, textures } = geometry[{ quest: 0, index: 1, vive: 2 }[avatarModel(player.platform, player.bot)]]
      const heading = controllerHeading(pose.q)
      for (let part = 0; part < 3; part++) {
        if (!part && player.id === hide) continue
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[part].buffer)
        for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(attributes[i]); gl.vertexAttribPointer(attributes[i], i === 2 ? 2 : 3, gl.FLOAT, false, 32, [0, 12, 24][i]) }
        gl.uniform3fv(uniforms.origin, pose[['h', 'l', 'r'][part]])
        gl.uniform4fv(uniforms.rotation, part ? heading : pose.q || [0, 0, 0, 1])
        gl.bindTexture(gl.TEXTURE_2D, textures[part ? 1 : 0])
        silhouette = silhouette % 255 + 1
        gl.disable(gl.CULL_FACE); gl.stencilMask(255); gl.stencilFunc(gl.ALWAYS, silhouette, 255); gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE)
        gl.uniform1f(uniforms.outline, 0); gl.drawArrays(gl.TRIANGLES, 0, buffers[part].count)
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); gl.stencilMask(0); gl.stencilFunc(gl.NOTEQUAL, silhouette, 255); gl.depthMask(false)
        gl.uniform1f(uniforms.outline, player.id === selected ? 0.005 : 0.0035); gl.drawArrays(gl.TRIANGLES, 0, buffers[part].count)
        gl.depthMask(true)
      }
    }
    gl.disable(gl.CULL_FACE); gl.disable(gl.STENCIL_TEST); gl.stencilMask(255); gl.frontFace(gl.CCW)
  }
  return { render, dispose() { for (const { buffers, textures } of geometry) { for (const { buffer } of buffers) gl.deleteBuffer(buffer); for (const texture of textures) gl.deleteTexture(texture); } gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment) } }
}
