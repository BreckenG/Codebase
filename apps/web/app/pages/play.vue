<script setup>
const { enabled: desktop } = useDesktop();
const INVITE = 'https://discord.gg/gorillatagcomp';
const RULES_URL = 'https://docs.google.com/document/d/1eXH8xxJhVOlcAHepLoUWq2g3vYdt-j_2bUlf3GuZk-0/edit?usp=sharing';
const route = useRoute();
const activeMode = computed(() => playMode(route.query.mode));
const MODES = [
  {
    key: 'ranked',
    name: 'Ranked codes',
    icon: 'hash',
    title: 'Gorilla Tag ranked codes',
    blurb: 'Ranked Gorilla Tag codes for your skill level, connect your account, and join in-game to start ranking.',
  },
  {
    key: 'scrims',
    name: 'Scrims',
    icon: 'users',
    title: 'Gorilla Tag scrims',
    blurb: 'Ranked Gorilla Tag scrims. Make a party, or queue solo to get ranked on scrims.',
  },
  {
    key: 'practice',
    name: 'Practice',
    icon: 'target',
    title: 'Practice against a bot',
    blurb: 'Practice Gorilla Tag matches. Play against an AI in a 1v1 to train your skill.',
  },
  {
    key: 'trainer',
    name: 'AI Trainer',
    icon: 'bot',
    title: 'AI Trainer',
    blurb: 'Gorilla Tag training drills for several categories to get better at different skills.',
  },
  {
    key: 'mirror',
    name: 'Mirror Bot',
    icon: 'layers',
    title: 'Mirror Bot',
    blurb: 'Play against an AI in a 1v1 that is trained on your routes and movement.',
  },
];
const practiceBusy = ref(false);
const practiceFailure = ref('');
let practiceTimeout;
const { me, load: loadMe } = useMe();
const { toast } = useToast();
const mineReq = useApiFetch('/api/me/player', { key: 'panel-player', default: () => ({ player: null }) });
const codeReq = useApiFetch('/api/codes', { key: 'panel-codes', default: () => ({ codes: [] }) });
const pracReq = useApiFetch('/api/me/practice', { key: 'panel-practice', default: () => null });
const mirrorReq = useApiFetch('/api/me/mirror', { key: 'panel-mirror', default: () => null });
const featReq = useApiFetch('/api/features', { key: 'panel-features', default: () => ({ locked: {} }) });
await Promise.all([mineReq, codeReq, pracReq, mirrorReq, featReq]);
const { data: mine, refresh: refreshMine, error: playerError } = mineReq;
const { data: codeData, refresh: refreshCodes, error: codeError } = codeReq;
const { data: prac, refresh: refreshPrac, error: practiceError } = pracReq;
const { data: mirror, refresh: refreshMirror } = mirrorReq;
const { data: feats } = featReq;
const soon = computed(() => (feats.value?.locked || {})[activeMode.value] || null);
const locked = (key) => Boolean((feats.value?.locked || {})[key]);
const selectedMode = computed(() => {
  const m = MODES.find((x) => x.key === activeMode.value);
  return locked(m.key) ? { ...m, blurb: `${m.blurb} (coming soon)` } : m;
});
let pracPoll;

function settle() {
  practiceBusy.value = false;
  clearTimeout(practiceTimeout);
}

watch(
  () => prac.value?.error,
  (e) => {
    if (!e) return;
    settle();
    practiceFailure.value = e;
    toast(e);
  },
);
watch(
  () => prac.value?.session,
  (session) => {
    if (session) settle();
  },
);

async function startSession(url, body, again, failText) {
  if (practiceBusy.value) return;
  practiceBusy.value = true;
  practiceFailure.value = '';
  clearTimeout(practiceTimeout);
  practiceTimeout = setTimeout(() => {
    practiceBusy.value = false;
    practiceFailure.value = 'The room is taking longer than expected. Check your session before trying again.';
    again();
  }, 45000);
  try {
    await apiFetch(url, { method: 'POST', body });
    await again().catch(() => null);
  } catch (e) {
    settle();
    practiceFailure.value = e?.data?.statusMessage || failText;
    toast(practiceFailure.value);
  }
}

async function stopSession(url, again) {
  try {
    await apiFetch(url, { method: 'POST', body: { action: 'stop' } });
    setTimeout(() => again().catch(() => null), 2500);
  } catch (e) {
    toast(e?.data?.statusMessage || 'Could not close it.');
  }
}

