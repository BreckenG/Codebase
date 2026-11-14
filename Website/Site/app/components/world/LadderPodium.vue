<script setup>
const props = defineProps({ rows: { type: Array, required: true }, track: { type: String, default: 'ranked' } });
const SPOTS = [
  { place: 3, x: -2.6, h: 0.12, pose: 'thumbsup' },
  { place: 1, x: -1.3, h: 0.36, pose: 'flex' },
  { place: 0, x: 0, h: 0.6, pose: 'cheer' },
  { place: 2, x: 1.3, h: 0.24, pose: 'wave' },
  { place: 4, x: 2.6, h: 0, pose: 'peace' },
];
const spots = computed(() => SPOTS.filter((s) => props.rows[s.place]).map((s) => ({ ...s, p: props.rows[s.place] })));
const canvas = ref(null);
const labels = ref([]);
const shown = ref(false);
let world;

onMounted(async () => {
  const w = await import('~/lib/world.js');
  if (!canvas.value) return;
  const { THREE } = w;
  world = w.stage(canvas.value);
  const { scene, camera } = world;
  const key = new THREE.DirectionalLight(0xfff0dc, 1.1);
  key.position.set(2.2, 4, 4);
  const rim = new THREE.SpotLight(0xffd9a8, 80, 0, 0.6, 1, 2);
  rim.position.set(0, 3.2, -3.4);
  scene.add(key, rim, rim.target);
  const geos = await w.model('gorillas');
  const turns = spots.value.map((s) => {
    const tier = s.p[props.track].tier.tier.toLowerCase();
    const g = new THREE.Group();
    g.position.set(s.x, s.h, -Math.abs(s.x) * 0.25);
    const fig = w.sit(new THREE.Mesh(geos[s.pose], w.fur(s.p.color || w.TIERS[tier].rgb)));
    w.dress(fig, s.pose, s.p.cosmetics);
    const turn = new THREE.Group().add(fig);
    turn.rotation.y = -s.x * 0.12;
    g.add(w.stand(w.TIERS[tier].glow, s.h), turn);
    scene.add(g);
    return { g, turn, seed: s.x * 3 };
  });
  const proj = new THREE.Vector3();
  shown.value = true;
  world.loop((now) => {
    const narrow = camera.aspect < 1.2;
    camera.position.set(0, 1.35, narrow ? 12 / camera.aspect : 7.6);
    camera.lookAt(0, 0.95, 0);
    turns.forEach((t, i) => {
      t.turn.rotation.y = -spots.value[i].x * 0.12 + Math.sin(now * 0.4 + t.seed) * 0.25;
      proj
        .copy(t.g.position)
        .setY(t.g.position.y - 0.3)
        .project(camera);
      const el = labels.value[i];
      if (!el) return;
      el.style.left = `${((proj.x + 1) / 2) * 100}%`;
      el.style.top = `${((1 - proj.y) / 2) * 100}%`;
    });
  });
});

onBeforeUnmount(() => world?.dispose());
</script>

<template>
  <div class="podium3d">
    <canvas ref="canvas" aria-hidden="true" />
    <ol class="podium3d__tags" :class="{ on: shown }">
      <li v-for="s in spots" :key="s.p.discordId" ref="labels">
        <NuxtLink :to="`/player/${s.p.discordId}`">
          <span class="podium3d__place">#{{ s.p.rank }}</span>
          <strong>{{ s.p.name }}</strong>
          <small>{{ num(s.p[track].elo) }} MMR</small>
        </NuxtLink>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.podium3d {
  position: relative;
  height: clamp(420px, 56vw, 620px);
}
.podium3d canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.podium3d__tags {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}
.podium3d__tags li {
  position: absolute;
  transform: translate(-50%, 0);
  opacity: 0;
  transition: opacity 0.6s var(--ease-out-expo);
  pointer-events: auto;
}
.podium3d__tags.on li {
  opacity: 1;
}
.podium3d__tags a {
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 10px;
  text-align: center;
}
.podium3d__tags a:hover {
  background: rgba(255, 255, 255, 0.06);
}
.podium3d__tags strong {
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}
.podium3d__tags small {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.podium3d__place {
  color: var(--color-brand);
  font-size: 12px;
  font-weight: 700;
}
@media (max-width: 760px) {
  .podium3d__tags strong {
    font-size: 12px;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .podium3d__tags small {
    font-size: 10px;
  }
}
</style>
