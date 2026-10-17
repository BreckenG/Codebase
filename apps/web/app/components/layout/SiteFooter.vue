<script setup>
const INVITE = 'https://discord.gg/gorillatagcomp';
const COLUMNS = [
  {
    title: 'Play',
    links: [
      ['Ranked codes', '/play'],
      ['Scrims', '/play?mode=scrims'],
      ['Leaderboard', '/leaderboard'],
      ['Launcher', '/launcher'],
    ],
  },
  {
    title: 'You',
    links: [
      ['Your profile', '/me'],
      ['Match history', '/history'],
      ['Membership', '/subscribe'],
    ],
  },
  {
    title: 'Help',
    links: [
      ['How ranked works', '/ranked'],
      ['Support', INVITE],
      ['Report a player', INVITE],
      ['Appeal a ban', INVITE],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['Terms', '/legal/terms'],
      ['Privacy', '/legal/privacy'],
      ['Refunds', '/legal/refunds'],
      ['Cookies', '/legal/cookies'],
      ['Contact', '/legal/business'],
    ],
  },
];
</script>

<template>
  <footer class="foot">
    <div class="wrap foot__grid">
      <div class="foot__brand">
        <NuxtLink to="/" class="foot__logo"
          ><img src="/img/planet.png" width="44" height="24" alt="" />Ranked World</NuxtLink
        >
        <p>Ranked lobbies and scrims for Gorilla Tag.</p>
        <div class="foot__socials">
          <a class="icon-btn" :href="INVITE" aria-label="Discord"><AppIcon name="discord" /></a>
          <a
            class="icon-btn"
            href="https://github.com/BreckenG/Codebase"
            target="_blank"
            rel="noopener"
            aria-label="GitHub"
            ><AppIcon name="github"
          /></a>
        </div>
      </div>
      <nav v-for="c in COLUMNS" :key="c.title" :aria-label="c.title">
        <h4>{{ c.title }}</h4>
        <template v-for="[label, to] in c.links" :key="label">
          <a v-if="to.startsWith('http')" :href="to">{{ label }}</a>
          <NuxtLink v-else :to="to">{{ label }}</NuxtLink>
        </template>
      </nav>
    </div>
    <p class="wrap foot__legal">
      &copy; 2026 Ranked World. Not affiliated with Another Axiom Inc. or its games Gorilla Tag and Orion Drift, and not
      endorsed or sponsored by Another Axiom. Portions of the materials here are property of Another Axiom.
    </p>
  </footer>
</template>

<style scoped>
.foot {
  margin-top: 96px;
  padding: 56px 0 40px;
  border-top: 1px solid var(--line);
}
.foot__grid {
  display: grid;
  grid-template-columns: 1.6fr repeat(4, 1fr);
  gap: 32px;
}
.foot__logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
}
.foot__brand p {
  margin: 14px 0 12px;
  max-width: 30ch;
  color: var(--dim);
  font-size: 14px;
}
.foot__socials {
  display: flex;
  gap: 4px;
  margin-left: -10px;
}
.foot nav {
  display: grid;
  align-content: start;
  gap: 10px;
}
.foot h4 {
  margin: 0 0 4px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
}
.foot nav a {
  color: var(--dim);
  font-size: 14px;
}
.foot nav a:hover {
  color: var(--ink);
}
.foot .foot__legal {
  margin-top: 48px;
  color: #6e6a75;
  font-size: 12px;
  line-height: 1.6;
}
@media (max-width: 860px) {
  .foot {
    padding-bottom: 96px;
  }
  .foot__grid {
    grid-template-columns: 1fr 1fr;
  }
  .foot__brand {
    grid-column: 1 / -1;
  }
}
</style>
