<script setup>
import { rankBadge } from '~/utils/badges';
import { DIVISIONS } from '@ranked-world/ranks';

const props = defineProps({ player: { type: Object, required: true } });
const track = computed(() => props.player.ranked);
const progress = computed(() =>
  track.value.tier.isTop ? 100 : Math.max(0, Math.min(100, track.value.tier.percent || 0)),
);
const tierKey = computed(() => track.value.tier.tier.toLowerCase());
const promotion = ref(null);
let lastElo = track.value?.elo;
watch(
  () => track.value?.tier?.index,
  (next, previous) => {
    if (previous != null && next > previous)
      promotion.value = { tier: track.value.tier, gain: track.value.elo - lastElo };
    lastElo = track.value?.elo;
  },
);
</script>

<template>
  <section class="rank" :class="`t-${tierKey}`" aria-label="Rank progression">
    <ClientOnly>
      <RankUpMoment v-if="promotion" :tier="promotion.tier" :gain="promotion.gain" @close="promotion = null" />
    </ClientOnly>
    <div class="rank__fig">
      <img v-if="player.banned" src="/img/badges/rank_banned.png" alt="Rank banned" width="180" height="180" />
      <ClientOnly v-else>
        <GorillaFigure
          :pose="TIER_POSE[tierKey] || 'idle'"
          :tier="tierKey"
          :color="player.color"
          :cosmetics="player.cosmetics || []"
          :badge="rankBadge(DIVISIONS[track.tier.index])"
        />
        <template #fallback
          ><img :src="rankBadge(DIVISIONS[track.tier.index])" alt="" width="160" height="160"
        /></template>
      </ClientOnly>
    </div>
    <div class="rank__body">
      <h2 class="rank__name">{{ track.tier.name }}</h2>
      <p class="rank__mmr">
        <strong>{{ num(track.elo) }}</strong> MMR <span>/</span> {{ track.tier.category }} bracket
      </p>
      <div
        class="bar"
        :style="{ '--accent': 'var(--tier)' }"
        role="progressbar"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Progress to next division"
      >
        <span :style="{ width: `${progress}%` }" />
      </div>
      <p class="meta">
        {{ track.tier.isTop ? 'You are in the top division.' : `${track.tier.eloToNext} MMR to your next division` }}
      </p>
      <dl class="rank__facts">
        <div class="stat">
          <dt>{{ num(track.peakElo) }}</dt>
          <dd>Personal best</dd>
        </div>
        <div class="stat">
          <dt>{{ track.winRate || 0 }}%</dt>
          <dd>Win rate</dd>
        </div>
        <div class="stat">
          <dt>{{ num(track.rounds) }}</dt>
          <dd>Rounds played</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.rank {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 40px;
  align-items: center;
  padding: 12px 40px 12px 12px;
  border-radius: var(--r-xl);
  border: 1px solid var(--line);
  background: radial-gradient(120% 140% at 0% 50%, color-mix(in srgb, var(--tier) 12%, transparent), transparent 60%),
    var(--panel);
}
.rank__fig {
  height: 360px;
  display: grid;
  place-items: center;
}
.rank__fig img {
  image-rendering: pixelated;
}
.rank__name {
  color: var(--tier);
  font-size: clamp(48px, 6vw, 84px);
  line-height: 0.95;
}
.rank__mmr {
  margin: 14px 0 22px;
  color: var(--dim);
}
.rank__mmr strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 800;
}
.rank__mmr span {
  margin: 0 6px;
  opacity: 0.5;
}
.rank .bar {
  max-width: 520px;
  margin-bottom: 10px;
}
.rank__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 24px 48px;
  margin: 32px 0 0;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}
.rank__facts .stat dt {
  font-size: 30px;
}
@media (max-width: 860px) {
  .rank {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 12px 20px 24px;
  }
  .rank__fig {
    height: 300px;
  }
}
</style>
