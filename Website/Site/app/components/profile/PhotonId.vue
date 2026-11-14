<script setup>
const props = defineProps({ id: { type: String, required: true } });
const shown = ref(false);
const copied = ref(false);
const masked = computed(() => { const s = String(props.id || ""); if (s.length <= 4) return s; return "*".repeat(Math.min(20, s.length - 4)) + s.slice(-4); });
async function copy() { if (!shown.value) return; try { await navigator.clipboard.writeText(props.id); copied.value = true; setTimeout(() => copied.value = false, 1400); } catch { copied.value = false; } }
</script>
<template>
<span class="pid"><button class="pid__value mono" :class="{ 'pid__value--live': shown }" :disabled="!shown" :title="shown ? 'Click to copy' : 'Hidden'" @click="copy" >
      {{ copied ? "Copied!" : shown ? id : masked }}
    </button><button class="icon-btn pid__eye" :aria-pressed="String(shown)" :aria-label="shown ? 'Hide Photon id' : 'Show Photon id'" @click="shown = !shown" ><AppIcon :name="shown ? 'eyeOff' : 'eye'" /></button></span>
</template>
<style>
.pid{display:inline-flex;align-items:center;gap:var(--gap-2)}
.pid__value{border:0;background:none;padding:0 var(--gap-4);color:var(--color-text-secondary);font-size:var(--text-12);letter-spacing:0.04em;cursor:default;max-width:30ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color var(--dur-base) var(--ease-out)}
.pid__value--live{color:var(--color-text-primary);cursor:pointer}
.pid__value--live:hover{color:var(--color-brand)}
.pid__eye{width:var(--control-sm);height:var(--control-sm)}
.pid__eye svg{width:15px;height:15px}
</style>
