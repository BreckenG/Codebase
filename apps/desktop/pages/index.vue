<script setup>
import { RANKED_SLOTS } from '@ranked-world/ranks';
const { me } = useMe();
const { data, pending, error, refresh } = await useApiFetch('/api/me/player', {
  key: 'launcher-player',
  default: () => ({ player: null }),
});
const {
  data: rooms,
  pending: loadingCodes,
  error: codeError,
  refresh: refreshCodes,
} = await useApiFetch('/api/codes', { key: 'launcher-codes', default: () => ({ codes: [] }) });
const lastPlayer = shallowRef(null),
  lastCodes = shallowRef([]);
watch(
  () => data.value?.player,
  (p) => {
    if (p) lastPlayer.value = p;
  },
  { immediate: true },
);
watch(
  () => rooms.value?.codes,
  (c) => {
    if (c && !codeError.value) lastCodes.value = c;
  },
  { immediate: true },
);
const player = computed(() => data.value?.player || (error.value ? lastPlayer.value : null)),
  linked = computed(() => Boolean(player.value?.linked));
const mode = ref('ranked'),
  track = computed(() => player.value?.[mode.value]);
const codes = computed(() => ((codeError.value ? lastCodes.value : rooms.value?.codes) || []).filter((c) => c.active));
const rounds = computed(() =>
  (player.value?.matches || []).filter((m) => (m.track || 'ranked') === mode.value).slice(0, 6),
);
const series = computed(() =>
  (player.value?.matches || [])
    .filter((m) => (m.track || 'ranked') === mode.value && Number.isFinite(m.afterElo))
    .reverse(),
);
const trend = computed(() => {
  const s = series.value;
  if (s.length < 2) return null;
  const vals = [s[0].afterElo - (s[0].delta || 0), ...s.map((m) => m.afterElo)];
  const lo = Math.min(...vals),
    hi = Math.max(...vals),
    span = Math.max(1, hi - lo);
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * 600, 104 - ((v - lo) / span) * 88]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return {
    line,
    area: line + ' L600 120 L0 120 Z',
    change: vals[vals.length - 1] - vals[0],
    count: s.length,
    end: pts[pts.length - 1],
  };
});
const KEY = 'rw-launcher-seen';
const since = ref(null),
  rankUp = ref(null);
let base = null;
function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}
function save(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
}
watch(
  player,
  (p) => {
    if (!import.meta.client || !p?.linked || !p.ranked) return;
    const r = p.ranked,
      now = {
        id: p.discordId || p.photonId,
        elo: r.elo,
        rounds: r.rounds,
        wins: r.wins,
        peak: r.peakElo,
        index: r.tier?.index ?? 0,
      };
    const prev = read();
    if (!base) base = prev && prev.id === now.id ? prev : now;
    if (base.id === now.id) {
      const played = now.rounds - base.rounds;
      since.value =
        played > 0
          ? { elo: now.elo - base.elo, rounds: played, wins: now.wins - base.wins, best: now.elo > base.peak }
          : null;
    }
    if (prev && prev.id === now.id && now.index > prev.index) rankUp.value = { tier: r.tier, gain: now.elo - base.elo };
    save(now);
  },
  { immediate: true },
);
const desktop = useDesktop();
const { toast } = useToast();
const { data: social, refresh: refreshFriends } = await useApiFetch('/api/me/friends', {
  key: 'launcher-friends',
  default: () => ({ friends: [] }),
});
const { data: partyData, refresh: refreshParty } = await useApiFetch('/api/me/party', {
  key: 'launcher-party',
  default: () => null,
});
const friends = computed(() => social.value?.friends || []),
  online = computed(() => friends.value.filter((f) => f.online).length);
const party = computed(() => partyData.value?.party),
  match = computed(() => partyData.value?.match),
  queued = computed(() => Boolean(party.value?.queuedAt));
