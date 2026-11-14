<script setup>
const props = defineProps({
  pose: { type: String, default: 'idle' },
  color: { type: Array, default: null },
  tier: { type: String, default: 'bronze' },
  cosmetics: { type: Array, default: () => [] },
});
const src = ref('');

onMounted(async () => {
  const w = await import('~/lib/world.js');
  const t = w.TIERS[props.tier] || w.TIERS.bronze;
  src.value = await w.portrait(props.pose, props.color || t.rgb, t.glow, props.cosmetics);
});
</script>

<template>
  <img v-if="src" class="portrait" :src="src" alt="" width="320" height="400" />
  <span v-else class="portrait portrait--wait" />
</template>

<style scoped>
.portrait {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 320 / 400;
  animation: in 0.5s var(--ease) both;
}
.portrait--wait {
  animation: none;
}
@keyframes in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
</style>
