<script setup>
import { DIVISIONS } from '@ranked-world/ranks';

const props = defineProps({ player: { type: Object, default: null } });
const { me } = useMe();
const { signIn, loginPending, available, status, busy, pendingJoin, requestLaunch } = useDesktop();
const linked = computed(() => Boolean(props.player?.linked));
const ranked = computed(() => props.player?.ranked);
const tier = computed(() => ranked.value?.tier);
const tierKey = computed(() => tier.value?.tier?.toLowerCase() || 'bronze');
const next = computed(() => (tier.value && !tier.value.isTop ? DIVISIONS[tier.value.index + 1] : null));
const name = computed(() => props.player?.name || me.value.user?.username || 'Ranked World');
const running = computed(() => Boolean(status.value?.gameRunning));
const canLaunch = computed(
  () => available && !busy.value && status.value?.gameInstalled && !running.value && !pendingJoin.value,
);
const progress = computed(() => (tier.value?.isTop ? 100 : tier.value?.percent || 0));
</script>

<template>
  <section class="lh panel" :class="`t-${tierKey}`">
    <div class="lh__body">
      <template v-if="linked">
        <h1 class="lh__name reveal-up">{{ name }}</h1>
        <NuxtLink v-if="tier" to="/me" class="lh__rank reveal-up" style="--i: 1">
          <img v-if="player?.banned" src="/img/badges/rank_banned.png" alt="Rank banned" width="56" height="56" />
          <RankBadge v-else :tier="tier" :size="56" :show-percent="false" />
          <span>
            <strong>{{ tier.name }}</strong>
            <small>
              <CountUp :value="ranked.elo || 0" /> MMR<template v-if="player.position">
                / #{{ player.position }}</template
              >
            </small>
          </span>
        </NuxtLink>
        <div v-if="tier" class="lh__next reveal-up" style="--i: 2">
          <div class="bar" style="--accent: var(--tier)"><span :style="{ width: `${progress}%` }" /></div>
          <small class="meta">{{ next ? `${tier.eloToNext} to ${next}` : 'Top division' }}</small>
        </div>
        <div class="go-row reveal-up" style="--i: 3">
          <button class="btn btn--brand btn--large" :disabled="!canLaunch" @click="requestLaunch()">
            <AppIcon name="play" />{{ running ? 'In game' : 'Play' }}
          </button>
          <NuxtLink to="/play" class="btn btn--large"><AppIcon name="hash" />Codes</NuxtLink>
        </div>
      </template>
      <template v-else>
        <h1 class="lh__name reveal-up">{{ me.user ? name : 'Ranked World' }}</h1>
        <p class="lh__line reveal-up" style="--i: 1">
          {{ me.user ? 'Connect Gorilla Tag to get a rank.' : 'Sign in to see your rank and join codes.' }}
        </p>
        <div class="go-row reveal-up" style="--i: 2">
          <NuxtLink v-if="me.user" to="/play" class="btn btn--brand btn--large">
            <AppIcon name="link" />Connect Gorilla Tag
          </NuxtLink>
          <button v-else class="btn btn--brand btn--large" :disabled="loginPending" @click="signIn">
            <AppIcon name="discord" />Sign in with Discord
          </button>
        </div>
      </template>
    </div>
    <ClientOnly>
      <GorillaFigure
        class="lh__fig"
        :pose="linked ? TIER_POSE[tierKey] || 'wave' : 'wave'"
        :tier="tierKey"
        :color="player?.color || (linked ? null : [0.93, 0.45, 0.1])"
        :cosmetics="player?.cosmetics || []"
      />
    </ClientOnly>
  </section>
</template>

<style scoped>
.lh {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 380px);
  align-items: center;
  gap: 24px;
  min-height: 340px;
  padding: 8px 8px 8px 40px;
  overflow: hidden;
  border-radius: var(--r-xl);
  background: radial-gradient(70% 120% at 85% 60%, color-mix(in srgb, var(--tier) 18%, transparent), transparent 70%),
    var(--panel);
}
.lh__body {
  display: grid;
  justify-items: start;
  gap: 18px;
  min-width: 0;
}
.lh__name {
  max-width: 100%;
  overflow: hidden;
  font-size: clamp(44px, 5.4vw, 76px);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lh__rank {
  display: flex;
  align-items: center;
  gap: 14px;
}
.lh__rank > span {
  display: grid;
}
.lh__rank strong {
  color: var(--tier);
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 800;
  line-height: 1.1;
}
.lh__rank small {
  display: flex;
  gap: 4px;
  color: var(--dim);
  font-size: 14px;
}
.lh__next {
  display: grid;
  gap: 8px;
  width: min(420px, 100%);
}
.lh__line {
  color: var(--text);
  font-size: 18px;
}
.lh__fig {
  width: 100%;
  height: 340px;
}
@media (max-width: 900px) {
  .lh {
    grid-template-columns: 1fr;
    padding: 24px;
  }
  .lh__fig {
    order: -1;
    height: 260px;
  }
}
</style>