const partyBusy = ref(false);
async function partySend(action) {
  if (partyBusy.value) return;
  partyBusy.value = true;
  try {
    await apiPost('/api/me/party', { action });
    await refreshParty();
  } catch (e) {
    toast(e?.data?.statusMessage || 'That did not go through. Try again.', 'bad');
  } finally {
    partyBusy.value = false;
  }
}
const place = (n) => {
  const k = n + 1,
    t = k % 100;
  return k + (t > 10 && t < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][k % 10] || 'th');
};
const SESSION = 'rw-launcher-session';
const ended = ref(null);
function session() {
  try {
    return JSON.parse(localStorage.getItem(SESSION) || 'null');
  } catch {
    return null;
  }
}
watch(
  () => [desktop.status.value?.gameRunning, player.value?.ranked?.rounds],
  ([running]) => {
    const p = player.value;
    if (!import.meta.client || running == null || !p?.linked || !p.ranked) return;
    const cur = session();
    if (running && !cur) {
      try {
        localStorage.setItem(
          SESSION,
          JSON.stringify({ at: Date.now(), rounds: p.ranked.rounds, elo: p.ranked.elo, wins: p.ranked.wins }),
        );
      } catch {}
      ended.value = null;
    }
    if (!running && cur) {
      ended.value = { ...cur, until: Date.now() };
      try {
        localStorage.removeItem(SESSION);
      } catch {}
    }
  },
  { immediate: true },
);
const recap = computed(() => {
  const e = ended.value,
    p = player.value;
  if (!e || !p?.ranked) return null;
  const played = p.ranked.rounds - e.rounds;
  if (played <= 0) return null;
  const list = (p.matches || []).filter((m) => (m.track || 'ranked') === 'ranked' && new Date(m.at).getTime() >= e.at);
  const best = list.length ? Math.min(...list.map((m) => m.placement ?? 99)) : null;
  return {
    rounds: played,
    elo: p.ranked.elo - e.elo,
    wins: p.ranked.wins - e.wins,
    minutes: Math.max(1, Math.round((e.until - e.at) / 60000)),
    best: best == null || best === 99 ? null : place(best),
    tags: list.reduce((n, m) => n + (m.tags || 0), 0),
  };
});
watch(rankUp, (r) => {
  if (r)
    desktop.notify({
      kind: 'rank',
      title: r.tier.name,
      body: 'You ranked up',
      detail: r.tier.isTop ? '' : r.tier.eloToNext + ' MMR to the next division',
    });
});
watch(
  () => match.value?.code,
  (code) => {
    if (code) desktop.notify({ kind: 'info', title: 'Scrim ready', body: 'Your match is in ' + code });
  },
);
let wasOn = null;
watch(friends, (list) => {
  const on = new Set(list.filter((f) => f.online).map((f) => f.discordId));
  if (wasOn)
    for (const f of list)
      if (f.online && !wasOn.has(f.discordId)) {
        toast(f.name + ' is in a ' + f.category + ' room');
        desktop.notify({ kind: 'info', title: f.name + ' is on', body: 'In a ' + f.category + ' room' });
      }
  wasOn = on;
});
let seenRounds = null;
watch(
  () => player.value?.ranked?.rounds,
  (n) => {
    if (n == null) return;
    if (seenRounds != null && n > seenRounds) {
      const m = (player.value.matches || []).find((x) => (x.track || 'ranked') === 'ranked'),
        t = player.value.ranked.tier;
      if (m && m.delta != null) {
        const title = signed(m.delta) + ' MMR',
          body =
            (m.placement == null ? 'Round scored' : place(m.placement) + ' of ' + m.lobbySize) +
            (m.code ? ' in ' + m.code : ''),
          detail = t && !t.isTop ? t.eloToNext + ' MMR to the next division' : '';
        toast(title + ', ' + body, m.delta >= 0 ? 'ok' : 'bad');
        desktop.notify({ kind: m.delta >= 0 ? 'up' : 'down', title, body, detail });
      }
    }
    seenRounds = n;
  },
);
const more = [
  { to: '/play?mode=practice', icon: 'target', label: 'Practice' },
  { to: '/play?mode=scrims', icon: 'users', label: 'Party and scrims' },
  { to: '/history?view=replays', icon: 'play', label: 'Replays' },
];
function signed(n) {
  if (n > 0) return `+${num(n)}`;
  return n < 0 ? `-${num(-n)}` : num(0);
}
const partyLine = computed(() => {
  const n = party.value?.members?.length || 1;
  return n === 1 ? 'Solo, you get teammates from the queue' : `${n} in your party`;
});
let poll;
let slow = 0;
onMounted(() => {
  poll = setInterval(() => {
    refresh();
    refreshCodes();
    refreshParty();
    if (++slow % 4 === 0) refreshFriends();
  }, 15000);
});
onBeforeUnmount(() => clearInterval(poll));
useHead({ title: 'Home | Ranked World' });
function tone(delta) {
  if (delta > 0) return 'is-up';
  return delta < 0 ? 'is-down' : '';
}
</script>
<template>
  <main id="main" class="page">
    <div class="wrap home">
      <LauncherHero :player="player" />

      <div v-if="since" class="since panel" role="status">
        <strong>Since last time</strong>
        <span class="chip" :class="since.elo >= 0 ? 'chip--live' : 'since__down'">
          <AppIcon :name="since.elo >= 0 ? 'trophy' : 'activity'" />{{ signed(since.elo) }} MMR
        </span>
        <span class="chip">{{ since.rounds }} round{{ since.rounds === 1 ? '' : 's' }}</span>
        <span v-if="since.wins > 0" class="chip">{{ since.wins }} win{{ since.wins === 1 ? '' : 's' }}</span>
        <span v-if="since.best" class="chip chip--brand"><AppIcon name="trophy" />New best</span>
        <button class="icon-btn since__close" aria-label="Dismiss" @click="since = null"><AppIcon name="x" /></button>
      </div>

      <div class="grid">
        <div class="col">
          <section v-if="recap" class="panel card" role="status">
            <div class="section-head">
              <h2>Session review</h2>
              <button class="btn btn--ghost btn--small" @click="ended = null">Dismiss</button>
            </div>
            <p class="big" :class="recap.elo >= 0 ? 'pos' : 'neg'">{{ signed(recap.elo) }}<small>MMR</small></p>
            <dl class="stats">
              <div class="stat">
                <dt>{{ recap.rounds }}</dt>
                <dd>Rounds</dd>
              </div>
              <div class="stat">
                <dt>{{ recap.wins }}</dt>
                <dd>Wins</dd>
              </div>
              <div class="stat">
                <dt>{{ recap.best || '-' }}</dt>
                <dd>Best finish</dd>
              </div>
              <div class="stat">
                <dt>{{ recap.minutes }}m</dt>
                <dd>Played</dd>
              </div>
            </dl>
          </section>

          <div v-if="error && !player" class="alert" role="alert">
            <p>Could not load your stats.</p>
            <button class="btn btn--small" @click="refresh">Retry</button>
          </div>
          <div v-else-if="pending && !player" class="skeleton" aria-busy="true" role="status" />
          <section v-else-if="!linked" class="panel card">
            <div class="section-head"><h2>Get set up</h2></div>
            <ol class="steps">
              <li :class="me.user ? 'done' : 'now'">
                <span class="steps__mark"><AppIcon v-if="me.user" name="check" /><template v-else>1</template></span>
                Sign in with Discord
              </li>
              <li :class="me.user ? 'now' : ''">
                <span class="steps__mark">2</span>Connect Gorilla Tag
                <NuxtLink v-if="me.user" to="/play" class="btn btn--brand btn--small">Connect</NuxtLink>
              </li>
              <li><span class="steps__mark">3</span>Join a ranked code</li>
            </ol>
          </section>
          <section v-else class="panel card">
            <div class="section-head">
              <div class="seg" role="tablist" aria-label="Track">
                <button
                  v-for="key in ['ranked', 'scrim']"
                  :key="key"
                  role="tab"
                  :aria-selected="mode === key"
                  @click="mode = key"
                >
                  {{ key === 'ranked' ? 'Ranked' : 'Scrims' }}
                </button>
              </div>
              <span v-if="trend" class="meta" :class="trend.change >= 0 ? 'pos' : 'neg'">
                {{ signed(trend.change) }} over {{ trend.count }} rounds
              </span>
            </div>
            <p class="big"><CountUp :value="track?.elo || 0" /><small>MMR</small></p>
            <svg
              v-if="trend"
              :key="mode + trend.line"
              class="chart"
              viewBox="0 0 600 120"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="home-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#ee862a" stop-opacity=".32" />
                  <stop offset="1" stop-color="#ee862a" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path :d="trend.area" fill="url(#home-fill)" />
              <path class="chart__line" :d="trend.line" vector-effect="non-scaling-stroke" />
              <circle class="chart__dot" :cx="trend.end[0]" :cy="trend.end[1]" r="5" />
            </svg>
            <p v-else class="meta">Play a few rounds to see your trend.</p>
            <dl class="stats">
              <div class="stat">
                <dt>{{ track?.winRate ?? 0 }}%</dt>
                <dd>Win rate</dd>
              </div>
              <div class="stat">
                <dt><CountUp :value="track?.rounds || 0" /></dt>
                <dd>Rounds</dd>
              </div>
              <div class="stat">
                <dt><CountUp :value="track?.peakElo || 0" /></dt>
                <dd>Best</dd>
              </div>
              <div class="stat">
                <dt :class="{ hot: (track?.winStreak || 0) >= 2 }">
                  <AppIcon v-if="(track?.winStreak || 0) >= 2" name="flame" />{{ track?.winStreak || 0 }}
                </dt>
                <dd>Streak</dd>
              </div>
            </dl>
          </section>

          <section class="panel card">
            <div class="section-head">
              <h2>Recent rounds</h2>
              <NuxtLink to="/history" class="meta">History -&gt;</NuxtLink>
            </div>
            <ol v-if="rounds.length" class="rows">
              <li v-for="(round, i) in rounds" :key="(round.at || '') + i" class="row reveal-up" :style="{ '--i': i }">
                <span class="place" :class="{ win: round.placement === 0 }">
                  <AppIcon v-if="round.placement === 0" name="crown" />
                  <template v-else>{{ round.placement == null ? '-' : `#${round.placement + 1}` }}</template>
                </span>
                <span class="who">
                  <strong>{{ round.code || (round.category ? `${round.category} code` : 'Round') }}</strong>
                  <small class="meta">{{ round.at ? ago(round.at) : '' }}</small>
                </span>
                <strong class="delta" :class="tone(round.delta)">
                  {{ round.delta == null ? '-' : signed(round.delta) }}
                </strong>
              </li>
            </ol>
            <p v-else class="meta">{{ linked ? 'No rounds yet.' : 'Your rounds show up here.' }}</p>
          </section>
        </div>

        <div class="col">
          <section class="panel card">
            <div class="section-head">
              <h2><span class="live" aria-hidden="true" />Live codes</h2>
              <span v-if="codes.length" class="chip">{{ codes.length }}</span>
            </div>
            <VoiceConsentNotice
              v-if="rooms?.reason === 'voice-consent'"
              :version="rooms.version"
              @accepted="refreshCodes"
            />
            <p v-else-if="loadingCodes && !codes.length" class="meta" role="status">Loading...</p>
            <div v-else-if="codeError && !codes.length" class="alert" role="alert">
              <p>Codes did not load.</p>
              <button class="btn btn--small" @click="refreshCodes">Retry</button>
            </div>
            <ul v-else-if="codes.length" class="codes">
              <li v-for="code in codes.slice(0, 4)" :key="code.code" class="code">
                <div class="code__top">
                  <strong>{{ code.code }}</strong>
                  <span v-if="code.early" class="code__early"><AppIcon name="crown" />Pro early</span>
                  <span v-else class="chip">{{ code.category || rooms.bracket }}</span>
                  <span v-if="(code.count ?? 0) >= RANKED_SLOTS - 2" class="chip chip--brand">Almost full</span>
                </div>
                <span class="code__seats" :aria-label="`${code.count ?? 0} of ${RANKED_SLOTS} players`">
                  <i v-for="n in RANKED_SLOTS" :key="n" :class="{ on: n <= (code.count ?? 0) }" />
                </span>
                <RoomJoinButton :code="code.code" />
              </li>
            </ul>
            <p v-else class="meta">{{ linked ? 'No codes open right now.' : 'Connect your account to see codes.' }}</p>
            <NuxtLink to="/play" class="btn btn--ghost btn--small card__foot"
              >All codes<AppIcon name="arrowRight"
            /></NuxtLink>
          </section>

          <section v-if="linked" class="panel card">
            <div class="section-head">
              <h2>Scrims</h2>
              <NuxtLink to="/play?mode=scrims" class="meta">Party -&gt;</NuxtLink>
            </div>
            <template v-if="match">
              <p class="state">
                <strong>{{ match.code || 'Preparing your room' }}</strong
                ><span class="meta">{{ match.size }} {{ match.state }}</span>
              </p>
              <RoomJoinButton v-if="match.code" :code="match.code" />
            </template>
            <template v-else-if="queued">
              <p class="state">
                <strong>Finding a {{ party.size }}</strong>
                <span class="meta">{{ party.searching || 0 }} of {{ party.need }} players in queue</span>
              </p>
              <button class="btn" :disabled="partyBusy" @click="partySend('cancel')">Leave queue</button>
            </template>
            <template v-else>
              <p class="state">
                <strong>{{ party?.size || '4v4' }} {{ (party?.ruleset || 'gtc').toUpperCase() }}</strong>
                <span class="meta">{{ partyLine }}</span>
              </p>
              <button
                class="btn btn--brand"
                :disabled="partyBusy || (party && !party.youLead)"
                @click="partySend('play')"
              >
                {{ party && !party.youLead ? 'Your leader queues' : 'Queue for a scrim' }}
              </button>
            </template>
            <p v-if="partyData?.error" class="bad" role="alert">{{ partyData.error }}</p>
          </section>

          <section v-if="linked" class="panel card">
            <div class="section-head">
              <h2>Friends</h2>
              <span v-if="online" class="chip chip--live">{{ online }} on</span>
            </div>
            <ul v-if="friends.length" class="rows">
              <li v-for="f in friends.slice(0, 6)" :key="f.discordId" class="row">
                <PlayerAvatar :name="f.name" :src="f.avatar" :discord-id="f.discordId" :size="32" />
                <NuxtLink :to="`/player/${f.discordId}`" class="who">
                  <strong>{{ f.name }}</strong
                  ><small class="meta">{{ f.rank }}</small>
                </NuxtLink>
                <span class="friend" :class="{ on: f.online }">{{
                  f.online ? `In a ${f.category} room` : 'Offline'
                }}</span>
              </li>
            </ul>
            <p v-else class="meta">No friends added yet. Add them from /panel in Discord.</p>
            <NuxtLink
              v-if="friends.length > 6"
              to="/leaderboard?sort=friends"
              class="btn btn--ghost btn--small card__foot"
            >
              All {{ friends.length }} friends
            </NuxtLink>
          </section>

          <nav class="more" aria-label="More">
            <NuxtLink v-for="m in more" :key="m.to" :to="m.to" class="panel more__item">
              <AppIcon :name="m.icon" />{{ m.label }}<AppIcon name="arrowRight" class="more__go" />
            </NuxtLink>
          </nav>
        </div>
      </div>
    </div>
    <ClientOnly>
      <RankUpMoment v-if="rankUp" :tier="rankUp.tier" :gain="rankUp.gain" @close="rankUp = null" />
    </ClientOnly>
  </main>
