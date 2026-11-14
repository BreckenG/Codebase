<script setup>
const route = useRoute();
const { me, load } = useMe();
onMounted(() => load());
const ownsProfile = computed(() => Boolean(me.value.user && me.value.user.id === String(route.params.id)));
const id = computed(() => String(route.params.id || ''));
const {
  data: player,
  error,
  pending,
  refresh,
} = await useAsyncData(`player-${id.value}`, () => apiGet(`/api/player/${encodeURIComponent(id.value)}`));
const notFound = Number(error.value?.statusCode || error.value?.data?.statusCode) === 404;
if (import.meta.server && notFound) setResponseStatus(useRequestEvent(), 404);
const missing = computed(() => !error.value || error.value.statusCode === 404);
const tracks = computed(() => {
  if (!player.value) return [];
  return [
    { title: 'Ranked', key: 'ranked', t: player.value.ranked },
    { title: 'Scrims', key: 'scrim', t: player.value.scrim },
  ];
});
const display = computed(() => player.value?.discord?.name || player.value?.name);

function runtime(sec) {
  const h = Math.floor((sec || 0) / 3600);
  const m = Math.round(((sec || 0) % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function result(m) {
  if (m.won) return 'Win';
  return m.track !== 'scrim' && m.placement === 0 ? 'Tie' : 'Loss';
}

const stats = (t) => [
  { label: 'MMR', value: num(t.elo) },
  { label: 'Peak MMR', value: num(t.peakElo) },
  { label: 'Wins', value: num(t.wins) },
  { label: 'Rounds', value: num(t.rounds) },
  { label: 'Win rate', value: `${t.winRate}%` },
  { label: 'Time survived', value: runtime(t.survivalSeconds) },
  { label: 'Tags', value: num(t.tags) },
];
useSeo(() => ({
  title: player.value ? player.value.name : 'Player',
  description: 'Rank, MMR, win rate and recent rounds on the Ranked World ladder.',
}));
</script>

<template>
  <main id="main" class="page">
    <div class="wrap">
      <NuxtLink class="back" to="/leaderboard"><AppIcon name="arrowLeft" />Leaderboard</NuxtLink>
      <div v-if="pending" class="skeleton pf__skeleton" aria-label="Loading player" aria-busy="true" />
      <div v-else-if="error || !player" class="empty">
        <h1>{{ missing ? 'Player not found' : 'Could not load this player' }}</h1>
        <p>{{ missing ? 'Check the player ID or find them on the leaderboard.' : 'Try loading the profile again.' }}</p>
        <button v-if="!missing" class="btn" @click="refresh">Try again</button>
        <NuxtLink v-else class="btn" to="/leaderboard">Find a player</NuxtLink>
      </div>
      <template v-else>
        <header class="pf__head">
          <PlayerAvatar
            class="reveal-up"
            :name="display"
            :src="player.discord?.avatar || player.avatar || ''"
            :discord-id="player.discordId || ''"
            :size="96"
          />
          <div class="pf__name">
            <h1 class="reveal-up" style="--i: 1">{{ display }}</h1>
            <div class="pf__chips reveal-up" style="--i: 2">
              <span class="meta">{{ player.name }}</span>
              <span v-if="player.banned" class="chip pf__ban">
                <img src="/img/badges/rank_banned.png" alt="" width="16" height="16" />Rank banned
              </span>
              <span v-if="!player.linked" class="chip">Account disconnected</span>
              <span v-if="player.inCode" class="chip chip--live">
                <span class="dot" />Playing in {{ player.inCode.code || 'a code' }}
              </span>
            </div>
          </div>
          <div v-if="player.position" class="pf__pos reveal-up" style="--i: 2">
            <strong>#{{ num(player.position) }}</strong>
            <span>on the ranked ladder</span>
          </div>
        </header>

        <ProgressIdentity :player="player" />

        <ProfileCardStudio v-if="ownsProfile" :position="player.position" />
        <section v-else-if="player.playerCard" class="section">
          <div class="section-head"><h2>Player card</h2></div>
          <ProfileCard class="pf__card" :profile="player.playerCard.profile" :card="player.playerCard.card" />
        </section>

        <section class="section pf__tracks">
          <article v-for="card in tracks" :key="card.key" class="panel" :class="tierClass(card.t.tier.name)">
            <div class="pf__track-head">
              <h2>{{ card.title }}</h2>
              <span class="pf__tier">{{ card.t.tier.name }} / {{ card.t.tier.category }}</span>
            </div>
            <dl class="pf__stats">
              <div v-for="s in stats(card.t)" :key="s.label" class="stat">
                <dt>{{ s.value }}</dt>
                <dd>{{ s.label }}</dd>
              </div>
            </dl>
            <p class="meta">
              {{ card.t.tier.isTop ? 'Top division reached' : `${card.t.tier.eloToNext} MMR to the next division` }}
            </p>
          </article>
        </section>

        <ClientOnly><ProfileHeatmap v-if="ownsProfile" /></ClientOnly>

        <section class="section">
          <div class="section-head">
            <h2>Recent matches</h2>
            <span class="meta">{{ player.matches.length }} recorded rounds</span>
          </div>
          <div
            v-if="player.matches.length"
            class="pf__matches"
            tabindex="0"
            role="region"
            aria-label="Recent match results"
          >
            <table class="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Result</th>
                  <th>MMR change</th>
                  <th>Rating</th>
                  <th>Place</th>
                  <th>Tags</th>
                  <th>Played</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(m, i) in player.matches" :key="i">
                  <td>
                    <strong>{{ m.code || 'Private room' }}</strong>
                    <small>{{ m.track === 'scrim' ? 'Scrims' : 'Ranked' }}</small>
                  </td>
                  <td :class="{ pos: m.won }">{{ result(m) }}</td>
                  <td :class="m.delta >= 0 ? 'pos' : 'neg'">{{ m.delta > 0 ? '+' : '' }}{{ m.delta ?? 0 }}</td>
                  <td>{{ m.afterElo ?? 'Unknown' }}</td>
                  <td>{{ m.placement == null ? 'N/A' : m.placement + 1 }} / {{ m.lobbySize ?? 'Unknown' }}</td>
                  <td>{{ num(m.tags) }}</td>
                  <td :title="exact(m.at)">{{ ago(m.at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty">
            <h3>No matches yet</h3>
            <NuxtLink class="btn" to="/play">Find a game</NuxtLink>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.pf__skeleton {
  height: 520px;
}
.pf__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 28px;
  margin: 28px 0 48px;
}
.pf__head :deep(img) {
  border-radius: var(--r-lg);
}
.pf__name {
  flex: 1;
  min-width: 0;
}
.pf__name h1 {
  overflow: hidden;
  font-size: clamp(44px, 6vw, 88px);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pf__chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.pf__ban {
  color: var(--bad);
}
.pf__ban img {
  image-rendering: pixelated;
}
.pf__pos {
  display: grid;
  justify-items: end;
  color: var(--dim);
  font-size: 14px;
}
.pf__pos strong {
  color: var(--brand);
  font-family: var(--font-display);
  font-size: clamp(44px, 5vw, 72px);
  font-weight: 800;
  line-height: 1;
}
.pf__card {
  max-width: 980px;
}
.pf__tracks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.pf__track-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}
.pf__track-head h2 {
  font-size: 32px;
}
.pf__tier {
  color: var(--tier);
  font-weight: 700;
}
.pf__stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 22px 16px;
  margin: 0 0 22px;
}
.pf__stats .stat dt {
  font-size: 26px;
}
.pf__matches {
  overflow-x: auto;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--panel);
}
.pf__matches td small {
  display: block;
  color: var(--dim);
  font-size: 12px;
}
@media (max-width: 860px) {
  .pf__tracks {
    grid-template-columns: 1fr;
  }
  .pf__head {
    gap: 18px;
  }
  .pf__name {
    flex-basis: calc(100% - 120px);
  }
  .pf__name h1 {
    font-size: 40px;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .pf__pos {
    justify-items: start;
  }
}
</style>
