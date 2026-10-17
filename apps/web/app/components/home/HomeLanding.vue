<script setup>
const {
  data: ladder,
  error: ladderError,
  refresh: refreshLadder,
} = await useApiFetch('/api/leaderboard', {
  key: 'home-ladder',
  query: { track: 'ranked', per: 5 },
  default: () => null,
});
const leaders = computed(() => (ladder.value?.rows || []).slice(0, 5));
const TIERS = [
  { name: 'Bronze', badge: 'bronze_1' },
  { name: 'Silver', badge: 'silver_1' },
  { name: 'Gold', badge: 'gold_1' },
  { name: 'Platinum', badge: 'platinum_1' },
  { name: 'Ruby', badge: 'ruby_1' },
  { name: 'Sapphire', badge: 'sapphire' },
];
const FEATURES = [
  {
    title: 'Scrims',
    to: '/play?mode=scrims',
    body: 'Make a party or queue solo for a ranked scrim where you can get ranked as well.',
  },
  {
    title: 'Replays',
    to: '/history',
    body: 'All matches are recorded, letting you play back and watch the match in 3D.',
  },
  {
    title: 'Launcher',
    to: '/launcher',
    body: 'Use the launcher to launch straight into a ranked match with one click.',
  },
];
</script>

<template>
  <main id="main" class="land">
    <section class="land__hero wrap">
      <div class="land__copy">
        <h1 class="reveal-up land__title">Ranked World</h1>
        <div class="land__cta reveal-up" style="--i: 1">
          <NuxtLink class="btn btn--brand btn--large" to="/play">Start Ranking</NuxtLink>
          <NuxtLink class="btn btn--large" to="/ranked">How Ranked works</NuxtLink>
        </div>
      </div>
      <ClientOnly>
        <GorillaFigure class="land__fig" pose="wave" :color="[0.93, 0.45, 0.1]" />
        <template #fallback><div class="land__fig" /></template>
      </ClientOnly>
    </section>

    <section class="section">
      <div class="wrap section-head">
        <h2>Top players</h2>
        <NuxtLink to="/leaderboard">See all players -&gt;</NuxtLink>
      </div>
      <div v-if="ladderError" class="wrap alert" role="alert">
        <p>We could not load the leaderboard.</p>
        <button class="btn btn--small" @click="refreshLadder">Try again</button>
      </div>
      <ClientOnly v-else-if="leaders.length">
        <LadderPodium :rows="leaders" />
        <template #fallback><div class="land__podium-wait" /></template>
      </ClientOnly>
    </section>

    <section class="section wrap land__how">
      <h2 v-reveal>How to join</h2>
      <div class="land__steps">
        <article v-reveal class="panel">
          <h3>Connect</h3>
          <p>Connect your Discord account to your Gorilla Tag account.</p>
        </article>
        <article v-reveal="1" class="panel">
          <h3>Get your codes</h3>
          <p>Ranked codes are split into categories based on your skill level.</p>
        </article>
        <article v-reveal="2" class="panel">
          <h3>Play</h3>
          <p>Join the Ranked code and start playing to rank up.</p>
        </article>
      </div>
    </section>

    <section class="section wrap">
      <div class="section-head">
        <h2 v-reveal>Six different ranks</h2>
        <NuxtLink to="/ranked">See how ranked works -&gt;</NuxtLink>
      </div>
      <NuxtLink to="/ranked" class="land__tiers">
        <div v-for="(t, i) in TIERS" :key="t.name" v-reveal="i" :class="`t-${t.name.toLowerCase()}`">
          <img :src="`/img/badges/${t.badge}.png`" alt="" width="88" height="88" />
          <span>{{ t.name }}</span>
        </div>
      </NuxtLink>
    </section>

    <section class="section wrap">
      <h2 v-reveal class="land__more">What else is here</h2>
      <div class="land__features">
        <NuxtLink v-for="(f, i) in FEATURES" :key="f.title" v-reveal="i % 2" :to="f.to" class="panel land__feature">
          <h3>{{ f.title }} <AppIcon name="arrowRight" /></h3>
          <p>{{ f.body }}</p>
        </NuxtLink>
      </div>
    </section>

    <section class="section wrap land__end">
      <div>
        <h2 v-reveal>Claim your<br />spot.</h2>
        <div v-reveal="1" class="land__cta">
          <NuxtLink class="btn btn--brand btn--large" to="/play">Start Ranking</NuxtLink>
          <NuxtLink class="btn btn--large" to="/launcher">Download launcher</NuxtLink>
        </div>
      </div>
      <ClientOnly><EmptyStand class="land__stand" /></ClientOnly>
    </section>
  </main>
</template>

<style scoped>
.land__hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 540px);
  gap: 24px;
  align-items: center;
  min-height: 100vh;
  padding-top: var(--nav);
}
.land__title {
  white-space: nowrap;
  font-size: clamp(44px, 7.4vw, 112px);
}
.land__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 34px;
}
.land__fig {
  width: 100%;
  height: min(680px, 76vh);
}
.land__podium-wait {
  height: clamp(420px, 56vw, 620px);
}
.land__steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 32px;
}
.land__steps p {
  margin-top: 12px;
}
.land__tiers {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  padding: 28px;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--panel);
}
.land__tiers div {
  display: grid;
  justify-items: center;
  gap: 10px;
}
.land__tiers img {
  image-rendering: pixelated;
  transition: transform 0.4s var(--ease);
}
.land__tiers div:hover img {
  transform: translateY(-6px) scale(1.06);
}
.land__tiers span {
  color: var(--tier);
  font-weight: 700;
}
.land__more {
  margin-bottom: 28px;
}
.land__features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.land__feature {
  transition:
    transform 0.3s var(--ease),
    border-color 0.3s;
}
.land__feature:hover {
  transform: translateY(-4px);
  border-color: var(--line-2);
}
.land__feature h3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.land__feature h3 svg {
  width: 18px;
  height: 18px;
  color: var(--dim);
  transition:
    transform 0.3s,
    color 0.3s;
}
.land__feature:hover h3 svg {
  transform: translateX(4px);
  color: var(--brand);
}
.land__feature p {
  margin-top: 10px;
  color: var(--dim);
}
.land__end {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 460px);
  gap: 32px;
  align-items: center;
}
.land__end h2 {
  font-size: clamp(48px, 6.4vw, 92px);
  line-height: 0.94;
}
.land__stand {
  width: 100%;
  height: 540px;
}
@media (max-width: 860px) {
  .land__hero {
    grid-template-columns: 1fr;
    min-height: 0;
    padding-top: calc(var(--nav) + 8px);
  }
  .land__fig {
    order: -1;
    height: 46vh;
  }
  .land__steps,
  .land__features {
    grid-template-columns: 1fr;
  }
  .land__tiers {
    grid-template-columns: repeat(3, 1fr);
    row-gap: 22px;
  }
  .land__end {
    grid-template-columns: 1fr;
  }
  .land__stand {
    height: 380px;
  }
}
</style>
