<script setup>
import { rankBadge } from '~/utils/badges';

const route = useRoute();
const router = useRouter();
const { me } = useMe();
const CATEGORIES = [
  { key: 'LOW', label: 'Low', icon: 'compass' },
  { key: 'MID', label: 'Mid', icon: 'shield' },
  { key: 'HIGH', label: 'High', icon: 'swords' },
  { key: 'TOP', label: 'Top', icon: 'crown' },
];
const PER_PAGE = [20, 50, 100];
const sortsReq = useApiFetch('/api/sorts', { key: 'sorts', lazy: import.meta.client, default: () => null });
const SORTS = computed(() => sortsReq.data.value?.sorts || []);
const METRICS = computed(() => sortsReq.data.value?.metrics || []);
const track = ref(route.query.track === 'scrim' ? 'scrim' : 'ranked');
const page = ref(Number(route.query.page || 1));
const per = ref(PER_PAGE.includes(Number(route.query.per)) ? Number(route.query.per) : 20);
const search = ref(String(route.query.q || ''));
const category = ref(String(route.query.category || ''));
const sort = ref(String(route.query.sort || 'relevance'));
const metric = ref(String(route.query.metric || 'elo'));
const grid = ref(false);
const query = computed(() => ({
  track: track.value,
  page: String(page.value),
  per: String(per.value),
  q: search.value || undefined,
  category: category.value || undefined,
  sort: sort.value,
  metric: metric.value,
}));
const listReq = useApiFetch('/api/leaderboard', {
  key: 'leaderboard',
  query,
  lazy: import.meta.client,
  default: () => null,
});
await Promise.all([sortsReq, listReq]);
const { data, pending, error, refresh } = listReq;
watch(query, (q) => router.replace({ query: { ...q } }));
watch(
  () => route.query,
  (q) => {
    track.value = q.track === 'scrim' ? 'scrim' : 'ranked';
    page.value = Number(q.page || 1);
    per.value = PER_PAGE.includes(Number(q.per)) ? Number(q.per) : 20;
    search.value = String(q.q || '');
    category.value = String(q.category || '');
    sort.value = String(q.sort || 'relevance');
    metric.value = String(q.metric || 'elo');
  },
);
let timer;

function clearSearch() {
  clearTimeout(timer);
  search.value = '';
  page.value = 1;
}

function onSearch(e) {
  clearTimeout(timer);
  const value = e.target.value.trim();
  timer = setTimeout(() => {
    search.value = value;
    page.value = 1;
  }, 300);
}

function pickMetric(key) {
  metric.value = key;
  page.value = 1;
}

function pickCategory(key) {
  category.value = key;
  page.value = 1;
}

function setTrack(t) {
  track.value = t;
  page.value = 1;
}

