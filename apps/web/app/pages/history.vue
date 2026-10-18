<script setup>
const page = ref(0);
const { me } = useMe();
const track = ref('ranked');
const open = ref(new Set());
watch(track, () => {
  page.value = 0;
  open.value = new Set();
});
const { data, pending, error, refresh } = await useApiFetch('/api/history', {
  query: { page, track },
  key: 'history',
  lazy: import.meta.client,
  default: () => null,
});
const rows = computed(() => data.value?.rows || []);
const capped = computed(() => Boolean(data.value?.capped));
const hasBreakdown = computed(() => Boolean(data.value?.breakdown));
const reach = computed(() => data.value?.reach || 0);
const total = computed(() => data.value?.total || 0);
const pages = computed(() => Math.ceil(reach.value / 25));
const chart = computed(() => {
  const pts = [...rows.value]
    .reverse()
    .map((m) => m.afterElo)
    .filter(Number.isFinite);
  if (pts.length < 3) return null;
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const span = Math.max(1, hi - lo);
  const x = (n) => Math.round((n / (pts.length - 1)) * 6000) / 10;
  const y = (v) => Math.round((112 - ((v - lo) / span) * 100) * 10) / 10;
  const line = pts.map((v, n) => `${x(n)},${y(v)}`).join(' ');
  return { line, area: `0,120 ${line} 600,120`, lo, hi };
});
const gained = computed(() => rows.value.reduce((n, m) => n + (m.delta > 0 ? m.delta : 0), 0));
const lost = computed(() => rows.value.reduce((n, m) => n + (m.delta < 0 ? -m.delta : 0), 0));
const wins = computed(() => rows.value.filter((m) => m.won).length);
const figures = computed(() => [
  { key: 'MMR gained', value: gained.value, sign: '+', cls: 'pos' },
  { key: 'MMR lost', value: lost.value, sign: '-', cls: 'neg' },
  { key: 'Round wins', value: wins.value, sign: '', cls: '' },
  { key: 'On this page', value: rows.value.length, sign: '', cls: '' },
]);

function toggle(i) {
  const s = new Set(open.value);
  if (s.has(i)) s.delete(i);
  else s.add(i);
  open.value = s;
}

const when = (d) =>
  new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const pct = (n) => `${Math.round((n || 0) * 100)}%`;
