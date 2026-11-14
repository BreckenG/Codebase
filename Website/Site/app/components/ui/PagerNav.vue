<script setup>
const props = defineProps({ page: { type: Number, required: true }, pages: { type: Number, required: true } });
const emit = defineEmits(["go"]);
const list = computed(() => { const n = props.pages; const out = []; if (n <= 7) { for (let i = 1; i <= n; i++) out.push(i); return out; } const lo = Math.max(2, props.page - 1); const hi = Math.min(n - 1, props.page + 1); out.push(1); if (lo > 2) out.push(0); for (let i = lo; i <= hi; i++) out.push(i); if (hi < n - 1) out.push(0); out.push(n); return out; });
</script>
<template>
<nav class="pagenav" aria-label="Pagination"><button class="pagenav__arrow" :disabled="page <= 1" aria-label="Previous page" @click="emit('go', page - 1)" ><AppIcon name="arrowLeft" /></button><template v-for="(n, i) in list" :key="i"><span v-if="!n" class="pagenav__gap">...</span><button v-else class="pagenav__num" :class="{ 'is-on': n === page }" :aria-label="`Page ${n}`" :aria-current="n === page ? 'page' : undefined" @click="emit('go', n)" >
        {{ n }}
      </button></template><button class="pagenav__arrow" :disabled="page >= pages" aria-label="Next page" @click="emit('go', page + 1)" ><AppIcon name="arrowRight" /></button></nav>
</template>
<style>
.pagenav{display:flex;align-items:center;gap:var(--gap-2)}
.pagenav__num,
.pagenav__arrow{display:inline-flex;align-items:center;justify-content:center;min-width:var(--control-md);height:var(--control-md);padding:0 var(--gap-6);border:none;border-radius:var(--radius-max);background:transparent;color:var(--color-text-secondary);font:var(--weight-bold) var(--text-14) / 1 var(--font-sans);font-variant-numeric:tabular-nums;cursor:pointer;transition:background-color var(--dur-base) var(--ease-standard),
    color var(--dur-base) var(--ease-standard)}
.pagenav__arrow{width:var(--control-md);padding:0}
.pagenav__arrow svg{width:16px;height:16px}
.pagenav__num:hover:not(.is-on),
.pagenav__arrow:hover:not(:disabled){background:var(--surface-3);color:var(--color-text-primary)}
.pagenav__num.is-on{background:var(--color-brand-highlight);color:var(--color-brand)}
.pagenav__arrow:disabled{opacity:0.35;cursor:not-allowed}
.pagenav__gap{color:var(--color-text-inactive);padding:0 var(--gap-2);font-size:var(--text-14)}
</style>
