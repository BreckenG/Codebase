<script setup>
const props = defineProps({ tier: { type: Object, required: true }, gain: { type: Number, default: 0 } });
const emit = defineEmits(['close']);
const colors = ['#f0a15a', '#ffd48a', '#e87d1a', '#fff3dc', '#4ade80', '#7cc4ff'];
const bits = Array.from({ length: 28 }, (_, i) => ({ '--x': ((i * 37) % 100) + '%', '--d': (i % 7) * 0.09 + 's', '--r': ((i * 53) % 360) + 'deg', '--c': colors[i % colors.length], '--s': 0.7 + ((i * 13) % 5) / 10 }));
const button = ref(null);
function key(e) { if (e.key === 'Escape') emit('close'); }
onMounted(() => { button.value?.focus(); window.addEventListener('keydown', key); });
onBeforeUnmount(() => window.removeEventListener('keydown', key));
</script>
<template>
<div class="rankup" role="dialog" aria-modal="true" aria-labelledby="rankup-title" @click.self="emit('close')">
  <div class="rankup__card">
    <div class="rankup__confetti" aria-hidden="true"><i v-for="(b, i) in bits" :key="i" :style="b" /></div>
    <div class="rankup__stage"><span class="rankup__rays" aria-hidden="true" /><RankBadge class="rankup__badge" :tier="tier" :size="150" :show-percent="false" /></div>
    <p class="rankup__kicker">Ranked up</p>
    <h2 id="rankup-title">{{ tier.name }}</h2>
    <p v-if="gain > 0" class="rankup__gain">+<CountUp :value="gain" :duration="1400" /> Elo since last time</p>
    <button ref="button" class="btn btn--brand rankup__go" @click="emit('close')">Continue</button>
  </div>
</div>
</template>