const clock = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.round((s || 0) % 60)).padStart(2, '0')}`;
const seats = (m) => (m.teamPlacement ? 2 : Math.min(m.lobbySize || 0, 12));

function placeText(m) {
  const of = m.teamPlacement ? 2 : m.lobbySize;
  let lead = '';
  if (m.teamPlacement) lead = 'Team ';
  else if (m.tied) lead = 'Tied ';
  return `${lead}${m.placement + 1} of ${of}, ${m.beforeElo} to ${m.afterElo} MMR`;
}

function movers(d) {
  const out = [];
  if (d.tags) out.push(`${d.tags} tag${d.tags === 1 ? '' : 's'}`);
  if (d.survivalSeconds) out.push(`${clock(d.survivalSeconds)} alive`);
  if (!d.wasInfected) out.push('never tagged');
  if (d.firstTagged) out.push('tagged first');
  if (d.leftEarly) out.push('left early');
  return out;
}

function bars(d) {
  if (d.ratingSystem === 'ranked-performance-v1') {
    return [
      { label: 'Expected result', v: d.expectedPerformance },
      { label: 'Round result', v: d.actualPerformance },
    ].filter((b) => b.v !== null);
  }
  if (d.ratingSystem === 'openskill') return [];
  return [
    { label: 'Placement', v: d.place01 },
    { label: 'Performance', v: d.perf01 },
  ];
}

const route = useRoute();
const router = useRouter();
const view = computed(() => (route.query.view === 'replays' ? 'replays' : 'matches'));
const setView = (v) => router.replace({ query: v === 'replays' ? { view: v } : {} });
useHead({ title: 'Matches | Ranked World' });
</script>

<template>
  <main id="main" class="page">
    <div class="wrap">
      <header class="page-head">
        <h1 class="reveal-up">Matches</h1>
        <div class="hi__views">
          <div class="seg" role="group" aria-label="History track">
            <button v-for="t in ['ranked', 'scrim']" :key="t" :aria-pressed="track === t" @click="track = t">
              {{ t === 'ranked' ? 'Ranked' : 'Scrims' }}
            </button>
          </div>
          <div class="seg" role="group" aria-label="View">
            <button :aria-pressed="view === 'matches'" @click="setView('matches')">
              <AppIcon name="swords" />Matches
            </button>
            <button :aria-pressed="view === 'replays'" @click="setView('replays')">
              <AppIcon name="play" />Replays
            </button>
          </div>
        </div>
      </header>

      <ReplayLibrary v-if="view === 'replays'" :track="track" />
      <template v-else>
        <div v-if="!me.user" class="empty">
          <h2>Sign in to view your history</h2>
          <p>Every match you play recorded to show your stats and a 3D replay.</p>
          <a class="btn btn--brand" href="/sign-in"><AppIcon name="discord" />Sign in with Discord</a>
        </div>
        <div v-else-if="error" role="alert" class="alert">
          <p>Could not load your matches.</p>
          <button class="btn btn--small" @click="refresh">Try again</button>
        </div>
        <div v-else-if="data && !data.linked" class="empty">
          <h2>No account connected yet</h2>
          <p>Connect your Gorilla Tag account and every round you play turns up here.</p>
          <NuxtLink class="btn btn--brand btn--large" to="/play"><AppIcon name="link" />Connect your account</NuxtLink>
        </div>
        <div v-else-if="pending" class="skeleton hi__skeleton" aria-busy="true" aria-label="Loading your matches" />
        <div v-else-if="!rows.length" class="empty">
          <h2>No scored rounds yet</h2>
          <p>Play a ranked code and this fills in.</p>
          <NuxtLink class="btn btn--brand" to="/play">Find a code</NuxtLink>
        </div>
        <template v-else>
          <section class="hi__top">
            <dl class="hi__figures">
              <div v-for="f in figures" :key="f.key" class="stat">
                <dt :class="f.cls">{{ f.sign }}<CountUp :value="f.value" /></dt>
                <dd>{{ f.key }}</dd>
              </div>
            </dl>
            <figure v-if="chart" class="hi__chart panel">
              <svg viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="hi-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stop-color="#ee862a" stop-opacity=".32" />
                    <stop offset="1" stop-color="#ee862a" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <polygon :points="chart.area" fill="url(#hi-fill)" />
                <polyline :points="chart.line" vector-effect="non-scaling-stroke" />
              </svg>
              <span class="hi__hi">{{ chart.hi }}</span>
              <span class="hi__lo">{{ chart.lo }}</span>
              <figcaption class="meta">MMR over these {{ rows.length }} rounds</figcaption>
            </figure>
          </section>

          <ol class="hi__list">
            <li v-for="(m, i) in rows" :key="i" class="hi__item reveal-up" :style="{ '--i': Math.min(i, 14) }">
              <div class="hi__row">
                <span class="hi__delta" :class="m.delta >= 0 ? 'pos' : 'neg'"
                  >{{ m.delta >= 0 ? '+' : '' }}{{ m.delta }}</span
                >
                <div class="hi__body">
                  <div class="hi__title">
                    <strong>{{ m.code }}</strong
                    ><span v-if="m.provisional" class="chip">placement</span>
                  </div>
                  <p class="meta">{{ placeText(m) }}</p>
                </div>
                <span class="hi__seats" aria-hidden="true">
                  <i v-for="n in seats(m)" :key="n" :class="{ me: n === m.placement + 1 }" />
                </span>
                <span class="meta hi__when">{{ when(m.at) }}</span>
                <button
                  v-if="m.detail"
                  class="icon-btn hi__more"
                  :class="{ on: open.has(i) }"
                  :aria-expanded="String(open.has(i))"
                  :aria-label="`${open.has(i) ? 'Hide' : 'Show'} breakdown for match ${m.code}`"
                  :aria-controls="`match-breakdown-${i}`"
                  @click="toggle(i)"
                >
                  <AppIcon name="chevron" />
                </button>
              </div>
              <Transition name="expand">
                <div v-if="m.detail && open.has(i)" :id="`match-breakdown-${i}`" class="hi__detail">
                  <div class="hi__detail-in">
                    <div class="bd">
                      <p v-if="m.detail.ratingSystem === 'ranked-performance-v1'">
                        {{ num(m.detail.score) }} total points from {{ m.detail.tags }} tags and
                        {{ num(m.detail.survivalSeconds) }} seconds uninfected.
                      </p>
                      <template v-else-if="m.detail.ratingSystem === 'openskill'">
                        <p>
                          {{ num(m.detail.tags * 30) }} tag points + {{ num(m.detail.survivalSeconds) }} runtime points
                          = {{ num(m.detail.score) }} points
                        </p>
                        <p v-if="track === 'scrim'">Team score: {{ num(m.detail.teamScore) }}</p>
                      </template>
                      <div v-for="b in bars(m.detail)" :key="b.label" class="bd__row">
                        <span class="meta">{{ b.label }}</span>
                        <div class="bar"><span :style="{ width: pct(b.v) }" /></div>
                        <span class="bd__num">{{ pct(b.v) }}</span>
                      </div>
                      <template v-if="m.detail.ratingSystem === 'ranked-performance-v1'">
                        <p v-if="m.detail.protected" class="meta">
                          {{
                            m.detail.shortLobby
                              ? 'Fewer than 3 players stayed and scored 30 points, so this round did not count.'
                              : 'Fewer than 30 total points: your MMR change is 0.'
                          }}
                        </p>
                        <template v-else>
                          <p v-if="m.detail.streakMultiplier > 1" class="meta">
                            {{ m.detail.streakMultiplier }}x streak bonus for consecutive wins above expectations.
                          </p>
                          <p v-if="m.detail.leavePenalty > 0" class="meta">
                            Leaving penalty: {{ num(m.detail.leavePenalty) }} MMR.
                          </p>
                        </template>
                      </template>
                      <p v-else-if="m.detail.ratingSystem !== 'openskill'" class="meta">
                        {{ movers(m.detail).join(', ') || 'nothing notable' }}
                        <template v-if="m.detail.eventMultiplier > 1">
                          plus a {{ m.detail.eventMultiplier }}x weekend boost on the gain
                        </template>
                      </p>
                    </div>
                  </div>
                </div>
              </Transition>
            </li>
          </ol>
        </template>

        <PerkCard v-if="!hasBreakdown && rows.length" class="hi__up" title="Know exactly why your MMR moved">
          Match points, tags, untagged runtime and the full rating breakdown on every round.
        </PerkCard>
        <PerkCard v-if="capped" class="hi__up" title="Unlock your whole match history">
          Showing your last {{ reach }} rounds of {{ total }}. Plus keeps every round.
        </PerkCard>
        <div v-if="pages > 1" class="hi__pager">
          <button class="btn btn--ghost" :disabled="page === 0" @click="page--">
            <AppIcon name="arrowLeft" />Newer
          </button>
          <span class="meta">Page {{ page + 1 }} of {{ pages }}</span>
          <button class="btn btn--ghost" :disabled="page + 1 >= pages" @click="page++">
            Older<AppIcon name="arrowRight" />
          </button>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
.hi__views {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.hi__skeleton {
  height: 520px;
}
.hi__top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  gap: 32px;
  align-items: center;
  margin-bottom: 40px;
}
.hi__figures {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px 24px;
  margin: 0;
}
.hi__chart {
  position: relative;
  margin: 0;
  padding: 28px 28px 18px 56px;
}
.hi__chart svg {
  display: block;
  width: 100%;
  height: 160px;
  overflow: visible;
}
.hi__chart polyline {
  fill: none;
  stroke: var(--brand);
  stroke-width: 2.5;
  stroke-linejoin: round;
}
.hi__hi,
.hi__lo {
  position: absolute;
  left: 18px;
  color: var(--dim);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.hi__hi {
  top: 24px;
}
.hi__lo {
  bottom: 52px;
}
.hi__chart figcaption {
  margin-top: 12px;
}
.hi__list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--panel);
  overflow: hidden;
}
.hi__item + .hi__item {
  border-top: 1px solid var(--line);
}
.hi__row {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 76px;
  padding: 12px 20px;
}
.hi__delta {
  display: grid;
  place-items: center;
  min-width: 72px;
  height: 40px;
  flex: none;
  border-radius: var(--r);
  background: color-mix(in srgb, currentColor 13%, transparent);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.hi__body {
  flex: 1;
  min-width: 0;
}
.hi__title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hi__title strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 19px;
}
.hi__seats {
  display: flex;
  gap: 3px;
}
.hi__seats i {
  width: 6px;
  height: 18px;
  border-radius: 2px;
  background: var(--raise-2);
}
.hi__seats i.me {
  background: var(--brand);
}
.hi__when {
  min-width: 120px;
  text-align: right;
  white-space: nowrap;
}
.hi__more svg {
  transition: transform 0.3s var(--ease);
}
.hi__more.on svg {
  transform: rotate(180deg);
}
.hi__detail {
  display: grid;
  grid-template-rows: 1fr;
}
.hi__detail-in {
  min-height: 0;
  overflow: hidden;
}
.bd {
  display: grid;
  gap: 10px;
  padding: 0 20px 20px 110px;
}
.bd__row {
  display: grid;
  grid-template-columns: 8rem 1fr 3rem;
  align-items: center;
  gap: 12px;
}
.bd__num {
  color: var(--ink);
  font-size: 14px;
  text-align: right;
}
.expand-enter-active,
.expand-leave-active {
  transition:
    grid-template-rows 0.4s var(--ease),
    opacity 0.25s;
}
.expand-enter-from,
.expand-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}
.hi__up {
  margin-top: 16px;
}
.hi__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 28px;
}
@media (max-width: 860px) {
  .hi__top {
    grid-template-columns: 1fr;
  }
  .hi__seats,
  .hi__when {
    display: none;
  }
  .hi__row {
    gap: 12px;
    padding: 12px 14px;
  }
  .bd {
    padding-left: 14px;
  }
  .bd__row {
    grid-template-columns: 6rem 1fr 3rem;
  }
}
</style>
