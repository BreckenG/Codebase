<script setup>
const route = useRoute();
const active = computed(() => DISCOVER.find(d => route.path.startsWith(d.href))?.key || "");
const strip = ref(null);
const marker = reactive({ x: 0, w: 0, ready: false });
function measure() { const el = strip.value; if (!el) return; const on = el.querySelector(".tab.is-selected"); if (!on) return; marker.x = on.offsetLeft; marker.w = on.offsetWidth; marker.ready = true; }
let ro;
onMounted(async () => { await nextTick(); measure(); document.fonts?.ready.then(measure); ro = new ResizeObserver(measure); ro.observe(strip.value); });
onBeforeUnmount(() => ro?.disconnect());
watch(active, () => nextTick().then(measure));
</script>
<template>
<div class="subtabs"><div ref="strip" class="subtabs__in"><span class="subtabs__marker" :data-ready="marker.ready ? '' : undefined" :style="{ translate: marker.x + 'px 0', width: marker.w + 'px' }" /><NuxtLink v-for="d in DISCOVER" :key="d.key" class="tab" :class="{ 'is-selected': d.key === active }" :to="d.href" >
        {{ d.label }}
      </NuxtLink></div></div>
</template>
