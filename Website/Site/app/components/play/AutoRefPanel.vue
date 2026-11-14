<script setup>
const { toast } = useToast();
const { data, refresh, error } = useApiFetch('/api/me/autoref', { key: 'me-autoref', server: false, default: () => null });
const code = ref('');
const region = ref('us');
const ruleset = ref('gtc');
const size = ref('4v4');
const busy = ref(false);
const picks = ref({});
const open = ref('');
const STEPS = ['Send the ref', 'Get players in', 'Pick teams', 'Play'];
const REGIONS = [
  { value: 'us', label: 'US East' },
  { value: 'usw', label: 'US West' },
  { value: 'eu', label: 'Europe' },
];
const MODES = [
  { value: 'gtc', label: 'GTC' },
  { value: 'cgt', label: 'CGT' },
];
const SIZES = ['2v2', '3v3', '4v4', '5v5'];
const PHASES = {
  starting: 'Joining your room',
  waiting_host: 'Taking over the room',
  no_master: 'Could not get in, use a new code',
  waiting_infection: 'Setting up',
  voice_connecting: 'Setting up',
  lobby: 'Waiting for teams',
  setup: 'Getting ready',
  countdown: 'Starting',
  round: 'Round live',
  break: 'Break',
  finished: 'Finished',
  voided: 'Voided',
  stopped: 'Stopped',
};
const d = computed(() => data.value || {});
const s = computed(() => d.value.session || null);
const last = computed(() => d.value.last || null);
const history = computed(() => d.value.history || []);
const n = computed(() => Number(String(s.value?.size || size.value)[0]) || 4);
const lobby = computed(() => s.value?.state === 'live' && s.value.phase === 'lobby');
const roster = computed(() => s.value?.roster || []);
const team = (t) => roster.value.filter((p) => picks.value[p.id] === t);
const step = computed(() => {
  if (!s.value) return 0;
  if (s.value.teamsAt) return 3;
  return lobby.value && roster.value.length >= n.value * 2 ? 2 : 1;
});
const blocker = computed(() => {
  if (!s.value?.ownerHere) return `Join ${s.value?.code} first.`;
  for (const t of [1, 2]) {
    const need = n.value - team(t).length;
    if (need > 0) return `Team ${t} needs ${need} more`;
  }
  return '';
});
const allowance = computed(() => {
  if (!d.value.allowed) return '';
  if (d.value.perDay !== null) return `${d.value.left ?? 0} of ${d.value.perDay} left today`;
  if (d.value.perWeek !== null) return `${d.value.left ?? 0} of ${d.value.perWeek} left this week`;
  return '';
});
const outOf = computed(() =>
  d.value.perDay !== null
    ? 'None left. Resets at midnight UTC.'
    : 'None left. Resets Monday.',
);
const clock = (sec) => `${Math.floor((sec || 0) / 60)}:${String(Math.floor(sec || 0) % 60).padStart(2, '0')}`;
const runtime = (ms) => clock(Math.round((ms || 0) / 1000));
const when = (v) =>
  v ? new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const tint = (c) => {
  const v = String(c || '').split('-').map(Number);
  if (v.length !== 3 || v.some((x) => !Number.isFinite(x))) return undefined;
  return `rgb(${v.map((x) => Math.round((Math.min(9, Math.max(0, x)) / 9) * 255)).join(',')})`;
};
const names = (m, t) => (t === 1 ? m.names1 : m.names2) || [];
const statsFor = (m, t) => (m.result?.players || []).filter((p) => p.team === t).sort((a, b) => b.runtimeMs - a.runtimeMs);
const verdict = (m) => {
  if (m.result?.voided) return 'Voided';
  return m.result ? `Team ${m.result.winner} won` : 'Ended early';
};
const headline = (m) => {
  if (m.result && !m.result.voided) return `Team ${m.result.winner} won ${m.points[0]} - ${m.points[1]}`;
  if (m.result?.voided) return 'Voided';
  return `Ended at ${m.points[0]} - ${m.points[1]}`;
};
watch(ruleset, (r) => {
  if (r === 'cgt') size.value = '4v4';
});
watch(
  () => s.value?.matchId,
  () => {
    const next = {};
    for (const id of s.value?.team1 || []) next[id] = 1;
    for (const id of s.value?.team2 || []) next[id] = 2;
    picks.value = next;
  },
  { immediate: true },
);
watch(
  () => d.value.error,
  (e) => e && toast(e),
);
function pick(id, t) {
  if (picks.value[id] === t) return (picks.value = { ...picks.value, [id]: 0 });
  if (team(t).length >= n.value) return toast(`Team ${t} is full. Take someone off first.`);
  picks.value = { ...picks.value, [id]: t };
}
async function send(type, extra = {}) {
  if (busy.value) return;
  busy.value = true;
  try {
    const body =
      type === 'spawn'
        ? { type, code: code.value, region: d.value.pickRegion ? region.value : 'usw', ruleset: ruleset.value, size: size.value }
        : { type, matchId: s.value.matchId, ...extra };
    await apiFetch('/api/me/autoref', { method: 'POST', body });
    if (type === 'spawn') code.value = '';
    setTimeout(() => refresh().catch(() => null), 2000);
  } catch (e) {
    toast(e?.data?.statusMessage || 'That did not go through. Try again.');
  } finally {
    busy.value = false;
  }
}
function stop() {
  if (window.confirm(`Stop the ref in ${s.value.code}?`)) send('stop');
}
const start = () => send('start', { team1: team(1).map((p) => p.id), team2: team(2).map((p) => p.id) });
let timer;
let tick = 0;
onMounted(() => {
  timer = setInterval(() => {
    tick++;
    if (document.hidden) return;
    if (s.value || d.value.pending || tick % 5 === 0) refresh().catch(() => null);
  }, 3000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section class="ar" aria-labelledby="ar-heading">
    <div class="section-head">
      <h2 id="ar-heading">{{ d.allowed === false ? 'Plus and Pro' : 'Your ref' }}</h2>
      <span v-if="allowance" class="chip" :class="{ 'chip--live': s }"
        ><span v-if="s" class="dot" />{{ allowance }}</span
      >
    </div>

    <div v-if="error && !data" class="alert" role="alert">
      <p>Could not load Auto Ref.</p>
      <button class="btn btn--small" @click="refresh">Try again</button>
    </div>

    <div v-else-if="!data" class="skeleton" role="status" aria-label="Loading" />

    <div v-else-if="!d.allowed" class="panel ar__locked">
      <h3>A ref for your own private matches</h3>
      <ul class="ar__perks">
        <li><AppIcon name="check" /><span><b>Plus</b> 3 matches a week on US West</span></li>
        <li><AppIcon name="check" /><span><b>Pro</b> 2 matches a day, any region</span></li>
        <li><AppIcon name="check" /><span>2v2 to 5v5, GTC or CGT, you pick the teams</span></li>
      </ul>
      <NuxtLink class="btn btn--brand" to="/subscribe"><AppIcon name="crown" />See plans</NuxtLink>
    </div>

    <template v-else>
      <div class="panel ar__rail"><StepRail :steps="STEPS" :at="step" label="Auto Ref progress" /></div>

      <div v-if="!s && last" class="panel ar__result reveal-up" role="status">
        <span class="chip" :class="{ 'chip--live': last.result && !last.result.voided }">{{
          last.result ? 'Match over' : 'Ref left'
        }}</span>
        <h3>{{ last.result ? headline(last) : `Your ref left ${last.code}` }}</h3>
        <p v-if="last.error" class="meta">{{ last.error }}</p>
        <div v-if="last.result?.players?.length" class="ar__board">
          <div v-for="t in [1, 2]" :key="t" class="ar__side" :class="{ win: last.result.winner === t }">
            <strong>Team {{ t }} <span class="meta">{{ last.points[t - 1] }}</span></strong>
            <div v-for="p in statsFor(last, t)" :key="p.name" class="ar__stat">
              <span>{{ p.name }}</span
              ><span class="meta">{{ p.tags }} tags / {{ runtime(p.runtimeMs) }} run</span>
            </div>
          </div>
        </div>
      </div>

      <form v-if="!s" class="panel ar__form" @submit.prevent="send('spawn')">
        <div class="ar__field">
          <label for="ar-code" class="ar__label"><span class="ar__num">1</span>Room code</label>
          <input
            id="ar-code"
            v-model="code"
            class="ar__code"
            required
            maxlength="12"
            pattern="[A-Za-z0-9]{1,12}"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            placeholder="CODE"
          />
          <p class="meta ar__hint">Use a brand new code nobody is in yet. Send the ref first, then everyone joins.</p>
        </div>
        <div class="ar__row">
          <div class="ar__field">
            <span class="ar__label"><span class="ar__num">2</span>Mode</span>
            <div class="seg">
              <button
                v-for="m in MODES"
                :key="m.value"
                type="button"
                :aria-pressed="ruleset === m.value"
                @click="ruleset = m.value"
              >
                {{ m.label }}
              </button>
            </div>
          </div>
          <div class="ar__field">
            <span class="ar__label"><span class="ar__num">3</span>Players</span>
            <div class="seg">
              <button
                v-for="z in SIZES"
                :key="z"
                type="button"
                :aria-pressed="size === z"
                :disabled="ruleset === 'cgt' && z !== '4v4'"
                @click="size = z"
              >
                {{ z }}
              </button>
            </div>
          </div>
          <div class="ar__field">
            <span class="ar__label"><span class="ar__num">4</span>Region</span>
            <div v-if="d.pickRegion" class="seg">
              <button
                v-for="r in REGIONS"
                :key="r.value"
                type="button"
                :aria-pressed="region === r.value"
                @click="region = r.value"
              >
                {{ r.label }}
              </button>
            </div>
            <div v-else class="ar__fixed">
              <span class="seg"><button type="button" aria-pressed="true" disabled>US West</button></span>
              <span class="meta"><AppIcon name="crown" />More with Pro</span>
            </div>
          </div>
        </div>
        <div class="go-row">
          <button
            class="btn btn--brand btn--large"
            :disabled="busy || d.pending || !code.trim() || d.left === 0"
          >
            <AppIcon name="play" />{{ busy || d.pending ? 'Sending...' : 'Send ref' }}
          </button>
          <span v-if="d.left === 0" class="meta">{{ outOf }}</span>
        </div>
      </form>

      <div v-else class="panel live ar__live">
        <div class="ar__top">
          <span class="chip" :class="{ 'chip--live': s.state === 'live' }"
            ><span class="dot" />{{ PHASES[s.phase] || 'Working' }}</span
          >
          <span class="meta">{{ s.ruleset.toUpperCase() }} {{ s.size }}</span>
        </div>
        <h3 class="live__code">{{ s.code }}</h3>
        <RoomJoinButton :code="s.code" />

        <template v-if="step < 3 && !lobby">
          <OpeningBar :since="s.startedAt" />
        </template>

        <template v-else-if="lobby">
          <div class="ar__teams">
            <div v-for="t in [1, 2]" :key="t" class="ar__team">
              <strong>Team {{ t }}</strong>
              <button
                v-for="p in team(t)"
                :key="p.id"
                type="button"
                class="ar__slot on"
                :aria-label="`Take ${p.name} off Team ${t}`"
                @click="pick(p.id, t)"
              >
                <i class="ar__dot" :style="{ background: tint(p.color) }" />{{ p.name }}<AppIcon name="x" />
              </button>
              <span v-for="i in Math.max(0, n - team(t).length)" :key="`e${i}`" class="ar__slot">Open spot</span>
            </div>
          </div>
          <div class="go-row">
            <button class="btn btn--brand btn--large" :disabled="busy || d.pending || !!blocker" @click="start">
              <AppIcon name="play" />Start match
            </button>
            <span class="meta" :class="{ bad: blocker && !s.ownerHere }">{{ blocker }}</span>
          </div>
          <div class="ar__room">
            <span class="ar__label">In the room ({{ roster.length }})</span>
            <p v-if="!roster.length" class="meta">Nobody yet</p>
            <div class="rows">
              <div v-for="p in roster" :key="p.id" class="row ar__player">
                <i class="ar__dot" :style="{ background: tint(p.color) }" />
                <strong class="ar__name">{{ p.name }}</strong>
                <span v-if="p.you" class="chip">You</span>
                <div class="seg">
                  <button type="button" :aria-pressed="picks[p.id] === 1" @click="pick(p.id, 1)">Team 1</button
                  ><button type="button" :aria-pressed="picks[p.id] === 2" @click="pick(p.id, 2)">Team 2</button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="ar__score">
            <div class="ar__side">
              <span class="ar__pts">{{ s.points[0] }}</span>
              <strong>Team 1</strong>
              <span class="meta">{{ names(s, 1).join(', ') }}</span>
            </div>
            <div class="ar__clock">
              <span class="ar__pts">{{ s.ruleset === 'cgt' ? 'to 5' : clock(s.remainingSeconds) }}</span>
              <span class="meta">{{ s.overtime ? 'Overtime' : s.ruleset === 'cgt' ? 'First to 5' : 'Time left' }}</span>
            </div>
            <div class="ar__side">
              <span class="ar__pts">{{ s.points[1] }}</span>
              <strong>Team 2</strong>
              <span class="meta">{{ names(s, 2).join(', ') }}</span>
            </div>
          </div>
          <div v-if="s.phase === 'setup'" class="go-row">
            <button class="btn" :disabled="busy || s.breaks[0]" @click="send('break', { team: 1 })">
              Team 1 break
            </button>
            <button class="btn" :disabled="busy || s.breaks[1]" @click="send('break', { team: 2 })">
              Team 2 break
            </button>
            <button class="btn btn--ghost" :disabled="busy" @click="send('ready')">Start round now</button>
          </div>
          <div v-if="s.phase === 'break'" class="go-row">
            <button class="btn btn--brand" :disabled="busy" @click="send('resume')">End break</button>
          </div>
        </template>

        <ul v-if="s.log.length" class="ar__log" aria-label="What the ref said">
          <li v-for="(line, i) in s.log" :key="i">{{ line }}</li>
        </ul>
        <button class="btn btn--ghost" :disabled="busy" @click="stop"><AppIcon name="x" />Stop ref</button>
      </div>

      <div class="section-head ar__histhead">
        <h2>Match history</h2>
      </div>
      <div v-if="!history.length" class="empty">
        <h3>No matches yet</h3>
      </div>
      <div v-else class="rows panel panel--flush">
        <div v-for="m in history" :key="m.matchId" class="ar__hist">
          <button
            type="button"
            class="row ar__histrow"
            :aria-expanded="open === m.matchId"
            @click="open = open === m.matchId ? '' : m.matchId"
          >
            <span class="ar__histscore">{{ m.points[0] }} - {{ m.points[1] }}</span>
            <span class="ar__histmain">
              <strong>{{ verdict(m) }}</strong>
              <span class="meta">{{ m.ruleset.toUpperCase() }} {{ m.size }} / {{ m.code }} / {{ when(m.teamsAt) }}</span>
            </span>
            <AppIcon name="chevron" class="ar__chev" />
          </button>
          <div v-if="open === m.matchId" class="ar__board ar__detail">
            <div v-for="t in [1, 2]" :key="t" class="ar__side" :class="{ win: m.result?.winner === t }">
              <strong>Team {{ t }}</strong>
              <template v-if="statsFor(m, t).length">
                <div v-for="p in statsFor(m, t)" :key="p.name" class="ar__stat">
                  <span>{{ p.name }}<span v-if="p.leftEarly" class="meta"> (left)</span></span
                  ><span class="meta">{{ p.tags }} tags / {{ runtime(p.runtimeMs) }} run</span>
                </div>
              </template>
              <span v-else class="meta">{{ names(m, t).join(', ') || 'No stats' }}</span>
            </div>
            <p v-if="m.error" class="meta">{{ m.error }}</p>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.ar {
  display: grid;
  gap: 16px;
}
.ar .section-head {
  margin-bottom: 0;
}
.ar__histhead {
  margin-top: 24px;
}
.ar__rail {
  padding: 18px 24px;
}
.ar__locked,
.ar__form,
.ar__result {
  display: grid;
  gap: 22px;
  justify-items: start;
}
.ar__result {
  gap: 12px;
}
.ar__locked h3 {
  font-size: 26px;
}
.ar__perks {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ar__perks li {
  display: flex;
  gap: 10px;
  align-items: center;
}
.ar__perks b {
  color: var(--ink);
}
.ar__perks svg {
  width: 16px;
  height: 16px;
  color: var(--good);
}
.ar__field {
  display: grid;
  gap: 10px;
  min-width: 0;
}
.ar__label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  font-weight: 700;
}
.ar__num {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(238, 134, 42, 0.14);
  color: var(--brand);
  font-size: 13px;
}
.ar__field > .meta {
  margin: -4px 0 0;
}
.ar__hint {
  margin: 6px 0 0;
}
.ar__code {
  width: min(100%, 420px);
  padding: 14px 18px;
  border: 1px solid var(--line-2);
  border-radius: var(--r);
  background: var(--raise);
  color: var(--ink);
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  outline: 0;
  transition: border-color 0.2s;
}
.ar__code:focus {
  border-color: var(--brand);
}
.ar__code::placeholder {
  color: var(--dim);
  opacity: 0.5;
}
.ar__row {
  display: flex;
  flex-wrap: wrap;
  gap: 22px 32px;
}
.seg {
  max-width: 100%;
  overflow-x: auto;
}
.seg > button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.ar__fixed {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.ar__fixed .meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ar__fixed svg {
  width: 14px;
  height: 14px;
  color: var(--brand);
}
.ar__fixed .seg > button:disabled {
  opacity: 1;
  cursor: default;
}
.ar__live {
  gap: 16px;
}
.ar__top {
  display: flex;
  gap: 12px;
  align-items: center;
}
.ar__teams {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
}
.ar__team {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 14px;
  border-radius: var(--r);
  background: var(--raise);
}
.ar__slot {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px dashed var(--line-2);
  border-radius: var(--r-sm);
  background: none;
  color: var(--dim);
  font-size: 14px;
  text-align: left;
}
.ar__slot.on {
  border-style: solid;
  border-color: var(--line);
  background: var(--raise-2);
  color: var(--ink);
  font-weight: 600;
  cursor: pointer;
}
.ar__slot svg {
  width: 14px;
  height: 14px;
  margin-left: auto;
  color: var(--dim);
}
.ar__room {
  display: grid;
  gap: 10px;
  width: 100%;
}
.ar__player {
  gap: 12px;
  padding: 8px 4px;
}
.ar__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ar__player .seg {
  margin-left: auto;
  flex: none;
}
.ar__dot {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--raise-2);
}
.ar__score {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  width: 100%;
  align-items: start;
}
.ar__side,
.ar__clock {
  display: grid;
  gap: 4px;
  justify-items: center;
  text-align: center;
  min-width: 0;
}
.ar__pts {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 800;
  line-height: 1;
}
.ar__clock .ar__pts {
  font-size: clamp(24px, 3vw, 32px);
  color: var(--text);
}
.ar__log {
  display: grid;
  gap: 6px;
  width: 100%;
  margin: 0;
  padding: 14px 16px;
  list-style: none;
  border-radius: var(--r);
  background: var(--raise);
  color: var(--text);
  font-size: 14px;
}
.ar__board {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
}
.ar__board .ar__side {
  justify-items: stretch;
  text-align: left;
  padding: 14px;
  border-radius: var(--r);
  background: var(--raise);
  border: 1px solid transparent;
}
.ar__board .ar__side.win {
  border-color: var(--brand);
}
.ar__stat {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
}
.ar__stat > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink);
}
.ar__histrow {
  width: 100%;
  padding: 18px 20px;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
  gap: 18px;
}
.ar__histscore {
  min-width: 64px;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
}
.ar__histmain {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.ar__chev {
  width: 18px;
  height: 18px;
  margin-left: auto;
  color: var(--dim);
  transition: transform 0.2s;
}
[aria-expanded='true'] .ar__chev {
  transform: rotate(180deg);
}
.ar__detail {
  padding: 0 16px 16px;
}
.ar__detail > p {
  grid-column: 1 / -1;
  margin: 0;
}
@media (max-width: 640px) {
  .ar__teams,
  .ar__board {
    grid-template-columns: 1fr;
  }
  .ar__player {
    flex-wrap: wrap;
  }
  .ar__player .seg {
    margin-left: 0;
    width: 100%;
  }
  .ar__player .seg > button {
    flex: 1;
    justify-content: center;
  }
  .ar__rail {
    padding: 14px 16px;
  }
}
</style>
