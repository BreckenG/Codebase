<script setup>
import { DIVISIONS, ELO_PER_DIVISION, CATEGORY_RANGES } from '@ranked-world/ranks';
import { sfx } from '~/lib/sound.js';

const NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Ruby', 'Sapphire'];
const BADGE = ['bronze_1', 'silver_1', 'gold_1', 'platinum_1', 'ruby_1', 'sapphire'];
const TINT = ['#d98a4a', '#cfd5df', '#ffc35a', '#c9f1f4', '#ff4057', '#6f9bff'];
const tiers = NAMES.map((name, i) => {
  const idx = DIVISIONS.map((d, j) => (d.startsWith(name) ? j : -1)).filter((j) => j >= 0);
  const lo = idx[0] * ELO_PER_DIVISION;
  const top = idx[idx.length - 1] === DIVISIONS.length - 1;
  const range = top ? `${num(lo)}+` : `${num(lo)}-${num((idx[idx.length - 1] + 1) * ELO_PER_DIVISION - 1)}`;
  const bracket = CATEGORY_RANGES.find((r) => idx[0] <= r.maxIndex).category;
  return {
    name,
    key: name.toLowerCase(),
    divs: idx.map((j) => DIVISIONS[j]),
    range,
    bracket,
    badge: BADGE[i],
    tint: TINT[i],
  };
});
const hall = ref(null);
const canvas = ref(null);
const shown = ref(0);
const tier = computed(() => tiers[shown.value]);
let world;

onMounted(async () => {
  const w = await import('~/lib/world.js');
  if (!canvas.value) return;
  const { THREE } = w;
  world = w.stage(canvas.value);
  const { scene, camera } = world;
  const key = new THREE.DirectionalLight(0xfff0dc, 1.1);
  const rim = new THREE.SpotLight(0xffffff, 70, 0, 0.32, 0.8, 2);
  scene.add(key, key.target, rim, rim.target);
  const geos = await w.model('gorillas');
  const spin = [];
  await Promise.all(
    tiers.map(async (t, i) => {
      const g = new THREE.Group();
      g.position.set(i * 4.5, i * 0.42, 0);
      const fig = w.sit(new THREE.Mesh(geos[TIER_POSE[t.key]], w.metal(t.key)));
      const turn = new THREE.Group().add(fig);
      const bb = fig.geometry.boundingBox;
      const y = bb.max.y - bb.min.y + 0.42;
      const b = await w.badge(`/img/badges/${t.badge}.png`, 0.5);
      b.g.position.y = y;
      g.add(w.stand(w.TIERS[t.key].glow, i * 0.42), turn, b.g);
      scene.add(g);
      spin.push({ turn, b, y, seed: i * 1.7 });
    }),
  );
  const pos = new THREE.Vector3();
  const keyOff = new THREE.Vector3(2.2, 3.2, 1.5);
  const rimOff = new THREE.Vector3(-2.4, 2.2, -2.6);
  const wide = new THREE.Vector3(0.3, 0.28, 6.6);
  const tall = new THREE.Vector3(0.15, 0.28, 9.6);
  const look = new THREE.Vector3();
  const want = new THREE.Vector3();
  const wantLook = new THREE.Vector3();
  let snapped = false;
  world.loop((now, dt) => {
    const box = hall.value.getBoundingClientRect();
    const f = w.clamp(-box.top / Math.max(1, box.height - innerHeight)) * 5;
    const i = Math.min(4, Math.floor(f));
    const e = i + w.ease.inOut(w.span(f - i, 0.3, 0.85));
    const at = Math.min(5, Math.round(f));
    if (at !== shown.value) {
      shown.value = at;
      sfx.note(at);
    }
    const narrow = camera.aspect < 0.9;
    wantLook.set(e * 4.5 - (narrow ? 0 : 1.3), e * 0.42 + (narrow ? 0.2 : 1.05), 0);
    want.copy(wantLook).add(narrow ? tall : wide);
    const k = snapped ? 1 - Math.pow(0.004, dt) : 1;
    snapped = true;
    pos.lerp(want, k);
    look.lerp(wantLook, k);
    camera.position.copy(pos);
    camera.lookAt(look);
    key.position.copy(pos).add(keyOff);
    key.target.position.copy(look);
    rim.position.copy(look).add(rimOff);
    rim.target.position.copy(look);
    rim.color.setRGB(...w.TIERS[tiers[at].key].glow);
    for (const s of spin) {
      s.turn.rotation.y = Math.sin(now * 0.4 + s.seed) * 0.45;
      s.b.g.rotation.y = Math.sin(now * 0.7 + s.seed) * 0.35;
      s.b.g.position.y = s.y + Math.sin(now * 1.3 + s.seed) * 0.03;
    }
  });
});

onBeforeUnmount(() => world?.dispose());
</script>

<template>
  <section ref="hall" class="hall" aria-label="The six tiers">
    <div class="hall__pin">
      <canvas ref="canvas" class="hall__canvas" aria-hidden="true" />
      <div class="wrap hall__cap">
        <p class="hall__count">Ranked {{ shown + 1 }}/6</p>
        <h2 :key="tier.name" class="hall__name" :style="{ color: tier.tint }">{{ tier.name }}</h2>
        <p class="hall__facts">
          <b>{{ tier.range }}</b> MMR <span>/</span> <b>{{ tier.bracket }}</b> lobbies
        </p>
        <ul class="hall__divs">
          <li v-for="d in tier.divs" :key="d">{{ d }}</li>
        </ul>
      </div>
      <ol class="hall__rail" aria-hidden="true">
        <li v-for="(t, i) in tiers" :key="t.name" :class="{ on: i === shown }">
          <img :src="`/img/badges/${t.badge}.png`" alt="" width="40" height="40" />
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.hall {
  position: relative;
  height: 600vh;
  margin-top: calc(-1 * var(--nav));
}
.hall__pin {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}
.hall__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.hall .hall__cap {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
  padding-top: calc(var(--nav) + 4vh);
  pointer-events: none;
}
.hall__count {
  color: var(--color-text-secondary);
  font-size: 14px;
}
.hall__name {
  margin: 10px 0 18px;
  font-family: var(--font-display);
  font-size: clamp(64px, 9vw, 132px);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.035em;
  animation: rise 0.7s var(--ease-out-expo) both;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(30%);
    filter: blur(8px);
  }
}
.hall__facts {
  color: var(--color-text-secondary);
}
.hall__facts b {
  color: var(--color-text-primary);
  font-weight: 600;
}
.hall__facts span {
  margin: 0 6px;
  opacity: 0.5;
}
.hall__divs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}
.hall__divs li {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text-primary);
}
.hall__rail {
  position: absolute;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  text-align: right;
}
.hall__rail li {
  display: grid;
  place-items: center;
}
.hall__rail img {
  image-rendering: pixelated;
  opacity: 0.28;
  filter: grayscale(1);
  transform: scale(0.8);
  transition:
    opacity 0.4s,
    filter 0.4s,
    transform 0.4s var(--ease);
}
.hall__rail li.on img {
  opacity: 1;
  filter: none;
  transform: scale(1.15);
}
@media (max-width: 860px) {
  .hall .hall__cap {
    justify-content: flex-end;
    padding-bottom: 10vh;
  }
  .hall__name {
    font-size: 64px;
  }
  .hall__rail {
    display: none;
  }
}
</style>
