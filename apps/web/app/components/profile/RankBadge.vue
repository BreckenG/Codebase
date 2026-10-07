<script setup>
import { rankBadge } from "~/utils/badges";
import { DIVISIONS } from "@ranked-world/ranks";
const props = defineProps({ tier: { type: Object, required: true }, size: { type: Number, default: 168 }, showPercent: { type: Boolean, default: true } });
const src = computed(() => rankBadge(DIVISIONS[props.tier.index] || "Bronze 1"));
const R = 46;
const C = 2 * Math.PI * R;
const pct = computed(() => Math.max(0, Math.min(100, props.tier.percent || 0)));
const offset = computed(() => C * (1 - pct.value / 100));
</script>
<template>
<div class="rankbadge" :style="{ '--rb-size': size + 'px' }"><div class="rankbadge__ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="rankbadge__track" cx="50" cy="50" :r="R" /><circle class="rankbadge__fill" cx="50" cy="50" :r="R" :stroke-dasharray="C" :style="{ '--rb-c': C, '--rb-off': offset }" /></svg><img class="rankbadge__art" :src="src" :alt="tier.name" /></div><span v-if="showPercent" class="rankbadge__pct num">
      {{ tier.isTop ? "top division" : pct + "% through " + tier.name }}
    </span></div>
</template>
<style>
.rankbadge{display:flex;flex-direction:column;align-items:center;gap:var(--gap-8)}
.rankbadge__ring{position:relative;width:var(--rb-size);height:var(--rb-size);display:grid;place-items:center}
.rankbadge__ring svg{position:absolute;inset:0;width:100%;height:100%;rotate:-90deg}
.rankbadge__track{fill:none;stroke:var(--surface-4);stroke-width:5}
.rankbadge__fill{fill:none;stroke:var(--tier, var(--color-brand));stroke-width:5;stroke-linecap:round;stroke-dashoffset:var(--rb-off);filter:drop-shadow(0 0 5px color-mix(in srgb, var(--tier, var(--color-brand)) 45%, transparent));animation:ring-draw 1150ms var(--ease-out-expo) 180ms both}
@keyframes ring-draw{from{stroke-dashoffset:var(--rb-c)}to{stroke-dashoffset:var(--rb-off)}}
.rankbadge__art{position:relative;width:80%;height:80%;object-fit:contain;image-rendering:pixelated;transition:transform 520ms var(--ease-spring), filter 380ms var(--ease-out)}
.rankbadge:hover .rankbadge__art{transform:translateY(-4px) scale(1.06);filter:drop-shadow(0 10px 16px rgba(0, 0, 0, 0.45))}
.rankbadge__pct{font-size:var(--text-12);text-transform:uppercase;letter-spacing:0.04em;color:var(--color-text-secondary)}
@media (prefers-reduced-motion: reduce){.rankbadge__fill{animation:none}.rankbadge:hover .rankbadge__art{transform:none}}
</style>
