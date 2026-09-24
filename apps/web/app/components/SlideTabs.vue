<script setup>
const props = defineProps({ modelValue: { type: String, required: true }, options: { type: Array, required: true } });
const emit = defineEmits(["update:modelValue"]);
const strip = ref(null);
const marker = reactive({ x: 0, w: 0, ready: false });
function measure() { const on = strip.value?.querySelector(".tab.is-selected"); if (!on) return; marker.x = on.offsetLeft; marker.w = on.offsetWidth; marker.ready = true; }
let ro;
onMounted(async () => { await nextTick(); measure(); document.fonts?.ready.then(measure); ro = new ResizeObserver(measure); ro.observe(strip.value); });
onBeforeUnmount(() => ro?.disconnect());
watch(() => props.modelValue, () => nextTick().then(measure));
</script>
<template>
<div ref="strip" class="slidetabs"><span class="slidetabs__marker" :data-ready="marker.ready ? '' : undefined" :style="{ translate: marker.x + 'px 0', width: marker.w + 'px' }" /><button v-for="o in options" :key="o.key" class="tab" type="button" :aria-pressed="modelValue === o.key" :class="{ 'is-selected': modelValue === o.key }" @click="emit('update:modelValue', o.key)" ><slot :option="o">{{ o.label }}</slot></button></div>
</template>
<style>
.slidetabs{position:relative;display:inline-flex;align-items:center;gap:2px;padding:3px;background:var(--surface-2);border:1px solid var(--color-divider);border-radius:var(--radius-lg);max-width:100%;overflow-x:auto;scrollbar-width:none}
.slidetabs::-webkit-scrollbar{display:none}
.slidetabs__marker{position:absolute;top:3px;left:0;height:var(--control-sm);border-radius:var(--radius-md);background:var(--color-brand-highlight);box-shadow:inset 0 0 0 1px var(--color-brand-strong);opacity:0;pointer-events:none;transition:translate var(--dur-slow) var(--ease-out-expo),
    width var(--dur-slow) var(--ease-out-expo),
    opacity var(--dur-base) var(--ease-out)}
.slidetabs__marker[data-ready]{opacity:1}
.slidetabs .tab{position:relative;height:var(--control-sm);flex:none;background:transparent;color:var(--color-text-secondary)}
.slidetabs .tab:hover{background:transparent;color:var(--color-text-primary)}
.slidetabs .tab.is-selected,
.slidetabs .tab.is-selected:hover{background:transparent;color:var(--color-brand);box-shadow:none}
</style>
