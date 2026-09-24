export function initialCamera(players) {
  const selected = players.find(player => player.self)?.id || players[0]?.id || ''
  return { selected, mode: selected ? 'third' : 'free', lastSelected: selected, followMode: 'third' }
}
export function selectCameraPlayer(camera, id, toggle = true) {
  if (toggle && camera.selected === id) return { ...camera, selected: '', mode: 'free', lastSelected: id }
  const mode = camera.mode === 'free' ? camera.followMode : camera.mode
  return { selected: id, mode, lastSelected: id, followMode: mode }
}
export function changeCameraMode(camera, mode, players) {
  if (mode === 'free') return { ...camera, selected: '', mode, lastSelected: camera.selected || camera.lastSelected }
  const selected = [camera.selected, camera.lastSelected].find(id => players.some(player => player.id === id)) || initialCamera(players).selected
  return { selected, mode: selected ? mode : 'free', lastSelected: selected, followMode: mode }
}
