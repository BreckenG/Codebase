<script setup>
const props = defineProps({ player: { type: Object, required: true } });
const track = computed(() => props.player.ranked);
const progress = computed(() => Math.max(0, Math.min(100, track.value?.tier?.percent || 0)));
const promotion = ref('');
watch(() => track.value?.tier?.index, (next, previous) => { if (previous != null && next > previous) promotion.value = track.value.tier.name; });
</script>
<template>
<div><Transition name="world-promotion"><div v-if="promotion" class="world-promotion" role="status"><AppIcon name="trophy" /><div><strong>You reached {{ promotion }}.</strong></div><button class="icon-btn" aria-label="Dismiss promotion" @click="promotion = ''"><AppIcon name="x" /></button></div></Transition><section class="world-progress" :class="tierClass(track.tier.name)" aria-label="Your rank progression"><div class="world-progress__emblem"><RankBadge :tier="track.tier" :size="156" /></div><div class="world-progress__body"><p class="world-eyebrow">Your rank</p><h2>{{ track.tier.name }}</h2><div class="world-progress__rating"><span>{{ num(track.elo) }}</span><span>Elo <span class="world-progress__divider">/</span> {{ track.tier.category }} bracket</span></div><div class="world-progress__track" role="progressbar" :aria-valuenow="track.tier.isTop ? 100 : progress" aria-valuemin="0" aria-valuemax="100" aria-label="Progress to next division"><span :style="{ width: (track.tier.isTop ? 100 : progress) + '%' }" /></div><p class="meta">{{ track.tier.isTop ? 'Sapphire. You have reached the top division.' : `${track.tier.eloToNext} Elo to your next division` }}</p></div><div class="world-progress__facts"><span><strong>{{ num(track.peakElo) }}</strong>Personal best</span><span><strong>{{ track.winRate || 0 }}%</strong>Win rate</span><span><strong>{{ num(track.rounds) }}</strong>Rounds played</span></div></section></div>
</template>
