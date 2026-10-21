<script setup>
import { RANKED_SLOTS } from '@ranked-world/ranks';

const props = defineProps({
  mode: { type: String, default: 'ranked' },
  busy: { type: Boolean, default: false },
  failure: { type: String, default: '' },
  codes: { type: Array, default: () => [] },
  trainer: { type: Array, default: () => [] },
  practice: { type: Object, default: null },
  mirror: { type: Object, default: null },
  bracket: { type: String, default: null },
  plan: { type: String, default: 'free' },
  invite: { type: String, default: '' },
  hidden: { type: Number, default: 0 },
  lobby: { type: Boolean, default: false },
  tries: { type: Object, default: null },
});
const emit = defineEmits(['start', 'stop', 'mirror', 'mirror-stop', 'refresh']);
const { data: cat } = await useApiFetch('/api/plans', { key: 'plans', default: () => null });
const RANK = { free: 0, plus: 1, pro: 2 };
const planName = (t) => (t === 'pro' ? 'Pro' : 'Plus');
const rank = computed(() => RANK[props.plan] ?? 0);
const upcoming = ref([]);
const previewError = ref('');
let previewRequest = 0;

async function loadUpcoming() {
  const request = ++previewRequest;
  if (props.plan !== 'pro' || props.mode !== 'ranked') {
    upcoming.value = [];
    return;
  }
  try {
    const result = await apiGet('/api/me/upcoming-codes');
    if (request !== previewRequest) return;
    upcoming.value = result.codes || [];
    previewError.value = '';
  } catch {
    if (request !== previewRequest) return;
    upcoming.value = [];
    previewError.value = 'Your code preview is unavailable. We will retry shortly.';
  }
}

watch(
  () => [props.plan, props.mode, props.bracket],
  () => {
    upcoming.value = [];
    previewError.value = '';
    loadUpcoming();
  },
);

function rotationLabel(code) {
  const at = new Date(code.scheduledAt).getTime();
  if (code.delayed || at <= now.value) return 'Waiting for the current room to empty';
  return `Scheduled in ${Math.max(1, Math.ceil((at - now.value) / 60000))} min`;
}

const trying = ref(false);
const tryError = ref('');

async function use(kind, code) {
  trying.value = true;
  tryError.value = '';
  try {
    await apiPost('/api/me/try', { kind, code });
    emit('refresh');
  } catch (e) {
    tryError.value = e.message;
  }
  trying.value = false;
}

function publicIn(c) {
  const ms = new Date(c.openedAt).getTime() + 120000 - now.value;
  if (ms <= 0) return 'now';
  return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
}

function seats(c) {
  const n = c.count || 0;
  if (n >= RANKED_SLOTS + 2) return 'full';
  if (n >= RANKED_SLOTS) return props.plan === 'pro' ? 'Pro seat open' : 'full';
  if (n >= RANKED_SLOTS - 2) return 'almost full';
  return 'open';
}

const categories = computed(() => cat.value?.trainerCategories || []);
const gated = computed(() => categories.value.filter((c) => (RANK[c.tier] ?? 0) > rank.value));
const owned = computed(
  () => new Set(categories.value.filter((c) => (RANK[c.tier] ?? 0) <= rank.value).map((c) => c.key)),
);
const labels = computed(() => Object.fromEntries(categories.value.map((c) => [c.key, c.label])));
const teaching = computed(() => props.trainer.filter((c) => c.active !== false && owned.value.has(c.category)));
const signedIn = computed(() => Boolean(props.practice?.signedIn));
const perDay = computed(() => props.practice?.perDay ?? cat.value?.practicePerDay?.[props.plan] ?? 1);
const left = computed(() => Math.max(0, perDay.value - (props.practice?.used || 0)));
const session = computed(() => props.practice?.session || null);
const difficulties = computed(() => props.practice?.difficulties || []);
const level = ref('average');
const chosen = computed(() => difficulties.value.find((d) => d.value === level.value) || difficulties.value[0] || null);

function begin() {
  if (!chosen.value || chosen.value.locked || !left.value || props.busy) return;
  emit('start', chosen.value.value);
}

