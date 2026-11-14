<script setup>
import { DIVISIONS, ELO_PER_DIVISION } from '@ranked-world/ranks';
import { rankBadge } from '~/utils/badges';
import { sfx } from '~/lib/sound.js';

const props = defineProps({ tier: { type: Object, required: true }, gain: { type: Number, default: 0 } });
const emit = defineEmits(['close']);
const before = DIVISIONS[Math.max(0, props.tier.index - 1)];
const floor = props.tier.index * ELO_PER_DIVISION;
const end = props.tier.elo ?? floor;
const start = Math.min(floor - 1, end - Math.max(1, props.gain));
const canvas = ref(null);
const go = ref(null);
const title = ref(before.toUpperCase());
const out = ref(false);
const up = ref(false);
const done = ref(false);
const elo = ref(start);
const fill = ref(0);
const from = ref(before);
const to = ref(props.tier.name);
const pal = ref(before.split(' ')[0].toLowerCase());
let world;

const close = () => emit('close');
const onKey = (e) => {
  if (e.key === 'Escape') close();
};

onMounted(async () => {
  window.addEventListener('keydown', onKey);
  const w = await import('~/lib/world.js');
  if (!canvas.value) return;
  const { THREE, clamp, span, ease } = w;
  const oldKey = before.split(' ')[0].toLowerCase();
  const newKey = props.tier.tier.toLowerCase();
  world = w.stage(canvas.value, { fov: 28 });
  const { scene, camera, glow } = world;
  const FOOT = -0.535;
  const lowGlow = new THREE.Color(...w.TIERS[oldKey].glow);
  const highGlow = new THREE.Color(...w.TIERS[newKey].glow);
  const key = new THREE.SpotLight(0xfff0dc, 22, 0, 0.55, 1, 2);
  key.position.set(2.3, 3.4, 3.1);
  const rimL = new THREE.SpotLight(lowGlow, 90, 0, 0.6, 1, 2);
  rimL.position.set(-2.6, 1.9, -2.3);
  const rimR = new THREE.SpotLight(lowGlow, 70, 0, 0.6, 1, 2);
  rimR.position.set(2.7, 2.4, -2.0);
  for (const l of [key, rimL, rimR]) {
    l.target.position.set(0, 0.1, 0);
    scene.add(l, l.target);
  }
  const base = w.stand(w.TIERS[oldKey].glow);
  base.position.y = FOOT;
  scene.add(base);
  const sweep = { h: -10, uH: { value: -10 }, uGlow: { value: highGlow.clone() }, uOn: { value: 0 } };
  const above = new THREE.Plane(new THREE.Vector3(0, 1, 0), 10);
  const below = new THREE.Plane(new THREE.Vector3(0, -1, 0), -10);
  const skin = (tierKey, plane) => {
    const m = w.metal(tierKey);
    m.clippingPlanes = [plane];
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uH: sweep.uH, uGlow: sweep.uGlow, uOn: sweep.uOn });
      sh.vertexShader =
        'varying float vWY;\n' +
        sh.vertexShader.replace(
          '#include <project_vertex>',
          '#include <project_vertex>\nvWY = (modelMatrix * vec4(transformed, 1.0)).y;',
        );
      sh.fragmentShader =
        'uniform float uH; uniform vec3 uGlow; uniform float uOn; varying float vWY;\n' +
        sh.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n' +
            'totalEmissiveRadiance += uGlow * uOn * (smoothstep(0.06, 0.0, abs(vWY - uH)) * 2.2);',
        );
    };
    return m;
  };
  const geos = await w.model('figurine');
  const geo = geos.figurine;
  const fig = new THREE.Group();
  const meshes = [new THREE.Mesh(geo, skin(oldKey, above)), new THREE.Mesh(geo, skin(newKey, below))];
  fig.add(...meshes);
  scene.add(fig);
  const setPose = (p) => {
    const k = clamp(p) * 8;
    const i = Math.floor(k);
    const f = k - i;
    for (const m of meshes) {
      const wt = m.morphTargetInfluences;
      wt.fill(0);
      if (i >= 8) {
        wt[7] = 1;
        continue;
      }
      if (i >= 1) wt[i - 1] += 1 - f;
      wt[i] += f;
    }
  };
  const tierBadge = async (name) => {
    const b = await w.badge(rankBadge(name));
    b.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (const c of b.cells) {
      Object.assign(c, { pos: c.home.clone(), vel: new THREE.Vector3(), rot: new THREE.Euler(), scale: 1 });
      Object.assign(c, { spin: new THREE.Vector3(), from: new THREE.Vector3(), delay: 0, landed: false });
    }
    scene.add(b.g);
    return b;
  };
  const [oldB, newB] = await Promise.all([tierBadge(before), tierBadge(props.tier.name)]);
  oldB.g.position.set(0, 0.95, 0);
  oldB.g.scale.setScalar(0.62);
  newB.g.position.set(0, 0.8, 0.04);
  newB.g.scale.setScalar(1.15);
  newB.g.visible = false;
  for (const c of newB.cells) c.scale = 0;
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpS = new THREE.Vector3();
  const writeBadge = (b) => {
    b.cells.forEach((c, i) => {
      tmpS.setScalar(Math.max(c.scale, 0.0001));
      tmpM.compose(c.pos, tmpQ.setFromEuler(c.rot), tmpS);
      b.mesh.setMatrixAt(i, tmpM);
    });
    b.mesh.instanceMatrix.needsUpdate = true;
  };
  writeBadge(oldB);
  writeBadge(newB);
  const fired = new Set();
  const once = (name, t, at, fn) => {
    if (t < at || fired.has(name)) return;
    fired.add(name);
    fn();
  };
  const T_CHARGE = 1.95;
  const T_HIT = 2.85;
  const T_BUILD = 2.8;
  const T_TITLE = 4.15;
  const LOOK = new THREE.Vector3();
  const col = new THREE.Color();
  let shown = start;
  let shake = 0;
  let lastPop = 0;
  const t0 = performance.now() / 1000;
  sfx.whoosh();
  const hit = () => {
    sfx.hit();
    shake = 0.05;
    glow.strength = 0.9;
    for (const c of oldB.cells) {
      const dir = c.home.clone().normalize();
      if (!isFinite(dir.x)) dir.set(0, 1, 0);
      const vx = dir.x * (1.5 + Math.random() * 2.6);
      c.vel.set(vx, dir.y * (1.5 + Math.random() * 2.6) + 0.6, (Math.random() - 0.3) * 3.2);
      c.spin.set(Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 14 - 7);
    }
    newB.g.visible = true;
    for (const c of newB.cells) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.9 + Math.random() * 1.4;
      c.from.set(Math.cos(a) * r, Math.sin(a) * r * 0.8 - 0.1, 0.6 + Math.random() * 1.4);
      c.delay = c.home.length() * 1.5 + Math.random() * 0.25;
      c.spin.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
    }
    sweep.uOn.value = 1;
    up.value = true;
    pal.value = newKey;
    from.value = props.tier.name;
    to.value = DIVISIONS[props.tier.index + 1] || 'Top division';
    rimL.color.copy(highGlow);
    rimR.color.copy(highGlow);
  };
  world.loop((now, dt) => {
    const t = now - t0;
    const c = span(t, 0.5, 1.9);
    const count = Math.round(start + c * (floor - start));
    if (t < T_HIT && count !== shown) {
      shown = count;
      elo.value = count;
      sfx.tick(count - start);
    }
    if (t < T_HIT)
      fill.value = ((start + ease.out3(c) * (floor - start) - floor + ELO_PER_DIVISION) / ELO_PER_DIVISION) * 100;
    once('riser', t, T_CHARGE, () => sfx.riser(T_HIT - T_CHARGE));
    const ch = span(t, T_CHARGE, T_HIT);
    if (t < T_HIT) {
      oldB.g.rotation.y += dt * (0.6 + 22 * ch * ch);
      oldB.g.scale.setScalar(0.62 + 0.08 * ch);
      oldB.glow.value = 0.2 + 0.9 * ch * ch;
      shake = Math.max(shake, 0.004 * ch);
    }
    once('titleOut', t, T_HIT - 0.35, () => {
      out.value = true;
    });
    once('hit', t, T_HIT, hit);

    if (t >= T_HIT) {
      const k = t - T_HIT;
      const s = clamp(1 - k / 0.9);
      oldB.g.rotation.y += dt * 2 * s;
      for (const cell of oldB.cells) {
        cell.pos.addScaledVector(cell.vel, dt);
        cell.vel.multiplyScalar(Math.pow(0.12, dt));
        cell.rot.x += cell.spin.x * dt;
        cell.rot.y += cell.spin.y * dt;
        cell.rot.z += cell.spin.z * dt;
        cell.scale = s;
      }
      if (s <= 0) oldB.g.visible = false;
      writeBadge(oldB);
      const wv = ease.inOut(span(k, 0.05, 0.8));
      sweep.h = FOOT - 0.05 + wv * 1.75;
      sweep.uOn.value = 1 - span(k, 0.75, 1.35);
      const pe = ease.back(span(k, 0.08, 0.68));
      setPose(pe);
      fig.position.y = -0.47 * clamp(pe) + 0.28 * Math.sin(Math.PI * span(k, 0.06, 0.62));
      once('land', t, T_HIT + 0.62, () => sfx.thock(0.55, 0.16, 0.2));
      col.copy(lowGlow).lerp(highGlow, wv);
      base.userData.rim.color.copy(col).multiplyScalar(1.6 + 1.2 * (1 - span(k, 0, 1.2)));
      const c2 = span(t, T_HIT + 0.55, T_HIT + 1.15);
      const e2 = Math.round(floor + c2 * (end - floor));
      if (e2 !== shown && t > T_HIT + 0.5) {
        shown = e2;
        elo.value = e2;
        sfx.tick(e2 - floor + 2);
      }
      const into = Math.min(100, ((ease.out3(c2) * (end - floor)) / ELO_PER_DIVISION) * 100);
      fill.value = k < 0.45 ? 100 * (1 - ease.out3(k / 0.45)) : into;
    }

    if (t >= T_BUILD && newB.g.visible) {
      const k = t - T_BUILD;
      for (const cell of newB.cells) {
        const p = span(k - cell.delay * 0.55, 0, 0.55);
        cell.pos.lerpVectors(cell.from, cell.home, ease.back(p));
        cell.scale = clamp(p * 3);
        const r = 1 - ease.out3(p);
        cell.rot.set(cell.spin.x * r, cell.spin.y * r, cell.spin.z * r);
        if (p < 1 || cell.landed) continue;
        cell.landed = true;
        if (t - lastPop <= 0.028) continue;
        lastPop = t;
        sfx.pop();
      }
      newB.glow.value = 0.25 + 0.7 * (1 - span(k, 0.9, 1.8));
      newB.g.rotation.y = Math.sin(t * 0.9) * 0.18 * span(k, 1.0, 2.0);
      newB.g.position.y = 0.8 + Math.sin(t * 1.6) * 0.02 * span(k, 1.0, 2.0);
      writeBadge(newB);
    } else if (t < T_HIT) {
      oldB.g.position.y = 0.95 + Math.sin(now * 1.4) * 0.025;
    }

    once('chime', t, T_TITLE, () => {
      sfx.chime();
      title.value = props.tier.name.toUpperCase();
      out.value = false;
      glow.strength = 0.8;
    });
    once('done', t, T_TITLE + 0.7, () => {
      done.value = true;
      nextTick(() => go.value?.focus());
    });

    glow.strength += (0.35 - glow.strength) * (1 - Math.pow(0.01, dt));
    shake *= Math.pow(0.02, dt);
    above.constant = -sweep.h;
    below.constant = sweep.h;
    sweep.uH.value = sweep.h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(1.95 / (1.8 * 0.6 * tan), 1.7 / (2 * tan * camera.aspect * 0.8));
    LOOK.y = 0.24 - 0.2 * 2 * dist * tan;
    const push = t < T_HIT ? ch * 0.5 : 0;
    camera.position.set((Math.random() - 0.5) * shake, LOOK.y + 0.3 + (Math.random() - 0.5) * shake, dist - push);
    camera.lookAt(LOOK);
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  world?.dispose();
});
</script>