const startPractice = (level) =>
  startSession(
    '/api/me/practice',
    { action: 'start', difficulty: level },
    refreshPrac,
    'Could not start a practice code.',
  );
const stopPractice = () => stopSession('/api/me/practice', refreshPrac);
const startMirror = (offset) =>
  startSession('/api/me/mirror', { action: 'start', offset }, refreshMirror, 'Could not start a Mirror Bot session.');
const stopMirror = () => stopSession('/api/me/mirror', refreshMirror);
const plan = computed(() => me.value.plan?.plan || 'free');
const player = computed(() => mine.value?.player || null);
const bracket = computed(() => player.value?.ranked?.tier?.category || null);
const myCodes = computed(() => (codeData.value?.codes || []).filter((c) => c.active));
const AGREEMENT = [
  'Follow the fair-play rules and respect other players.',
  'Keep private room codes private. Do not use codes you are not authorized to access.',
  'Ranked rooms use game statistics to calculate rankings. Scrim rooms also record movement replays, as described in the Privacy Policy.',
  'To enforce bans we check your account, device and gameplay for links to banned players, as described in the Privacy Policy.',
  'You can disconnect your account in Settings. Disconnecting does not erase existing records or cancel a subscription. Contact us for a privacy request.',
];
const PREVIEW = [
  { icon: 'shield', title: 'Agree to the rules' },
  { icon: 'hash', title: 'Get a connect code' },
  { icon: 'play', title: 'Join to connect' },
];
const CONNECT_STEPS = ['Agree', 'Join your code', 'Connected'];
const AT = { idle: 0, rules: 0, code: 1, linked: 2 };
const stage = ref('idle');
const dir = ref('fwd');
const conn = ref({ code: null, live: false, expiresAt: null });
const failure = ref('');
const linkAccepted = ref(false);
const now = ref(0);
let poll;
let tick;
const stepAt = computed(() => AT[stage.value] ?? 0);
const showRank = computed(() => Boolean(player.value?.linked) && stage.value !== 'linked');
const codeChars = computed(() => String(conn.value.code || '').split(''));
const expiresIn = computed(() => {
  if (!conn.value.expiresAt || !now.value) return null;
  const ms = new Date(conn.value.expiresAt).getTime() - now.value;
  if (ms <= 0) return 'expired';
  return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
});
const tierKey = computed(() => player.value?.ranked?.tier?.tier?.toLowerCase() || 'bronze');

function go(next) {
  dir.value = (AT[next] ?? 0) >= stepAt.value ? 'fwd' : 'back';
  stage.value = next;
}

function stopPoll() {
  clearInterval(poll);
  poll = null;
}

function landed() {
  stopPoll();
  go('linked');
  toast('Account connected. Welcome to the ladder.');
  setTimeout(() => {
    stage.value = 'idle';
  }, 2600);
}

function watchCode() {
  stopPoll();
  poll = setInterval(async () => {
    conn.value = await apiGet('/api/me/connect').catch(() => conn.value);
    await refreshMine();
    if (player.value?.linked) return landed();
    if (conn.value.code) return;
    stage.value = 'idle';
    stopPoll();
  }, 5000);
}

async function requestCode() {
  failure.value = '';
  if (!linkAccepted.value) throw new Error('Review the connection notice and accept the rules first.');
  conn.value = await apiPost('/api/me/connect', { accepted: true, policyVersion: POLICY_VERSION });
}

function afterCode(delay) {
  setTimeout(() => {
    go('code');
    watchCode();
  }, delay);
}

function onFail(e) {
  failure.value = e?.message || 'That did not go through.';
}

const unlinking = ref(false);

async function unlink() {
  if (unlinking.value) return;
  unlinking.value = true;
  failure.value = '';
  try {
    await apiFetch('/api/me/link', { method: 'DELETE' });
    conn.value = { code: null, live: false, expiresAt: null };
    await refreshMine().catch(() => null);
    go('idle');
    toast('Account disconnected.');
  } catch (e) {
    onFail(e);
  } finally {
    unlinking.value = false;
  }
}

async function drop() {
  stopPoll();
  await apiFetch('/api/me/connect', { method: 'DELETE' }).catch(() => null);
  conn.value = { code: null, live: false, expiresAt: null };
  go('idle');
}

