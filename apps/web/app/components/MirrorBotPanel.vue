<script setup>
const props = defineProps({ plan: { type: String, default: 'free' }, mirror: { type: Object, default: null }, busy: { type: Boolean, default: false }, failure: { type: String, default: '' } });
const emit = defineEmits(['start', 'stop']);
const on = computed(() => Boolean(props.mirror?.enabled));
const allowed = computed(() => Boolean(props.mirror?.allowed));
const picked = computed(() => props.mirror?.picked || null);
const session = computed(() => props.mirror?.session || null);
const offsets = computed(() => props.mirror?.offsets || []);
const offset = ref('even');
const left = computed(() => Math.max(0, (props.mirror?.perDay || 0) - (props.mirror?.used || 0)));
const why = computed(() => {
  const p = picked.value;
  if (!p) return '';
  if (p.source === 'movement') return 'Picked from your recorded movement.';
  if (p.source === 'both') return 'Picked from your recorded movement and your ranked results.';
  if (p.source === 'ranked') return 'Picked from your ranked results. It will use your own recordings once there are enough of them.';
  return 'Starting at Average until it has seen you play.';
});
</script>
<template>
<section class="world-mirror" aria-labelledby="mirror-heading"><span class="world-mirror__mark"><AppIcon name="layers" /></span><h2 id="mirror-heading">Mirror Bot</h2><p>A bot that runs your routes at your level.</p><div v-if="!on" class="world-mirror__state"><span class="chip">Coming soon</span><span class="chip">Pro feature</span><p class="meta">Mirror Bot is not available yet, including with Pro. You cannot train or launch a mirror session today.</p><p v-if="plan === 'pro'" class="meta">Your membership includes access when Mirror Bot becomes available.</p></div><div v-else-if="!allowed" class="world-mirror__state"><span class="chip">Pro feature</span><p class="meta">{{ mirror?.copy?.body }}</p><NuxtLink class="btn btn--brand" to="/subscribe">Explore Pro<AppIcon name="arrowRight" /></NuxtLink></div><template v-else><div v-if="failure" class="world-error" role="alert"><p>{{ failure }}</p></div><div v-if="session" class="world-practice-session" role="status"><h3>{{ session.phase === 'starting' ? 'Opening your room...' : session.code }}</h3><p class="meta">{{ session.phase === 'starting' ? 'Keep this page open. Your code will appear when the room is ready.' : 'Join this code at the computer in Gorilla Tag.' }}</p><div class="world-practice-session__status"><span class="chip">{{ session.phase }}</span><span class="meta">{{ session.difficulty }}</span><RoomJoinButton v-if="session.code && session.phase !== 'starting'" :code="session.code" /></div><div v-if="session.points" class="world-score"><span>You<strong>{{ session.points[0] || 0 }}</strong></span><span>Mirror<strong>{{ session.points[1] || 0 }}</strong></span></div><button class="btn" :disabled="busy" @click="emit('stop')">End session</button></div><template v-else><div class="world-mirror__state"><span class="chip">{{ picked?.tier }}</span><span v-if="picked?.held" class="chip">Holding</span><span class="meta">{{ left }} / {{ mirror?.perDay }} matches left today</span><p class="meta">{{ why }}</p><p v-if="!mirror?.routesReady" class="meta">Your route library is not built yet, so it runs the practice bot routes until it is.</p></div><div class="codes__difficulties" role="group" aria-label="How hard"><button v-for="o in offsets" :key="o.key" class="botrow codes__diff" :class="{ 'is-selected': o.key === offset }" :aria-pressed="o.key === offset" @click="offset = o.key"><span class="codes__choice" aria-hidden="true" /><span class="botrow__body"><span class="title">{{ o.label }}</span></span></button></div><div class="world-practice-start"><button class="btn btn--brand" :disabled="busy || !left || !mirror?.linked" @click="emit('start', offset)"><AppIcon name="play" />{{ busy ? 'Starting your session...' : 'Start Mirror Bot' }}</button><span class="meta">Resets at midnight UTC</span></div><p class="meta">{{ mirror?.note }}</p></template></template></section>
</template>
