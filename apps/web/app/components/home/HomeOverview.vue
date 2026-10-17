<script setup>
const { me } = useMe();
const {
  data: mine,
  pending,
  error,
  refresh,
} = await useApiFetch('/api/me/player', {
  key: 'overview-player',
  default: () => ({ player: null }),
});
const {
  data: codeData,
  error: codeError,
  refresh: refreshCodes,
} = await useApiFetch('/api/codes', {
  key: 'overview-codes',
  default: () => ({ codes: [] }),
});
const { data: partyData, refresh: refreshParty } = await useApiFetch('/api/me/party', {
  key: 'overview-party',
  default: () => null,
});
const {
  data: ladder,
  error: ladderError,
  refresh: refreshLadder,
} = await useApiFetch('/api/leaderboard', {
  key: 'overview-ladder',
  query: { track: 'ranked', per: 5 },
  default: () => null,
});
const player = computed(() => mine.value?.player);
const linked = computed(() => Boolean(player.value?.linked));
const codes = computed(() => (codeData.value?.codes || []).filter((c) => c.active));
const rounds = computed(() => (player.value?.matches || []).slice(0, 6));
const leaders = computed(() => (ladder.value?.rows || []).slice(0, 5));
const match = computed(() => partyData.value?.match);
const party = computed(() => partyData.value?.party);
const queued = computed(() => Boolean(party.value?.queuedAt));
const first = computed(() => me.value.user?.username || 'there');
const date = (value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const partyTitle = computed(() => {
  if (match.value) return match.value.code || 'Preparing your room';
  return queued.value ? 'Finding your opponents' : 'Scrims';
});
const partyText = computed(() => {
  if (match.value) return `${match.value.size} / ${match.value.state}`;
  if (queued.value) return 'Your party is in the queue. Open Scrims to check its status or cancel.';
  if (party.value?.members?.length > 1)
    return `${party.value.members.length} players in your party. Ready up and find a match.`;
  return 'Invite players to your party to start a scrim.';
});
const partyAction = computed(() => {
  if (match.value) return 'Open match';
  return queued.value ? 'View queue' : 'Open scrims';
});
let poll;
onMounted(() => {
  poll = setInterval(() => {
    refresh();
    refreshCodes();
    refreshParty();
  }, 15000);
});
onBeforeUnmount(() => clearInterval(poll));
</script>

<template>
  <main id="main" class="page">
    <div class="wrap">
      <header class="page-head">
        <h1 class="reveal-up">Hey {{ first }}</h1>
        <NuxtLink class="btn btn--brand btn--large reveal-up" style="--i: 1" to="/play">
          <AppIcon name="play" />{{ linked ? 'Find a game' : 'Start playing' }}
        </NuxtLink>
      </header>

      <div v-if="error" class="alert" role="alert">
        <p>We could not load your player information.</p>
        <button class="btn btn--small" @click="refresh">Try again</button>
      </div>
      <div v-if="pending" class="skeleton" aria-label="Loading your progress" aria-busy="true" />
      <ProgressIdentity v-else-if="linked && player.ranked" :player="player" />
      <section v-else class="ov__connect panel">
        <div>
          <h2>Connect Gorilla Tag</h2>
          <p class="lead">
            Join a one time private code in the game and your rounds start counting. It takes about a minute.
          </p>
          <NuxtLink class="btn btn--brand btn--large" to="/play">Connect your account</NuxtLink>
        </div>
        <ClientOnly><GorillaFigure class="ov__connect-fig" pose="reach" :color="[0.93, 0.45, 0.1]" /></ClientOnly>
      </section>

      <div class="ov__grid">
        <section class="section">
          <div class="section-head">
            <h2>Your codes</h2>
            <NuxtLink to="/play">All codes -&gt;</NuxtLink>
          </div>
          <div v-if="codeError" class="alert" role="alert">
            <p>Codes are unavailable right now.</p>
            <button class="btn btn--small" @click="refreshCodes">Try again</button>
          </div>
          <div v-else-if="codes.length" class="rows">
            <div v-for="c in codes.slice(0, 4)" :key="c.code" class="row ov__code">
              <span class="ov__hash"><AppIcon name="hash" /></span>
              <div class="ov__code-main">
                <strong>{{ c.code }}</strong>
                <span class="meta">{{ c.category || codeData.bracket }} / {{ c.count || 0 }} players</span>
              </div>
              <RoomJoinButton :code="c.code" />
            </div>
          </div>
          <div v-else class="empty">
            <h3>{{ linked ? 'No codes open in your bracket' : 'Your bracket, your competition' }}</h3>
            <p>
              {{
                linked
                  ? 'Codes open as players come online. Try a scrim while you wait.'
                  : 'Connect your account to see the ranked codes available to you.'
              }}
            </p>
            <NuxtLink class="btn" to="/play">{{ linked ? 'See codes' : 'Connect your account' }}</NuxtLink>
          </div>
        </section>
        <section class="section">
          <div class="section-head">
            <h2>{{ partyTitle }}</h2>
          </div>
          <div class="panel ov__party">
            <p>{{ partyText }}</p>
            <NuxtLink class="btn" to="/play?mode=scrims"> <AppIcon name="users" />{{ partyAction }} </NuxtLink>
          </div>
        </section>
      </div>

      <section v-if="linked" class="section">
        <div class="section-head">
          <h2>Recent rounds</h2>
          <NuxtLink to="/history">Match history -&gt;</NuxtLink>
        </div>
        <div v-if="rounds.length" class="rows">
          <div v-for="(m, i) in rounds" :key="m.roundId || i" class="row ov__round">
            <span class="ov__place">{{ m.placement + 1 }}</span>
            <div class="ov__code-main">
              <strong>{{ m.code }}</strong>
              <span class="meta">{{ m.afterElo - m.delta }} to {{ m.afterElo }} MMR</span>
            </div>
            <span class="meta ov__date">{{ date(m.at || m.createdAt) }}</span>
            <strong class="ov__delta" :class="m.delta >= 0 ? 'pos' : 'neg'"
              >{{ m.delta >= 0 ? '+' : '' }}{{ m.delta }}</strong
            >
          </div>
        </div>
        <div v-else class="empty">
          <h3>No matches yet</h3>
          <NuxtLink to="/play" class="btn">Find a ranked code</NuxtLink>
        </div>
      </section>

      <section v-else class="section">
        <div class="section-head">
          <h2>The ladder</h2>
          <NuxtLink to="/leaderboard">Leaderboard -&gt;</NuxtLink>
        </div>
        <div v-if="ladderError" class="alert" role="alert">
          <p>We could not load the leaderboard.</p>
          <button class="btn btn--small" @click="refreshLadder">Try again</button>
        </div>
        <ClientOnly v-else-if="leaders.length"><LadderPodium :rows="leaders" /></ClientOnly>
      </section>
    </div>
  </main>
</template>

<style scoped>
.ov__connect {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
  align-items: center;
}
.ov__connect .lead {
  margin: 14px 0 26px;
}
.ov__connect-fig {
  width: 100%;
  height: 320px;
}
.ov__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
  gap: 40px;
}
.ov__hash {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: var(--r);
  background: rgba(238, 134, 42, 0.12);
  color: var(--brand);
}
.ov__hash svg {
  width: 18px;
  height: 18px;
}
.ov__code-main {
  display: grid;
  flex: 1;
  min-width: 0;
}
.ov__code-main strong {
  font-family: var(--font-display);
  font-size: 20px;
  letter-spacing: 0.02em;
}
.ov__party {
  display: grid;
  gap: 20px;
  justify-items: start;
}
.ov__place {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: var(--r);
  background: var(--raise);
  color: var(--ink);
  font-weight: 700;
}
.ov__delta {
  min-width: 64px;
  text-align: right;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 860px) {
  .ov__connect,
  .ov__grid {
    grid-template-columns: 1fr;
  }
  .ov__grid {
    gap: 0;
  }
  .ov__date {
    display: none;
  }
}
</style>