watch(
  () => conn.value.expiresAt,
  (at) => {
    if (at) now.value = Date.now();
  },
);
onMounted(async () => {
  now.value = Date.now();
  tick = setInterval(() => {
    if (conn.value.expiresAt) now.value = Date.now();
  }, 1000);
  await loadMe();
  if (!me.value.user) return;
  pracPoll = setInterval(() => {
    refreshPrac().catch(() => null);
    refreshCodes().catch(() => null);
    if (activeMode.value === 'mirror') refreshMirror().catch(() => null);
  }, 5000);
  if (player.value?.linked) return;
  conn.value = await apiGet('/api/me/connect').catch(() => conn.value);
  if (!conn.value.code) return;
  stage.value = 'code';
  watchCode();
});
onBeforeUnmount(() => {
  clearTimeout(practiceTimeout);
  stopPoll();
  clearInterval(tick);
  clearInterval(pracPoll);
});
useSeo(() => ({ title: selectedMode.value.title, description: selectedMode.value.blurb }));
</script>

<template>
  <main id="main" class="page">
    <div class="wrap">
      <header class="page-head">
        <div>
          <h1 :key="selectedMode.key" class="reveal-up">{{ selectedMode.name }}</h1>
          <p class="reveal-up" style="--i: 1">{{ selectedMode.blurb }}</p>
        </div>
        <PhotonId v-if="showRank && player?.photonId" :id="player.photonId" />
      </header>

      <nav class="seg play__modes" aria-label="Play mode">
        <NuxtLink
          v-for="m in MODES"
          :key="m.key"
          :to="{ path: '/play', query: { mode: m.key } }"
          :aria-current="activeMode === m.key ? 'page' : undefined"
        >
          <AppIcon :name="m.icon" />{{ m.name }}<span v-if="locked(m.key)" class="play__soon">Soon</span>
        </NuxtLink>
      </nav>

      <div v-if="playerError" class="alert" role="alert">
        <p>Could not load your connected account.</p>
        <button class="btn btn--small" @click="refreshMine">Try again</button>
      </div>

      <section v-else-if="!showRank" class="connect panel">
        <div class="connect__main">
          <h2>Connect your Gorilla Tag account</h2>
          <StepRail :steps="CONNECT_STEPS" :at="stepAt" label="Connection progress" />
          <Transition :name="dir" mode="out-in" appear>
            <div :key="stage" class="connect__pane">
              <template v-if="stage === 'idle'">
                <ol class="connect__preview">
                  <li v-for="s in PREVIEW" :key="s.title"><AppIcon :name="s.icon" />{{ s.title }}</li>
                </ol>
                <div class="connect__go">
                  <a v-if="!me.user" class="btn btn--brand btn--large" href="/sign-in"
                    ><AppIcon name="discord" />Sign in to connect</a
                  >
                  <button v-else class="btn btn--brand btn--large" @click="go('rules')">Start connecting</button>
                  <a v-if="!desktop" class="btn btn--ghost btn--large" :href="INVITE"
                    ><AppIcon name="discord" />Or use /panel in Discord</a
                  >
                </div>
              </template>
              <template v-else-if="stage === 'rules'">
                <h3>Before you connect</h3>
                <p class="meta">
                  Connecting stores your game ID, name, and match results. Your display name, rating, and recent match
                  results appear publicly. Scrims record movement for replays.
                  <NuxtLink to="/legal/privacy">Read the Privacy policy</NuxtLink>.
                </p>
                <ul class="connect__terms">
                  <li v-for="line in AGREEMENT" :key="line">
                    <AppIcon name="check" /><span>{{ line }}</span>
                  </li>
                </ul>
                <label class="consent-check">
                  <input v-model="linkAccepted" type="checkbox" />
                  <span
                    >I agree to the connection rules and <NuxtLink to="/legal/terms">Terms and conditions</NuxtLink>.
                    This does not authorize AI training.</span
                  >
                </label>
                <p v-if="failure" class="bad" role="alert">{{ failure }}</p>
                <div class="connect__go">
                  <ActionButton
                    :action="requestCode"
                    :disabled="!linkAccepted"
                    icon="arrowRight"
                    trailing
                    done-label="Your code is ready"
                    fail-label="Could not get a code"
                    @ok="afterCode(760)"
                    @fail="onFail"
                  >
                    Agree and get connection code
                  </ActionButton>
                  <a class="btn btn--ghost" :href="RULES_URL" target="_blank" rel="noopener"
                    >Read the full rules<AppIcon name="external"
                  /></a>
                  <button class="btn btn--ghost" @click="go('idle')">Back</button>
                </div>
              </template>
              <template v-else-if="stage === 'code'">
                <div class="connect__status">
                  <span class="chip" :class="{ 'chip--live': conn.live }"
                    ><span class="dot" />{{ conn.live ? 'Code is up' : 'Opening the room' }}</span
                  >
                  <span v-if="expiresIn" class="chip"
                    ><AppIcon name="clock" />{{ expiresIn === 'expired' ? 'Code expired' : `${expiresIn} left` }}</span
                  >
                </div>
                <p class="connect__code" :aria-label="`Your code is ${conn.code}`">
                  <span v-for="(c, i) in codeChars" :key="i" :style="{ '--i': i }" aria-hidden="true">{{ c }}</span>
                </p>
                <RoomJoinButton :code="conn.code || ''" />
                <p v-if="expiresIn === 'expired'" class="meta" role="status">
                  This code has expired. Regenerate it to continue connecting.
                </p>
                <p v-if="conn.error" class="bad" role="alert">{{ conn.error }}</p>
                <p class="meta">Do not share this code.</p>
                <label v-if="!linkAccepted" class="consent-check">
                  <input v-model="linkAccepted" type="checkbox" />
                  <span
                    >I agree to the <NuxtLink to="/legal/terms">connection terms</NuxtLink> and have read the
                    <NuxtLink to="/legal/privacy">data notice</NuxtLink> before requesting another code.</span
                  >
                </label>
                <ol class="connect__how">
                  <li>Launch Gorilla Tag and go to the computer</li>
                  <li>
                    Join <b>{{ conn.code }}</b>
                  </li>
                  <li>Almost instantly your account will be connected</li>
                </ol>
                <div class="connect__go">
                  <ActionButton
                    :action="requestCode"
                    variant="plain"
                    small
                    icon="refresh"
                    done-label="New code"
                    fail-label="Could not regenerate"
                    @fail="onFail"
                  >
                    Regenerate
                  </ActionButton>
                  <button class="btn btn--ghost" @click="drop">Cancel</button>
                </div>
              </template>
              <div v-else class="connect__done">
                <SuccessCheck label="Account connected" />
                <h3>Account connected</h3>
                <p class="meta">
                  {{ player ? player.name : 'Your account' }} is connected. Every ranked round you play from here
                  counts.
                </p>
                <button class="btn btn--ghost" :disabled="unlinking" @click="unlink">
                  {{ unlinking ? 'Disconnecting...' : 'Disconnect account' }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
        <ClientOnly>
          <GorillaFigure
            class="connect__fig"
            :pose="stage === 'linked' ? 'cheer' : 'reach'"
            :color="[0.93, 0.45, 0.1]"
          />
        </ClientOnly>
      </section>

      <div v-else-if="player" class="play__grid">
        <section>
          <ReplayConsentGate :required="activeMode !== 'ranked'">
            <PartyPanel v-if="activeMode === 'scrims'" :invite="desktop ? '' : INVITE" />
            <div v-else-if="activeMode === 'ranked' && codeError" class="alert" role="alert">
              <p>Could not load the ranked codes.</p>
              <button class="btn btn--small" @click="refreshCodes">Try again</button>
            </div>
            <ModNotice
              v-else-if="activeMode === 'ranked' && codeData?.reason === 'mods'"
              :mods="codeData.mods"
              @cleared="refreshCodes"
            />
            <VoiceConsentNotice
              v-else-if="activeMode === 'ranked' && codeData?.reason === 'voice-consent'"
              :version="codeData.version"
              @accepted="refreshCodes"
            />
            <div v-else-if="activeMode === 'ranked' && codeData?.reason === 'banned'" class="empty">
              <h3>You are rank banned.</h3>
              <p>Any rank ban can be appealed, and a real staff member reviews every appeal.</p>
            </div>
            <div v-else-if="activeMode === 'ranked' && codeData?.reason === 'policy'" class="empty">
              <h3>Agree to the new terms first.</h3>
              <p>Our terms and privacy policy changed. Agree to them to see and join ranked codes.</p>
            </div>
            <div v-else-if="activeMode === 'practice' && practiceError" class="alert" role="alert">
              <p>Could not load your practice sessions.</p>
              <button class="btn btn--small" @click="refreshPrac">Try again</button>
            </div>
            <div v-else-if="soon" class="empty">
              <h3>{{ soon.title }} is coming soon.</h3>
              <p>{{ soon.blurb }}</p>
            </div>
            <CodesCard
              v-else
              :mode="activeMode"
              :codes="myCodes"
              :hidden="codeData?.hidden || 0"
              :lobby="Boolean(codeData?.lobbyPreview)"
              :tries="codeData?.tries || null"
              @refresh="refreshCodes"
              :practice="prac"
              :mirror="mirror"
              :bracket="bracket"
              :plan="plan"
              :invite="desktop ? '' : INVITE"
              :busy="practiceBusy"
              :failure="practiceFailure"
              @start="startPractice"
              @stop="stopPractice"
              @mirror="startMirror"
              @mirror-stop="stopMirror"
            />
          </ReplayConsentGate>
        </section>
        <aside class="play__side panel" :class="`t-${tierKey}`">
          <RankBadge :tier="player.ranked.tier" :size="72" :show-percent="false" />
          <strong class="play__tier">{{ player.ranked.tier.name }}</strong>
          <span class="meta">{{ num(player.ranked.elo) }} MMR / {{ player.ranked.tier.category }} bracket</span>
          <div class="bar" style="--accent: var(--tier)">
            <span :style="{ width: `${player.ranked.tier.isTop ? 100 : player.ranked.tier.percent}%` }" />
          </div>
          <p v-if="activeMode === 'practice' || activeMode === 'mirror'" class="meta">
            Practice allowance resets at midnight UTC.
          </p>
          <NuxtLink class="btn btn--small" :to="`/player/${player.discordId || player.photonId}`"
            >View your profile</NuxtLink
          >
        </aside>
      </div>
    </div>
  </main>
</template>

<style scoped>
.play__soon {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(238, 134, 42, 0.16);
  color: var(--brand);
  font-size: 10px;
  font-weight: 700;
}
.play__modes {
  margin-bottom: 40px;
  overflow-x: auto;
  max-width: 100%;
  scrollbar-width: none;
}
.connect {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 32px;
  align-items: center;
  padding: 40px;
}
.connect h2 {
  font-size: clamp(30px, 3.4vw, 44px);
  margin-bottom: 28px;
}
.connect__pane {
  display: grid;
  gap: 18px;
  margin-top: 32px;
}
.connect__preview {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.connect__preview li {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--ink);
  font-weight: 600;
}
.connect__preview svg {
  width: 40px;
  height: 40px;
  padding: 10px;
  border-radius: var(--r);
  background: rgba(238, 134, 42, 0.12);
  color: var(--brand);
}
.connect__go {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}
.connect__terms {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.connect__terms li {
  display: flex;
  gap: 12px;
  font-size: 14px;
}
.connect__terms svg {
  width: 16px;
  height: 16px;
  flex: none;
  margin-top: 4px;
  color: var(--good);
}
.connect__status {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.connect__code {
  display: flex;
  gap: 6px;
  margin: 6px 0;
}
.connect__code span {
  display: grid;
  place-items: center;
  width: clamp(48px, 7vw, 76px);
  height: clamp(64px, 9vw, 96px);
  border-radius: var(--r);
  background: var(--raise-2);
  color: var(--ink);
  font-family: var(--font-display);
  font-size: clamp(36px, 5vw, 60px);
  font-weight: 800;
  animation: up 0.6s var(--ease) both;
  animation-delay: calc(var(--i) * 60ms);
}
.connect__how {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
  color: var(--text);
}
.connect__how b {
  color: var(--ink);
}
.connect__done {
  display: grid;
  justify-items: start;
  gap: 12px;
}
.connect__fig {
  width: 100%;
  height: 440px;
}
.play__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 32px;
  align-items: start;
}
.play__side {
  display: grid;
  gap: 12px;
  justify-items: start;
  position: sticky;
  top: calc(var(--nav) + 24px);
}
.play__tier {
  color: var(--tier);
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
}
.play__side .bar {
  width: 100%;
}
@media (max-width: 960px) {
  .connect {
    grid-template-columns: 1fr;
    padding: 24px;
  }
  .connect__fig {
    order: -1;
    height: 280px;
  }
  .play__grid {
    grid-template-columns: 1fr;
  }
  .play__side {
    position: static;
  }
}
</style>