function goTo(n) {
  page.value = Math.min(Math.max(1, n), pages.value);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setPer(n) {
  per.value = n;
  page.value = 1;
}

const metricsOpen = ref(false);
const listAt = ref({});
const closeMetrics = () => {
  metricsOpen.value = false;
};

function openMetrics(e) {
  const r = e.currentTarget.getBoundingClientRect();
  listAt.value = { top: `${r.bottom + 6}px`, left: `${r.left}px` };
  metricsOpen.value = !metricsOpen.value;
}

watch(metricsOpen, (on) => {
  if (on) window.addEventListener('scroll', closeMetrics, { once: true, passive: true });
});
const ORDER = { relevance: 'Default', desc: 'High to low', asc: 'Low to high', friends: 'Default' };
const orderLabel = computed(() => ORDER[sort.value] || 'Default');

function chooseMetric(key) {
  metricsOpen.value = false;
  pickMetric(key);
}

function cycleOrder() {
  const next = { relevance: 'desc', desc: 'asc', asc: 'relevance', friends: 'desc' };
  setSort(next[sort.value] || 'relevance');
}

function toggleFriends() {
  setSort(sort.value === 'friends' ? 'relevance' : 'friends');
}

function sortBy(key) {
  if (metric.value !== key) {
    pickMetric(key);
    return setSort('desc');
  }
  setSort(sort.value === 'desc' ? 'asc' : 'desc');
}

function setSort(key) {
  sort.value = key;
  page.value = 1;
}

function clearAll() {
  search.value = '';
  category.value = '';
  metric.value = 'elo';
  page.value = 1;
}

const rows = computed(() => data.value?.rows || []);
const total = computed(() => data.value?.total || 0);
const podium = computed(() => {
  const open = page.value === 1 && !search.value && sort.value === 'relevance' && metric.value === 'elo';
  return open && rows.value.length > 5 ? rows.value.slice(0, 5) : [];
});
const rest = computed(() => rows.value.slice(podium.value.length));
const pages = computed(() => data.value?.pages || 1);
const friendsLocked = computed(() => Boolean(data.value?.friendsLocked));
const activeFilters = computed(() => [category.value, search.value, metric.value !== 'elo'].filter(Boolean).length);
const metricLabel = computed(() => METRICS.value.find((m) => m.key === metric.value)?.label || 'MMR');
const tierKey = (p) => p[track.value].tier.tier.toLowerCase();
const POSES = [
  'idle',
  'wave',
  'cheer',
  'thumbsup',
  'peace',
  'flex',
  'shrug',
  'think',
  'fistpump',
  'clap',
  'reach',
  'salute',
  'lean',
];
const poses = new Map();
const poseFor = (p) => {
  if (!poses.has(p.discordId)) poses.set(p.discordId, POSES[Math.floor(Math.random() * POSES.length)]);
  return poses.get(p.discordId);
};
const isYou = (p) => Boolean(me.value.user) && p.discordId === me.value.user.id;

function clock(sec) {
  const h = Math.floor((sec || 0) / 3600);
  const m = Math.round(((sec || 0) % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

const VALUE = {
  peak: (t) => num(t.peakElo),
  rounds: (t) => num(t.rounds),
  wins: (t) => num(t.wins),
  winrate: (t) => `${t.winRate}%`,
  tags: (t) => num(t.tags),
  runtime: (t) => clock(t.survivalSeconds),
  streak: (t) => num(t.winStreak),
};
const metricValue = (p) => (VALUE[metric.value] || ((t) => num(t.elo)))(p[track.value]);
const FACTS = [
  { key: 'winrate', label: 'Win rate', unit: 'won', read: (t) => `${t.winRate}%` },
  { key: 'peak', label: 'Peak MMR', unit: 'peak', read: (t) => num(t.peakElo) },
  { key: 'streak', label: 'Win streak', unit: 'win streak', read: (t) => num(t.winStreak) },
  { key: 'wins', label: 'Wins', unit: 'wins', read: (t) => num(t.wins) },
];
const facts = computed(() => FACTS.filter((f) => f.key !== metric.value).slice(0, 2));
onBeforeUnmount(() => clearTimeout(timer));
useSeo({
  title: 'Gorilla Tag ranked leaderboard',
  description:
    'The Ranked World ladder. Sort competitive Gorilla Tag players by MMR, peak MMR, wins, tags, win streak or time survived, and filter by rank bracket.',
});
</script>

<template>
  <main id="main" class="page">
    <div class="wrap">
      <header class="page-head">
        <div>
          <h1 class="reveal-up">Leaderboard</h1>
          <p class="reveal-up" style="--i: 1">
            {{ num(total) }} players on the {{ track === 'ranked' ? 'ranked' : 'scrim' }} ladder.
          </p>
        </div>
        <div class="seg" role="group" aria-label="Leaderboard track">
          <button v-for="t in ['ranked', 'scrim']" :key="t" :aria-pressed="track === t" @click="setTrack(t)">
            {{ t === 'ranked' ? 'Ranked' : 'Scrims' }}
          </button>
        </div>
      </header>

      <ClientOnly v-if="podium.length">
        <LadderPodium class="lb__podium" :rows="podium" :track="track" />
      </ClientOnly>

      <section class="lb__tools" aria-label="Filters">
        <label class="lb__search">
          <AppIcon name="search" />
          <input
            type="search"
            :value="search"
            placeholder="Find a player"
            aria-label="Search players"
            @input="onSearch"
          />
          <button v-if="search" class="icon-btn" aria-label="Clear search" @click.prevent="clearSearch">
            <AppIcon name="x" />
          </button>
        </label>
        <div class="lb__bar">
          <div class="seg lb__brackets" role="group" aria-label="Bracket">
            <button
              v-for="c in [{ key: '', label: 'All' }, ...CATEGORIES]"
              :key="c.key"
              :aria-pressed="category === c.key"
              @click="pickCategory(c.key)"
            >
              {{ c.label }}
            </button>
          </div>
          <div class="lb__menu" @keydown.esc="metricsOpen = false">
            <button class="lb__pick" :aria-expanded="String(metricsOpen)" @click="openMetrics">
              <span class="meta">Rank by</span>{{ metricLabel }}<AppIcon name="chevron" />
            </button>
            <div v-if="metricsOpen" class="lb__shade" @click="metricsOpen = false" />
            <div v-if="metricsOpen" class="lb__list" role="menu" :style="listAt">
              <button
                v-for="m in METRICS"
                :key="m.key"
                role="menuitemradio"
                :aria-checked="metric === m.key"
                @click="chooseMetric(m.key)"
              >
                {{ m.label }}<AppIcon v-if="metric === m.key" name="check" />
              </button>
            </div>
          </div>
          <button class="lb__pick" :aria-label="`Order: ${orderLabel}`" @click="cycleOrder">
            <AppIcon name="arrowRight" class="lb__dir" :class="`lb__dir--${sort}`" />{{ orderLabel }}
          </button>
          <button class="lb__pick lb__friends" :aria-pressed="sort === 'friends'" @click="toggleFriends">
            <AppIcon name="users" />Friends<PerkTag />
          </button>
          <button v-if="activeFilters" class="lb__clear" @click="clearAll">Clear</button>
          <div class="seg lb__view" role="group" aria-label="View">
            <button :aria-pressed="!grid" aria-label="Rows" @click="grid = false"><AppIcon name="rows" /></button>
            <button :aria-pressed="grid" aria-label="Grid" @click="grid = true"><AppIcon name="grid" /></button>
          </div>
        </div>
      </section>

      <PerkCard v-if="friendsLocked" class="lb__perk" title="See where you rank among your friends">
        A ladder of just you and the people you play with. Showing the full ladder for now.
      </PerkCard>
      <div v-if="error" role="alert" class="alert">
        <p>We could not load the leaderboard.</p>
        <button class="btn btn--small" @click="refresh">Try again</button>
      </div>
      <div v-else-if="pending" class="skeleton lb__skeleton" aria-label="Loading leaderboard" aria-busy="true" />
      <div v-else-if="!rows.length && activeFilters" class="empty">
        <h2>No players match.</h2>
        <p>Try a different name or reset your filters.</p>
        <button class="btn" @click="clearAll">Clear filters</button>
      </div>
      <div v-else-if="!rows.length" class="empty">
        <h2>No ranked players yet</h2>
        <p>Play your first ranked rounds to enter the leaderboard.</p>
        <NuxtLink class="btn btn--brand" to="/play">Start playing</NuxtLink>
      </div>
      <div v-else-if="grid" class="lb__grid">
        <NuxtLink
          v-for="(p, i) in rest"
          :key="p.discordId || p.rank"
          :to="`/player/${p.discordId}`"
          class="rig reveal-up"
          :class="[tierClass(p[track].tier.name), { you: isYou(p) }]"
          :style="{ '--i': Math.min(i, 12) }"
        >
          <span class="rig__rank">#{{ p.rank }}</span>
          <img class="rig__badge" :src="rankBadge(p[track].tier.name)" alt="" width="44" height="44" loading="lazy" />
          <ClientOnly>
            <GorillaPortrait
              class="rig__fig"
              :pose="poseFor(p)"
              :color="p.color"
              :tier="tierKey(p)"
              :cosmetics="p.cosmetics || []"
            />
            <template #fallback><span class="rig__fig" /></template>
          </ClientOnly>
          <div class="rig__body">
            <strong class="rig__name">{{ p.name }}</strong>
            <span class="rig__tier">{{ p[track].tier.name }}</span>
            <div class="rig__stats">
              <span
                ><b>{{ metricValue(p) }}</b
                >{{ metricLabel }}</span
              >
              <span
                ><b>{{ facts[0].read(p[track]) }}</b
                >{{ facts[0].label }}</span
              >
            </div>
          </div>
        </NuxtLink>
      </div>
      <div v-else class="lb__table">
        <div class="lb__head">
          <span>#</span><span>Player</span><span>Division</span>
          <button class="lb__sort" @click="sortBy(facts[0].key)">{{ facts[0].label }}</button>
          <button class="lb__sort on" @click="sortBy(metric)">
            {{ metricLabel }}<AppIcon name="arrowRight" class="lb__dir" :class="`lb__dir--${sort}`" />
          </button>
        </div>
        <NuxtLink
          v-for="p in rest"
          :key="p.discordId || p.rank"
          :to="`/player/${p.discordId}`"
          class="lb__row"
          :class="[tierClass(p[track].tier.name), { you: isYou(p) }]"
        >
          <span class="lb__rank">{{ p.rank }}</span>
          <span class="lb__who">
            <PlayerAvatar
              :name="p.name"
              :src="p.avatar || p.discord?.avatar || ''"
              :discord-id="p.discordId || ''"
              :size="40"
            />
            <span>
              <strong>{{ p.name }}<span v-if="isYou(p)" class="chip chip--brand">You</span></strong>
              <small>
                {{ num(p[track].rounds) }} rounds / {{ clock(p[track].survivalSeconds) }} survived /
                {{ num(p[track].tags) }} tags
              </small>
            </span>
          </span>
          <span class="lb__div">
            <img :src="rankBadge(p[track].tier.name)" alt="" width="36" height="36" loading="lazy" />
            <span
              >{{ p[track].tier.name }}<small>{{ p[track].tier.category }}</small></span
            >
          </span>
          <span class="lb__fact">
            {{ facts[0].read(p[track]) }}<small>{{ facts[1].read(p[track]) }} {{ facts[1].unit }}</small>
          </span>
          <strong class="lb__value">{{ metricValue(p) }}</strong>
        </NuxtLink>
      </div>
      <div v-if="rows.length" class="lb__foot">
        <PagerNav v-if="pages > 1" :page="page" :pages="pages" @go="goTo" />
        <div class="lb__per">
          <span class="meta">Per page</span>
          <div class="seg" role="group" aria-label="Per page">
            <button v-for="n in PER_PAGE" :key="n" :aria-pressed="per === n" @click="setPer(n)">{{ n }}</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.lb__podium {
  display: block;
  margin: -24px 0 40px;
}
.lb__tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.lb__search {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 56px;
  padding: 0 8px 0 18px;
  border-radius: var(--r-lg);
  border: 1px solid var(--line-2);
  background: var(--panel);
  transition: border-color 0.2s;
}
.lb__search:focus-within {
  border-color: var(--brand);
}
.lb__search svg {
  width: 18px;
  height: 18px;
  flex: none;
  color: var(--dim);
}
.lb__search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  font-size: 16px;
  outline: 0;
}
.lb__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.lb__brackets,
.lb__view,
.lb__pick,
.lb__clear {
  flex: none;
}
.lb__view {
  margin-left: auto;
}
.lb__menu {
  position: relative;
  flex: none;
}
.lb__pick {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 14px;
  border-radius: var(--r);
  border: 0;
  background: var(--raise);
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.2s;
}
.lb__pick:hover,
.lb__pick[aria-expanded='true'] {
  background: var(--raise-2);
}
.lb__pick .meta {
  font-size: 13px;
  font-weight: 500;
}
.lb__pick svg {
  width: 15px;
  height: 15px;
  color: var(--dim);
}
.lb__friends[aria-pressed='true'] {
  background: var(--ink);
  color: #111;
}
.lb__dir {
  transition: transform 0.3s var(--ease);
}
.lb__dir--desc {
  transform: rotate(90deg);
}
.lb__dir--asc {
  transform: rotate(-90deg);
}
.lb__dir--relevance,
.lb__dir--friends {
  opacity: 0.4;
  transform: rotate(90deg);
}
.lb__shade {
  position: fixed;
  inset: 0;
  z-index: 20;
}
.lb__list {
  position: fixed;
  z-index: 21;
  display: grid;
  min-width: 200px;
  padding: 6px;
  border-radius: var(--r);
  border: 1px solid var(--line-2);
  background: var(--panel-solid);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
}
.lb__list button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--r-sm);
  background: none;
  color: var(--text);
  font-size: 14px;
  text-align: left;
}
.lb__list button:hover,
.lb__list button[aria-checked='true'] {
  background: var(--raise);
  color: var(--ink);
}
.lb__list svg {
  width: 15px;
  height: 15px;
  color: var(--brand);
}
.lb__clear {
  padding: 0 6px;
  border: 0;
  background: none;
  color: var(--brand);
  font-size: 13px;
  font-weight: 600;
}
.lb__perk {
  margin-bottom: 20px;
}
.lb__sort {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--dim);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
}
.lb__sort:hover,
.lb__sort.on {
  color: var(--ink);
}
.lb__sort svg {
  width: 12px;
  height: 12px;
}
.lb__skeleton {
  height: 480px;
}
.lb__table {
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--panel);
  overflow: hidden;
}
.lb__head,
.lb__row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 200px 140px 120px;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
}
.lb__head {
  min-height: 44px;
  color: var(--dim);
  font-size: 12px;
  font-weight: 600;
}
.lb__head span:nth-child(n + 4) {
  text-align: right;
}
.lb__row {
  min-height: 76px;
  border-top: 1px solid var(--line);
  transition: background 0.2s;
}
.lb__row:hover {
  background: var(--raise);
}
.lb__row.you {
  background: color-mix(in srgb, var(--brand) 9%, transparent);
  box-shadow: inset 3px 0 0 var(--brand);
}
.lb__rank {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.lb__who {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.lb__who > span {
  display: grid;
  min-width: 0;
}
.lb__who strong {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lb__who small,
.lb__div small,
.lb__fact small {
  display: block;
  color: var(--dim);
  font-size: 12px;
}
.lb__who small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lb__div {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--tier);
  font-weight: 700;
}
.lb__div img,
.rig__badge {
  image-rendering: pixelated;
}
.lb__fact {
  color: var(--ink);
  text-align: right;
}
.lb__value {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 800;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.lb__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
.rig {
  position: relative;
  display: grid;
  overflow: hidden;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: radial-gradient(90% 60% at 50% 30%, color-mix(in srgb, var(--tier) 22%, transparent), transparent 70%),
    var(--panel);
  transition:
    transform 0.3s var(--ease),
    border-color 0.3s;
}
.rig:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--tier) 45%, transparent);
}
.rig.you {
  border-color: var(--brand);
}
.rig__rank {
  position: absolute;
  top: 14px;
  left: 16px;
  z-index: 1;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
}
.rig__badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
}
.rig__fig {
  display: block;
  width: 78%;
  margin: 18px auto -6px;
  aspect-ratio: 320 / 400;
}
.rig__body {
  display: grid;
  gap: 2px;
  padding: 14px 16px 16px;
  border-top: 1px solid var(--line);
  background: rgba(11, 11, 13, 0.55);
}
.rig__name {
  overflow: hidden;
  color: var(--ink);
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rig__tier {
  color: var(--tier);
  font-size: 13px;
  font-weight: 700;
}
.rig__stats {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  color: var(--dim);
  font-size: 11px;
}
.rig__stats span {
  display: grid;
}
.rig__stats span + span {
  text-align: right;
}
.rig__stats b {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
}
.lb__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 28px;
}
.lb__per {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
@media (max-width: 960px) {
  .lb__head,
  .lb__row {
    grid-template-columns: 44px minmax(0, 1fr) auto;
    padding: 0 16px;
  }
  .lb__head > :nth-child(3),
  .lb__head > :nth-child(4),
  .lb__row .lb__div,
  .lb__row .lb__fact {
    display: none;
  }
  .lb__rank,
  .lb__value {
    font-size: 20px;
  }
  .lb__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
