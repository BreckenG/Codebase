<script setup>
const props = defineProps({ value: { type: Number, default: 0 }, format: { type: String, default: "num" }, duration: { type: Number, default: 950 }, suffix: { type: String, default: "" } });
const shown = ref(props.value);
const el = ref(null);
let raf = 0;
let io = null;
function fmt(n) { const v = Math.round(n); if (props.format === "short") return short(v); if (props.format === "pct") return v + "%"; if (props.format === "raw") return String(v); return num(v); }
const live = computed(() => fmt(shown.value) + props.suffix);
const settled = computed(() => fmt(props.value) + props.suffix);
function run() { cancelAnimationFrame(raf); const target = props.value; const t0 = performance.now(); const step = now => { const t = Math.min(1, (now - t0) / props.duration); shown.value = target * (1 - Math.pow(1 - t, 3)); if (t < 1) raf = requestAnimationFrame(step);else shown.value = target; }; raf = requestAnimationFrame(step); }
watch(() => props.value, v => { if (io) return; shown.value = v; });
onMounted(() => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; if (!("IntersectionObserver" in window)) return; shown.value = 0; io = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) return; io.disconnect(); io = null; run(); }, { threshold: 0.2 }); io.observe(el.value); });
onBeforeUnmount(() => { cancelAnimationFrame(raf); io?.disconnect(); });
</script>
<template>
<span ref="el" class="countup num"><span class="countup__ghost" aria-hidden="true">{{ settled }}</span><span class="countup__live">{{ live }}</span></span>
</template>
