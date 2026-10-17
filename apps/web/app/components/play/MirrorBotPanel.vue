<script setup>
const props = defineProps({
  plan: { type: String, default: 'free' },
  mirror: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  failure: { type: String, default: '' },
});
const emit = defineEmits(['start', 'stop']);
const on = computed(() => Boolean(props.mirror?.enabled));
const allowed = computed(() => Boolean(props.mirror?.allowed));
const picked = computed(() => props.mirror?.picked || null);
const session = computed(() => props.mirror?.session || null);
const offsets = computed(() => props.mirror?.offsets || []);
const offset = ref('even');
const left = computed(() => Math.max(0, (props.mirror?.perDay || 0) - (props.mirror?.used || 0)));
const WHY = {
  movement: 'Picked from your recorded movement.',
  both: 'Picked from your recorded movement and your ranked results.',
  ranked: 'Picked from your ranked results. It will use your own recordings once there are enough of them.',
};
const why = computed(() => {
  if (!picked.value) return '';
  return WHY[picked.value.source] || 'Starting at Average until it has seen you play.';
});
</script>

<template>
  <section class="mirror" aria-labelledby="mirror-heading">
    <div class="section-head">
      <h2 id="mirror-heading">Your mirror</h2>
      <span class="meta">A bot that runs your routes at your level.</span>
    </div>
    <div v-if="!on" class="empty">
      <div class="mirror__chips">
        <span class="chip">Coming soon</span><span class="chip chip--brand">Pro feature</span>
      </div>
      <p>Mirror Bot is not available yet, including with Pro. You cannot train or launch a mirror session today.</p>
    </div>
    <div v-else-if="!allowed" class="empty">
      <span class="chip chip--brand">Pro feature</span>
      <p>{{ mirror?.copy?.body }}</p>
      <NuxtLink class="btn btn--brand" to="/subscribe">Explore Pro</NuxtLink>
    </div>
    <template v-else>
      <div v-if="failure" class="alert" role="alert">
        <p>{{ failure }}</p>
      </div>
      <div v-if="session" class="live panel" role="status">
        <span class="chip" :class="{ 'chip--live': session.phase !== 'starting' }"
          ><span class="dot" />{{ session.phase }}</span
        >
        <h3 class="live__code">{{ session.phase === 'starting' ? 'Opening your room...' : session.code }}</h3>
        <p class="meta">
          {{
            session.phase === 'starting'
              ? 'Keep this page open. Your code will appear when the room is ready.'
              : 'Join this code at the computer in Gorilla Tag.'
          }}
        </p>
        <div class="live__row">
          <span class="meta">{{ session.difficulty }}</span>
          <RoomJoinButton v-if="session.code && session.phase !== 'starting'" :code="session.code" />
        </div>
        <dl v-if="session.points" class="live__score">
          <div class="stat">
            <dt>{{ session.points[0] || 0 }}</dt>
            <dd>You</dd>
          </div>
          <div class="stat">
            <dt>{{ session.points[1] || 0 }}</dt>
            <dd>Mirror</dd>
          </div>
        </dl>
        <button class="btn" :disabled="busy" @click="emit('stop')">End session</button>
      </div>
      <template v-else>
        <div class="mirror__state">
          <div class="mirror__chips">
            <span class="chip chip--brand">{{ picked?.tier }}</span>
            <span v-if="picked?.held" class="chip">Holding</span>
          </div>
          <span class="meta">{{ left }} / {{ mirror?.perDay }} matches left today</span>
          <p>{{ why }}</p>
          <p v-if="!mirror?.routesReady" class="meta">
            Your route library is not built yet, so it runs the practice bot routes until it is.
          </p>
        </div>
        <div class="picks" role="group" aria-label="How hard">
          <button
            v-for="o in offsets"
            :key="o.key"
            class="pick"
            :class="{ on: o.key === offset }"
            :aria-pressed="o.key === offset"
            @click="offset = o.key"
          >
            <span class="pick__name">{{ o.label }}</span>
          </button>
        </div>
        <div class="go-row">
          <button
            class="btn btn--brand btn--large"
            :disabled="busy || !left || !mirror?.linked"
            @click="emit('start', offset)"
          >
            <AppIcon name="play" />{{ busy ? 'Starting your session...' : 'Start Mirror Bot' }}
          </button>
          <span class="meta">Resets at midnight UTC</span>
        </div>
        <p class="meta">{{ mirror?.note }}</p>
      </template>
    </template>
  </section>
</template>

<style scoped>
.mirror {
  display: grid;
  gap: 24px;
}
.mirror .section-head {
  margin: 0;
}
.mirror__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mirror__state {
  display: grid;
  gap: 10px;
  justify-items: start;
}
.mirror .pick {
  min-height: 0;
}
</style>