const now = ref(0);
let tick;
let poll;
onMounted(() => {
  now.value = Date.now();
  loadUpcoming();
  tick = setInterval(() => {
    now.value = Date.now();
  }, 1000);
  poll = setInterval(loadUpcoming, 30000);
});
onBeforeUnmount(() => {
  clearInterval(tick);
  clearInterval(poll);
});
const resets = computed(() => {
  if (!now.value) return '';
  const d = new Date(now.value);
  const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now.value;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${m}m`;
});
</script>

<template>
  <div class="codes">
    <template v-if="mode === 'ranked'">
      <div class="section-head">
        <h2>Open codes</h2>
        <span class="meta">{{ codes.length }} open / {{ bracket || 'Your bracket' }}</span>
      </div>
      <div v-if="codes.length" class="codes__grid">
        <article
          v-for="(c, i) in codes"
          :key="c.code"
          class="tile reveal-up"
          :data-seats="seats(c)"
          :style="{ '--i': i }"
        >
          <div class="tile__top">
            <strong>{{ c.code }}</strong>
            <span v-if="c.early" class="tile__early"><AppIcon name="crown" />Public in {{ publicIn(c) }}</span>
            <span v-else-if="c.category" class="chip">{{ c.category }}</span>
          </div>
          <ul v-if="c.players?.length" class="tile__who" aria-label="Players in this code">
            <li
              v-for="p in c.players.slice(0, 6)"
              :key="p.discordId || p.name"
              :title="p.tier ? `${p.name} / ${p.tier}` : p.name"
            >
              <PlayerAvatar :name="p.name" :src="p.avatar" :discord-id="p.discordId || ''" :size="26" />
              <span>{{ p.name }}</span>
              <img v-if="p.tier" :src="rankBadge(p.tier)" alt="" width="18" height="18" />
            </li>
            <li v-if="c.players.length > 6" class="meta">+{{ c.players.length - 6 }} more</li>
          </ul>
          <button
            v-else-if="!lobby && c.count && tries?.peek"
            class="tile__peek"
            :disabled="trying"
            @click="use('peek', c.code)"
          >
            <span class="tile__blur" aria-hidden="true"><i v-for="n in Math.min(c.count, 5)" :key="n" /></span>
            Free peek<PerkTag tier="pro" />
          </button>
          <NuxtLink
            v-else-if="!lobby && c.count"
            class="tile__peek"
            to="/subscribe"
            aria-label="See who is in this code with Pro"
          >
            <span class="tile__blur" aria-hidden="true"><i v-for="n in Math.min(c.count, 5)" :key="n" /></span>
            See who's inside<PerkTag tier="pro" />
          </NuxtLink>
          <div class="tile__pips" :aria-label="`${c.count || 0} of ${RANKED_SLOTS} players`">
            <i v-for="n in RANKED_SLOTS" :key="n" :class="{ on: n <= (c.count || 0) }" />
          </div>
          <div class="tile__foot">
            <span
              ><b>{{ c.count || 0 }}</b> / {{ RANKED_SLOTS }} in<template v-if="seats(c) !== 'open'"
                >, {{ seats(c) }}</template
              ></span
            >
            <RoomJoinButton :code="c.code" />
          </div>
        </article>
      </div>
      <div v-else class="empty">
        <h3>No open codes right now.</h3>
        <p>Codes open as players in your bracket come online. Practice against a bot while you wait.</p>
        <NuxtLink class="btn" to="/play?mode=practice">Open Practice</NuxtLink>
      </div>
      <p v-if="tryError" class="meta" role="alert">{{ tryError }}</p>
      <PerkCard
        v-if="hidden"
        tier="pro"
        :title="`${hidden} new ${hidden === 1 ? 'code just opened' : 'codes just opened'} for Pro`"
      >
        <template v-if="tries?.firstIn">
          You get one free First in pass. Use it to see {{ hidden === 1 ? 'it' : 'them' }} now, before
          {{ hidden === 1 ? 'it goes' : 'they go' }} public.
        </template>
        <template v-else>
          Pro players get every new code two minutes before everyone else, so the room is never full when you get there.
        </template>
        <template v-if="tries?.firstIn" #go>
          <button class="btn btn--brand pc__go" :disabled="trying" @click="use('first-in')">
            Use free pass<AppIcon name="arrowRight" />
          </button>
        </template>
      </PerkCard>
      <PerkCard v-else-if="plan !== 'pro'" tier="pro" title="Get in first, see who's inside">
        Pro players get new codes two minutes before they go public, see who is in every code, and still get in when a
        code is full.
      </PerkCard>
      <section v-else class="codes__next panel">
        <div>
          <h3>Up next</h3>
          <p class="meta">Your bracket's next codes, 15 minutes before they open.</p>
        </div>
        <p v-if="previewError" class="meta" role="status">{{ previewError }}</p>
        <div v-for="c in upcoming" :key="c.code" class="row">
          <AppIcon name="hash" />
          <div class="codes__line">
            <strong>{{ c.code }}</strong
            ><span class="meta">{{ rotationLabel(c) }}</span>
          </div>
          <span class="chip chip--brand">Reserved</span>
        </div>
      </section>
    </template>

    <template v-else-if="mode === 'practice'">
      <div v-if="failure" class="alert" role="alert">
        <p>{{ failure }}</p>
      </div>
      <div v-if="!signedIn" class="empty">
        <h3>Sign in to practice</h3>
        <a class="btn btn--brand" href="/sign-in"><AppIcon name="discord" />Sign in with Discord</a>
      </div>
      <template v-else>
        <div class="section-head">
          <h2>{{ session ? 'Your session' : 'Pick a bot' }}</h2>
          <span class="meta">{{ left }} / {{ perDay }} matches left</span>
        </div>
        <template v-if="session">
          <div class="live panel" role="status">
            <span class="chip" :class="{ 'chip--live': session.phase !== 'starting' }"
              ><span class="dot" />{{ session.phase }}</span
            >
            <h3 class="live__code">{{ session.phase === 'starting' ? 'Opening your room...' : session.code }}</h3>
            <p class="meta">
              {{
                session.phase === 'starting'
                  ? 'Keep this page open. Your code will appear when the room is ready.'
                  : 'Join this code at the computer in Gorilla Tag.'
              }}
            </p>
            <div class="live__row">
              <span class="meta">{{ session.difficulty }}</span>
              <RoomJoinButton v-if="session.code && session.phase !== 'starting'" :code="session.code" />
            </div>
            <dl v-if="session.points" class="live__score">
              <div class="stat">
                <dt>{{ session.points[0] || 0 }}</dt>
                <dd>You</dd>
              </div>
              <div class="stat">
                <dt>{{ session.points[1] || 0 }}</dt>
                <dd>Bot</dd>
              </div>
            </dl>
            <button class="btn" :disabled="busy" @click="emit('stop')">End practice</button>
          </div>
        </template>
        <template v-else-if="left">
          <div class="picks" role="group" aria-label="Practice difficulty">
            <button
              v-for="d in difficulties"
              :key="d.value"
              class="pick"
              :class="{ on: d.value === level }"
              :aria-pressed="d.value === level"
              @click="level = d.value"
            >
              <span class="pick__name">{{ d.label }}</span>
              <span class="meta">{{ d.blurb }}</span>
              <span v-if="d.locked" class="tag">{{ planName(d.tier) }}</span>
            </button>
          </div>
          <div class="go-row">
            <button class="btn btn--brand btn--large" :disabled="!chosen || chosen.locked || busy" @click="begin">
              <AppIcon name="play" />{{ busy ? 'Starting your session...' : 'Start practice' }}
            </button>
            <NuxtLink v-if="chosen?.locked" class="btn" to="/subscribe">Get {{ chosen.label }}</NuxtLink>
            <span class="meta">{{ resets ? `Resets in ${resets}` : 'Resets at midnight UTC' }}</span>
          </div>
        </template>
        <div v-else class="empty">
          <h3>Daily limit reached</h3>
          <p>
            You have used all {{ perDay }} matches. Your allowance resets at midnight UTC{{
              resets ? `, in ${resets}` : ''
            }}.
          </p>
          <NuxtLink v-if="plan !== 'pro'" class="btn" to="/subscribe">See practice allowances</NuxtLink>
          <NuxtLink v-else class="btn" to="/play">Find a ranked code</NuxtLink>
        </div>
      </template>
    </template>

    <template v-else-if="mode === 'trainer'">
      <div class="section-head">
        <h2>Drills</h2>
        <span class="chip">Coming soon</span>
      </div>
      <div v-if="teaching.length" class="rows">
        <div v-for="c in teaching" :key="c.code" class="row">
          <AppIcon name="bot" />
          <div class="codes__line">
            <strong>{{ labels[c.category] || 'Drill' }}</strong
            ><span class="meta">{{ c.code }} / {{ c.count || 0 }} players</span>
          </div>
          <RoomJoinButton :code="c.code" />
        </div>
      </div>
      <div v-else class="empty">
        <h3>AI Trainer is coming soon.</h3>
        <p>
          Training lobbies are not running yet, on any plan. You cannot join a drill today. The categories below are
          what your plan will include when it opens.
        </p>
      </div>
      <div class="cats">
        <div v-for="c in categories" :key="c.key" class="cat panel" :class="{ mine: owned.has(c.key) }">
          <AppIcon name="target" />
          <h3>{{ c.label }}</h3>
          <p class="meta">{{ owned.has(c.key) ? 'Included' : `Requires ${planName(c.tier)}` }}</p>
          <span class="chip">{{ owned.has(c.key) ? 'Yours' : 'Locked' }}</span>
        </div>
      </div>
      <NuxtLink v-if="gated.length" class="btn" to="/subscribe">Compare training access</NuxtLink>
    </template>

    <MirrorBotPanel
      v-else
      :plan="plan"
      :mirror="mirror"
      :busy="busy"
      :failure="failure"
      @start="(o) => emit('mirror', o)"
      @stop="emit('mirror-stop')"
    />
  </div>
</template>

<style scoped>
.codes {
  display: grid;
  gap: 28px;
}
.codes .section-head {
  margin: 0;
}
.codes__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.tile {
  --seat: var(--good);
  display: grid;
  gap: 18px;
  padding: 22px;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: linear-gradient(180deg, color-mix(in srgb, var(--seat) 9%, transparent), transparent 70%), var(--panel);
  transition:
    transform 0.3s var(--ease),
    border-color 0.3s;
}
.tile:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--seat) 50%, transparent);
}
.tile[data-seats='almost full'] {
  --seat: var(--brand);
}
.tile[data-seats='full'] {
  --seat: var(--dim);
}
.tile__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.tile__top strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.01em;
}
.tile__early {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pro) 16%, transparent);
  color: var(--pro);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.tile__early svg {
  width: 13px;
  height: 13px;
}
.tile__who {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.tile__who li {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--ink);
  font-size: 13px;
}
.tile__who li span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tile__who img {
  margin-left: auto;
  image-rendering: pixelated;
}
.tile__peek {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--dim);
  font-size: 13px;
  font-weight: 600;
}
button.tile__peek {
  padding: 0;
  border: 0;
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.tile__peek:hover {
  color: var(--ink);
}
.tile__blur {
  display: flex;
}
.tile__blur i {
  width: 22px;
  height: 22px;
  margin-right: -6px;
  border-radius: 50%;
  border: 2px solid var(--panel-solid);
  background: linear-gradient(135deg, #5b5866, #2b2a31);
  filter: blur(1.5px);
}
.tile__blur i:last-child {
  margin-right: 4px;
}
.tile__pips {
  display: flex;
  gap: 4px;
}
.tile__pips i {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--raise-2);
  transition: background 0.4s;
}
.tile__pips i.on {
  background: var(--seat);
}
.tile__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  color: var(--dim);
  font-size: 14px;
}
.tile__foot b {
  color: var(--ink);
}
.codes__next {
  display: grid;
  gap: 14px;
  justify-items: start;
}
.codes__next .row {
  width: 100%;
}
.codes__line {
  display: grid;
  flex: 1;
  min-width: 0;
}
.codes__line strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 20px;
}
.row > svg {
  width: 20px;
  height: 20px;
  flex: none;
  color: var(--brand);
}
.cats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.cat {
  display: grid;
  gap: 8px;
  justify-items: start;
  opacity: 0.6;
}
.cat.mine {
  opacity: 1;
}
.cat svg {
  width: 22px;
  height: 22px;
  color: var(--brand);
}
</style>
