<script setup>
const props = defineProps({
  pose: { type: String, default: 'idle' },
  color: { type: Array, default: null },
  tier: { type: String, default: 'bronze' },
  badge: { type: String, default: '' },
  glow: { type: Array, default: null },
  cosmetics: { type: Array, default: () => [] },
});
const canvas = ref(null);
let world;

onMounted(async () => {
  const w = await import('~/lib/world.js');
  if (!canvas.value) return;
  const { THREE } = w;
  world = w.stage(canvas.value);
  const { scene, camera } = world;
  const glow = props.glow || (props.color ? w.BRAND : w.TIERS[props.tier]?.glow) || w.BRAND;
  const key = new THREE.DirectionalLight(0xfff0dc, 1.2);
  key.position.set(2.2, 3.4, 3);
  const rim = new THREE.SpotLight(new THREE.Color(...glow), 60, 0, 0.5, 1, 2);
  rim.position.set(-2.4, 2.4, -2.6);
  scene.add(key, rim, rim.target, w.stand(glow));
  const turn = new THREE.Group();
  scene.add(turn);
  const geos = await w.model('gorillas');
  const fig = w.sit(new THREE.Mesh(geos[props.pose] || geos.idle, w.fur(props.color || w.TIERS[props.tier].rgb)));
  turn.add(fig);
  w.dress(fig, props.pose, props.cosmetics);
  const bb = fig.geometry.boundingBox;
  const top = bb.max.y - bb.min.y;
  const halfW = Math.max(-bb.min.x, bb.max.x, 0.66) + 0.08;
  let mark;
  if (props.badge) {
    mark = await w.badge(props.badge, 0.42);
    mark.g.position.y = top + 0.36;
    scene.add(mark.g);
  }
  const high = top + (mark ? 0.62 : 0.12);
  const lookY = high / 2 - 0.04;
  world.loop((now) => {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max((high / 2 + 0.24) / tan, halfW / (tan * camera.aspect));
    camera.position.set(0, lookY + 0.25, dist);
    camera.lookAt(0, lookY, 0);
    turn.rotation.y = Math.sin(now * 0.45) * 0.35;
    if (!mark) return;
    mark.g.rotation.y = Math.sin(now * 0.7) * 0.35;
    mark.g.position.y = top + 0.36 + Math.sin(now * 1.3) * 0.03;
  });
});

onBeforeUnmount(() => world?.dispose());
</script>

<template>
  <canvas ref="canvas" class="figure3d" aria-hidden="true" />
</template>

<style scoped>
.figure3d {
  display: block;
  width: 100%;
  height: 100%;

  mask: linear-gradient(90deg, transparent, #000 5% 95%, transparent), linear-gradient(#000 90%, transparent);
  mask-composite: intersect;
}
</style>
