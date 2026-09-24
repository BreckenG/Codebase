<script setup>
const LAYERS = [{ count: 160, tile: 900, size: 1.6, alpha: 0.5, seed: 3, cls: "space__stars" }, { count: 90, tile: 1400, size: 2.2, alpha: 0.4, seed: 11, cls: "space__stars2" }, { count: 40, tile: 2000, size: 3, alpha: 0.3, seed: 29, cls: "space__stars3" }];
const hex = a => Math.round(a * 255).toString(16).padStart(2, "0");
function field({ count, tile, size, alpha, seed }) { let s = seed; const rand = () => (s = s * 1103515245 + 12345 & 0x7fffffff) / 0x7fffffff; const dots = []; for (let i = 0; i < count; i++) { const x = Math.round(rand() * tile); const y = Math.round(rand() * tile); const a = hex(alpha * (0.35 + rand() * 0.65)); const r = (size * (0.6 + rand() * 0.8)).toFixed(1); dots.push("radial-gradient(" + r + "px at " + x + "px " + y + "px,#ffecd6" + a + ",#ffecd600)"); } return { backgroundImage: dots.join(","), backgroundSize: tile + "px " + tile + "px" }; }
const layers = LAYERS.map(l => ({ cls: l.cls, style: field(l) }));
</script>
<template>
<div class="space" aria-hidden="true"><div class="space__neb" /><div v-for="l in layers" :key="l.cls" :class="l.cls" :style="l.style" /><div class="space__fade" /></div>
</template>
