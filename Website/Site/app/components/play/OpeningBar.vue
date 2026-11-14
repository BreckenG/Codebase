<script setup>
const props = defineProps({ since: { type: String, default: null } });
const now = ref(Date.now());
let timer = null;
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 500);
});
onBeforeUnmount(() => clearInterval(timer));
const secs = computed(() => {
  const t = props.since ? Date.parse(props.since) : NaN;
  return Number.isFinite(t) ? Math.max(0, (now.value - t) / 1000) : 0;
});
const pct = computed(() => {
  const s = secs.value;
  return s < 75 ? 4 + 86 * (s / 75) ** 1.3 : 97 - 7 * Math.exp(-(s - 75) / 60);
});
const step = computed(() =>
  secs.value < 10 ? 'Starting the game' : secs.value < 35 ? 'Signing the bot in' : 'Making your room',
);
</script>

<template>
  <div class="open">
    <div
      class="bar"
      role="progressbar"
      aria-label="Opening your room"
      :aria-valuenow="Math.round(pct)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span :style="{ width: `${pct}%` }" />
    </div>
    <span class="meta">{{ step }}... {{ Math.floor(secs) }}s</span>
  </div>
</template>

<style scoped>
.open {
  display: grid;
  gap: 8px;
  justify-self: stretch;
  width: 100%;
}
.open .bar {
  height: 8px;
  border-radius: 4px;
}
.open .bar > span {
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(255, 255, 255, 0.22) 0 8px,
    transparent 8px 16px
  );
  background-size: 22.6px 100%;
  transition: width 0.5s linear;
  animation: ribs 1.1s cubic-bezier(0.2, 0.7, 0.3, 1) infinite;
}
@keyframes ribs {
  from {
    background-position: 0 0;
  }
  to {
    background-position: -22.6px 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .open .bar > span {
    animation: none;
  }
}
</style>
