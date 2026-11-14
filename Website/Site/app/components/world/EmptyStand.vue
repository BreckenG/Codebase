<script setup>
const canvas = ref(null);
let world;

onMounted(async () => {
  const w = await import('~/lib/world.js');
  if (!canvas.value) return;
  const { THREE } = w;
  world = w.stage(canvas.value);
  const { scene, camera } = world;
  const glow = new THREE.Color(...w.BRAND);
  const geos = await w.model('gorillas');
  const ghostMat = new THREE.MeshBasicMaterial({
    color: glow.clone().multiplyScalar(1.5),
    wireframe: true,
    transparent: true,
    opacity: 0.22,
    toneMapped: false,
    depthWrite: false,
  });
  const ghost = w.sit(new THREE.Mesh(geos.idle, ghostMat));
  const turn = new THREE.Group().add(ghost);
  const beamCanvas = Object.assign(document.createElement('canvas'), { width: 4, height: 128 });
  const ctx = beamCanvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,140,50,0)');
  grad.addColorStop(1, 'rgba(255,140,50,0.11)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 128);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.62, 2.6, 64, 1, true),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(beamCanvas),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  beam.position.y = 1.3;
  scene.add(w.stand(w.BRAND), turn, beam);
  const top = ghost.geometry.boundingBox.max.y - ghost.geometry.boundingBox.min.y;
  world.loop((now) => {
    const dist =
      (top * 0.62 + 0.55) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect * 1.1);
    camera.position.set(0, top / 2 + 0.3, dist);
    camera.lookAt(0, top / 2 - 0.05, 0);
    turn.rotation.y = now * 0.5;
    ghostMat.opacity = 0.16 + 0.08 * Math.sin(now * 3) + (Math.random() < 0.02 ? 0.15 : 0);
  });
});

onBeforeUnmount(() => world?.dispose());
</script>

<template>
  <canvas ref="canvas" class="stand3d" aria-hidden="true" />
</template>

<style scoped>
.stand3d {
  display: block;
}
</style>