<template>
  <div class="rank-up" :class="`t-${pal}`" role="dialog" aria-modal="true" aria-labelledby="rank-up-title">
    <canvas ref="canvas" class="rank-up__canvas" aria-hidden="true" />
    <div class="rank-up__stack">
      <p class="rank-up__eyebrow" :class="{ on: up }">{{ up ? 'Ranked up' : 'Current rank' }}</p>
      <h2 id="rank-up-title" :key="title" class="rank-up__title" :class="{ out }">{{ title }}</h2>
      <div class="rank-up__bar">
        <div class="rank-up__row">
          <span>{{ from }}</span
          ><span
            ><b>{{ num(elo) }}</b> MMR</span
          ><span>{{ to }}</span>
        </div>
        <div class="rank-up__track"><span :style="{ width: `${fill}%` }" /></div>
      </div>
      <button ref="go" class="btn btn--brand btn--large rank-up__go" :class="{ on: done }" @click="close">
        Continue
      </button>
    </div>
  </div>
</template>

<style scoped>
.rank-up {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: radial-gradient(circle at 50% 40%, #16161b, #08080a 70%);
}
.rank-up__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.rank-up__stack {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 6vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.rank-up__eyebrow {
  color: var(--color-text-secondary);
  font-size: 14px;
  transition: color 0.4s;
}
.rank-up__eyebrow.on {
  color: var(--tier);
}
.rank-up__title {
  margin: 6px 0 14px;
  color: var(--tier);
  font-family: var(--font-display);
  font-size: clamp(52px, 8.4vw, 112px);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.03em;
  animation: rise 0.8s var(--ease-out-expo) both;
}
.rank-up__title.out {
  animation: sink 0.35s ease-in both;
}
@keyframes rise {
  from {
    transform: translateY(40%) scale(0.94);
    opacity: 0;
    filter: blur(8px);
  }
}
@keyframes sink {
  to {
    transform: translateY(-30%);
    opacity: 0;
    filter: blur(6px);
  }
}
.rank-up__bar {
  width: min(420px, 82vw);
}
.rank-up__row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 9px;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.rank-up__row b {
  color: var(--color-text-primary);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.rank-up__track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.rank-up__track span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--tier);
}
.rank-up__go {
  margin-top: 26px;
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
  transition:
    opacity 0.5s,
    transform 0.5s var(--ease-out-expo);
}
.rank-up__go.on {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
.rank-up__hint {
  position: absolute;
  top: 20px;
  right: 24px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>
