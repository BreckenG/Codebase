const subtract = (a, b) => a.map((v, k) => v - b[k])
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a.reduce((s, v, k) => s + v * b[k], 0)

export function prepareReplayGeometry(geometry) {
  const vertices = geometry?.available ? geometry.vertices : []
  const triangles = geometry?.available ? geometry.triangles || [] : []
  const surfaces = new Float32Array(triangles.length * 4)
  const bounds = []
  for (let start = 0; start < triangles.length; start += 96) {
    const end = Math.min(start + 96, triangles.length)
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
    for (let i = start; i < end; i += 3) {
      const points = triangles.slice(i, i + 3).map(index => vertices.slice(index * 3, index * 3 + 3))
      const normal = cross(subtract(points[1], points[0]), subtract(points[2], points[0]))
      const length = Math.hypot(...normal)
      const light = length ? 0.48 + 0.52 * Math.abs(dot(normal, [0.3, 0.85, 0.43]) / length) : 0.48
      for (let n = 0; n < 3; n++) {
        surfaces.set([...points[n], light], (i + n) * 4)
        for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], points[n][k]); max[k] = Math.max(max[k], points[n][k]) }
      }
    }
    bounds.push({ start, end, min, max })
  }
  function partition(groups) {
    if (groups.length === 1) return groups[0]
    const min = [0, 1, 2].map(k => Math.min(...groups.map(g => g.min[k])))
    const max = [0, 1, 2].map(k => Math.max(...groups.map(g => g.max[k])))
    const axis = [0, 1, 2].sort((a, b) => max[b] - min[b] - (max[a] - min[a]))[0]
    groups.sort((a, b) => a.min[axis] + a.max[axis] - b.min[axis] - b.max[axis])
    const middle = groups.length >> 1
    return { min, max, children: [partition(groups.slice(0, middle)), partition(groups.slice(middle))] }
  }
  const tree = bounds.length ? partition(bounds) : null
  function occluded(eye, target) {
    const direction = subtract(target, eye)
    const distance = Math.hypot(...direction)
    if (!distance) return false
    const limit = 1 - 0.08 / distance
    const pending = tree ? [tree] : []
    while (pending.length) {
      const group = pending.pop()
      let near = 0, far = limit
      for (let k = 0; k < 3; k++) {
        if (Math.abs(direction[k]) < 1e-9) {
          if (eye[k] < group.min[k] || eye[k] > group.max[k]) { far = -1; break }
        } else {
          const a = (group.min[k] - eye[k]) / direction[k], b = (group.max[k] - eye[k]) / direction[k]
          near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b))
        }
      }
      if (near > far) continue
      if (group.children) { pending.push(...group.children); continue }
      for (let i = group.start; i < group.end; i += 3) {
        const a = triangles[i] * 3, b = triangles[i + 1] * 3, c = triangles[i + 2] * 3
        const bx = vertices[b] - vertices[a], by = vertices[b + 1] - vertices[a + 1], bz = vertices[b + 2] - vertices[a + 2]
        const cx = vertices[c] - vertices[a], cy = vertices[c + 1] - vertices[a + 1], cz = vertices[c + 2] - vertices[a + 2]
        const px = direction[1] * cz - direction[2] * cy, py = direction[2] * cx - direction[0] * cz, pz = direction[0] * cy - direction[1] * cx
        const determinant = bx * px + by * py + bz * pz
        if (Math.abs(determinant) < 1e-9) continue
        const ox = eye[0] - vertices[a], oy = eye[1] - vertices[a + 1], oz = eye[2] - vertices[a + 2]
        const u = (ox * px + oy * py + oz * pz) / determinant
        if (u < 0 || u > 1) continue
        const qx = oy * bz - oz * by, qy = oz * bx - ox * bz, qz = ox * by - oy * bx
        const v = (direction[0] * qx + direction[1] * qy + direction[2] * qz) / determinant
        if (v < 0 || u + v > 1) continue
        const t = (cx * qx + cy * qy + cz * qz) / determinant
        if (t > 0.02 / distance && t < limit) return true
      }
    }
    return false
  }
  return { surfaces, occluded }
}