</template>

<style scoped>
.home {
  display: grid;
  gap: 20px;
}
.since {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 18px;
}
.since strong {
  color: var(--ink);
  font-size: 14px;
}
.since__down {
  background: rgba(255, 92, 124, 0.12);
  color: var(--bad);
}
.since__close {
  margin-left: auto;
}
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.col {
  display: grid;
  gap: 20px;
}
.card {
  display: grid;
  gap: 16px;
}
.card .section-head {
  margin: 0;
}
.card h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
}
.card__foot {
  justify-self: start;
}
.big {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 56px;
  font-weight: 800;
  line-height: 1;
}
.big small {
  color: var(--dim);
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 600;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 0;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
.stats .stat dt {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 24px;
}
.stats .hot {
  color: var(--brand);
}
.stats svg {
  width: 18px;
  height: 18px;
}
.chart {
  display: block;
  width: 100%;
  height: 120px;
  overflow: visible;
}
.chart__line {
  fill: none;
  stroke: var(--brand);
  stroke-width: 2.5;
}
.chart__dot {
  fill: var(--brand);
  stroke: var(--bg);
  stroke-width: 3;
}
.steps {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.steps li {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--dim);
  font-weight: 600;
}
.steps li.now,
.steps li.done {
  color: var(--ink);
}
.steps .btn {
  margin-left: auto;
}
.steps__mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 50%;
  background: var(--raise);
  font-size: 13px;
}
.steps li.now .steps__mark {
  background: var(--brand);
  color: var(--brand-ink);
}
.steps li.done .steps__mark {
  background: rgba(58, 208, 125, 0.16);
  color: var(--good);
}
.steps__mark svg {
  width: 14px;
  height: 14px;
}
.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}
.rows .row {
  padding: 12px 0;
}
.place {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: var(--r);
  background: var(--raise);
  color: var(--ink);
  font-weight: 700;
}
.place.win {
  background: rgba(238, 134, 42, 0.16);
  color: var(--brand);
}
.place svg {
  width: 18px;
  height: 18px;
}
.who {
  display: grid;
  flex: 1;
  min-width: 0;
}
.who strong {
  overflow: hidden;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.delta {
  font-family: var(--font-display);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}
.delta.is-up {
  color: var(--good);
}
.delta.is-down {
  color: var(--bad);
}
.live {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--good);
  box-shadow: 0 0 0 4px rgba(58, 208, 125, 0.18);
}
.codes {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.code {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--raise);
}
.code__top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.code__top strong {
  margin-right: auto;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}
.code__early {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pro) 16%, transparent);
  color: var(--pro);
  font-size: 12px;
  font-weight: 700;
}
.code__early svg {
  width: 13px;
  height: 13px;
}
.code__seats {
  display: flex;
  gap: 4px;
}
.code__seats i {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--raise-2);
}
.code__seats i.on {
  background: var(--good);
}
.state {
  display: grid;
  gap: 2px;
}
.state strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 24px;
}
.friend {
  color: var(--dim);
  font-size: 12px;
  white-space: nowrap;
}
.friend.on {
  color: var(--good);
}
.more {
  display: grid;
  gap: 10px;
}
.more__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  color: var(--ink);
  font-weight: 600;
  transition:
    transform 0.25s var(--ease),
    border-color 0.25s;
}
.more__item:hover {
  transform: translateY(-2px);
  border-color: var(--line-2);
}
.more__item svg {
  width: 18px;
  height: 18px;
  color: var(--brand);
}
.more__go {
  margin-left: auto;
  color: var(--dim) !important;
}
@media (max-width: 1000px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
