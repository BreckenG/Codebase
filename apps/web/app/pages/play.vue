<script setup>
const { enabled: desktop } = useDesktop();
const INVITE = "https://discord.gg/gorillatagcomp";
const RULES_URL = "https://docs.google.com/document/d/1eXH8xxJhVOlcAHepLoUWq2g3vYdt-j_2bUlf3GuZk-0/edit?usp=sharing";
const route = useRoute();
const activeMode = computed(() => playMode(route.query.mode));
const modes = [{ key: 'ranked', name: 'Ranked Codes', icon: 'hash', title: 'Gorilla Tag ranked codes', blurb: 'Live ranked Gorilla Tag codes for your bracket. Connect your account, enter the code at the computer in game, and the round counts toward your Elo.' }, { key: 'scrims', name: 'Scrims', icon: 'users', title: 'Gorilla Tag scrims', blurb: 'Team scrims for competitive Gorilla Tag. Build a party, queue up, and a bot joins the room to referee and score it on a separate scrim rating.' }, { key: 'practice', name: 'Practice', icon: 'target', title: 'Practice against a bot', blurb: 'Start a Gorilla Tag practice room against a bot from the website. Free gets one a day, Plus three, Pro ten, with higher bot difficulty on the paid plans.' }, { key: 'trainer', name: 'AI Trainer', icon: 'bot', title: 'AI Trainer', blurb: 'Movement drills for Gorilla Tag, by category. Training lobbies are not running yet on any plan; this page shows what each membership will include.' }, { key: 'mirror', name: 'Mirror Bot', icon: 'layers', title: 'Mirror Bot', blurb: 'A bot that runs your own routes back at you in Gorilla Tag. Not available yet on any plan, including Pro.' }];
const selectedMode = computed(() => modes.find(m => m.key === activeMode.value));
const practiceBusy = ref(false);
const practiceFailure = ref('');
let practiceTimeout;
const { me, load: loadMe } = useMe();
const { toast } = useToast();
const mineReq = useApiFetch("/api/me/player", { key: "panel-player", default: () => ({ player: null }) });
const codeReq = useApiFetch("/api/codes", { key: "panel-codes", default: () => ({ codes: [] }) });
const pracReq = useApiFetch("/api/me/practice", { key: "panel-practice", default: () => null });
const mirrorReq = useApiFetch("/api/me/mirror", { key: "panel-mirror", default: () => null });
const featReq = useApiFetch("/api/features", { key: "panel-features", default: () => ({ locked: {} }) });
await Promise.all([mineReq, codeReq, pracReq, mirrorReq, featReq]);
const { data: mine, refresh: refreshMine, error: playerError } = mineReq;
const { data: codeData, refresh: refreshCodes, error: codeError } = codeReq;
const { data: prac, refresh: refreshPrac, error: practiceError } = pracReq;
const { data: mirror, refresh: refreshMirror } = mirrorReq;
const { data: feats } = featReq;
const soon = computed(() => (feats.value?.locked || {})[activeMode.value] || null);
let pracPoll;
watch(() => prac.value?.error, e => { if (e) { practiceBusy.value = false; clearTimeout(practiceTimeout); practiceFailure.value = e; toast(e); } });
watch(() => prac.value?.session, session => { if (session) { practiceBusy.value = false; clearTimeout(practiceTimeout); } });
async function startPractice(level) { if (practiceBusy.value) return; practiceBusy.value = true; practiceFailure.value = ''; clearTimeout(practiceTimeout); practiceTimeout = setTimeout(() => { practiceBusy.value = false; practiceFailure.value = 'The room is taking longer than expected. Check your session before trying again.'; refreshPrac(); }, 45000); try { await apiFetch("/api/me/practice", { method: "POST", body: { action: "start", difficulty: level } }); await refreshPrac().catch(() => null); } catch (e) { practiceBusy.value = false; clearTimeout(practiceTimeout); practiceFailure.value = e?.data?.statusMessage || "Could not start a practice code."; toast(practiceFailure.value); } }
async function stopPractice() { try { await apiFetch("/api/me/practice", { method: "POST", body: { action: "stop" } }); setTimeout(() => refreshPrac().catch(() => null), 2500); } catch (e) { toast(e?.data?.statusMessage || "Could not close it."); } }
async function startMirror(offset) { if (practiceBusy.value) return; practiceBusy.value = true; practiceFailure.value = ''; clearTimeout(practiceTimeout); practiceTimeout = setTimeout(() => { practiceBusy.value = false; practiceFailure.value = 'The room is taking longer than expected. Check your session before trying again.'; refreshMirror(); }, 45000); try { await apiFetch("/api/me/mirror", { method: "POST", body: { action: "start", offset } }); await refreshMirror().catch(() => null); } catch (e) { practiceBusy.value = false; clearTimeout(practiceTimeout); practiceFailure.value = e?.data?.statusMessage || "Could not start a Mirror Bot session."; toast(practiceFailure.value); } }
async function stopMirror() { try { await apiFetch("/api/me/mirror", { method: "POST", body: { action: "stop" } }); setTimeout(() => refreshMirror().catch(() => null), 2500); } catch (e) { toast(e?.data?.statusMessage || "Could not close it."); } }
const plan = computed(() => me.value.plan?.plan || "free");
const player = computed(() => mine.value?.player || null);
const bracket = computed(() => player.value?.ranked?.tier?.category || null);
const myCodes = computed(() => (codeData.value?.codes || []).filter(c => c.active));
const AGREEMENT = ["Follow the fair-play rules and respect other players.", "Keep private room codes private. Do not use codes you are not authorized to access.", "Ranked rooms use game statistics to calculate rankings. Scrim rooms also record movement replays, as described in the Privacy Policy.", "You can disconnect your account in Settings. Disconnecting does not erase existing records or cancel a subscription. Contact us for a privacy request."];
const PREVIEW = [{ icon: "shield", title: "Agree to the rules" }, { icon: "hash", title: "Get a connect code" }, { icon: "play", title: "Join to connect" }];
const CONNECT_STEPS = ["Agree", "Join your code", "Connected"];
const AT = { idle: 0, rules: 0, code: 1, linked: 2 };
const stage = ref("idle");
const dir = ref("fwd");
const conn = ref({ code: null, live: false, expiresAt: null });
const failure = ref("");
const linkAccepted = ref(false);
const now = ref(0);
let poll;
let tick;
const stepAt = computed(() => AT[stage.value] ?? 0);
const showRank = computed(() => Boolean(player.value?.linked) && stage.value !== "linked");
const codeChars = computed(() => String(conn.value.code || "").split(""));
const expiresIn = computed(() => { if (!conn.value.expiresAt || !now.value) return null; const ms = new Date(conn.value.expiresAt).getTime() - now.value; if (ms <= 0) return "expired"; const m = Math.floor(ms / 60000); return m + ":" + String(Math.floor(ms % 60000 / 1000)).padStart(2, "0"); });
const stageH = ref(0);
let ro = null;
function onEnter(el) { ro?.disconnect(); stageH.value = el.offsetHeight; ro = new ResizeObserver(() => stageH.value = el.offsetHeight); ro.observe(el); }
function go(next) { dir.value = (AT[next] ?? 0) >= stepAt.value ? "fwd" : "back"; stage.value = next; }
function stopPoll() { clearInterval(poll); poll = null; }
function landed() { stopPoll(); go("linked"); toast("Account connected. Welcome to the ladder."); setTimeout(() => stage.value = "idle", 2600); }
function watchCode() { stopPoll(); poll = setInterval(async () => { conn.value = await apiGet("/api/me/connect").catch(() => conn.value); await refreshMine(); if (player.value?.linked) return landed(); if (!conn.value.code) { stage.value = "idle"; stopPoll(); } }, 5000); }
async function requestCode() { failure.value = ""; if (!linkAccepted.value) throw new Error("Review the connection notice and accept the rules first."); conn.value = await apiPost("/api/me/connect", { accepted: true, policyVersion: POLICY_VERSION }); }
function afterCode(delay) { setTimeout(() => { go("code"); watchCode(); }, delay); }
function onFail(e) { failure.value = e?.message || "That did not go through."; }
const unlinking = ref(false);
async function unlink() { if (unlinking.value) return; unlinking.value = true; failure.value = ""; try { await apiFetch("/api/me/link", { method: "DELETE" }); conn.value = { code: null, live: false, expiresAt: null }; await refreshMine().catch(() => null); go("idle"); toast("Account disconnected."); } catch (e) { onFail(e); } finally { unlinking.value = false; } }
async function drop() { stopPoll(); await apiFetch("/api/me/connect", { method: "DELETE" }).catch(() => null); conn.value = { code: null, live: false, expiresAt: null }; go("idle"); }
watch(() => conn.value.expiresAt, at => { if (at) now.value = Date.now(); });
onMounted(async () => { now.value = Date.now(); tick = setInterval(() => { if (conn.value.expiresAt) now.value = Date.now(); }, 1000); await loadMe(); if (!me.value.user) return; pracPoll = setInterval(() => { refreshPrac().catch(() => null); refreshCodes().catch(() => null); if (activeMode.value === 'mirror') refreshMirror().catch(() => null); }, 5000); if (player.value?.linked) return; conn.value = await apiGet("/api/me/connect").catch(() => conn.value); if (conn.value.code) { stage.value = "code"; watchCode(); } });
onBeforeUnmount(() => { clearTimeout(practiceTimeout); stopPoll(); clearInterval(tick); clearInterval(pracPoll); ro?.disconnect(); });
useSeo(() => ({ title: selectedMode.value.title, description: selectedMode.value.blurb }));
</script>
<template>
<main id="main" class="wrap section"><div class="page-head"><div><h1>{{ selectedMode.name }}</h1></div><div v-if="showRank && player" class="page-head__actions"><PhotonId v-if="player.photonId" :id="player.photonId" /></div></div><nav class="world-mode-nav" aria-label="Play mode"><NuxtLink v-for="m in modes" :key="m.key" :to="{ path: '/play', query: { mode: m.key } }" :aria-current="activeMode === m.key ? 'page' : undefined"><AppIcon :name="m.icon" />{{ m.name }}</NuxtLink></nav><div v-if="playerError" role="alert" class="world-error"><p>Could not load your connected account.</p><button class="btn" @click="refreshMine">Try again</button></div><section v-else-if="!showRank" class="slab connect"><div class="connect__top"><span class="connect__mark"><AppIcon name="link" /></span><div><h2>Connect your Gorilla Tag account</h2></div></div><StepRail :steps="CONNECT_STEPS" :at="stepAt" label="Connection progress" /><div class="stage" :style="stageH ? { height: stageH + 'px' } : null"><Transition :name="dir" mode="out-in" appear @enter="onEnter"><div :key="stage" class="stage__pane"><template v-if="stage === 'idle'"><ol class="rows connect__preview"><li v-for="s in PREVIEW" :key="s.title" class="rowitem"><span class="rowitem__lead"><AppIcon :name="s.icon" /></span><span class="rowitem__label">{{ s.title }}</span></li></ol><div class="connect__go"><a v-if="!me.user" class="btn btn--brand btn--large" href="/sign-in"><AppIcon name="discord" />Sign in to connect
                </a><button v-else class="btn btn--brand btn--large" @click="go('rules')">
                  Start connecting<AppIcon name="arrowRight" /></button><a v-if="!desktop" class="btn btn--ghost btn--large" :href="INVITE"><AppIcon name="discord" />Or use /panel in Discord
                </a></div></template><template v-else-if="stage === 'rules'"><div><h3 class="connect__h">Before you connect</h3><p class="meta">Connecting stores your game ID, name, and match results. Your display name, rating, and recent match results appear publicly. Scrims record movement for replays. <NuxtLink to="/legal/privacy">Read the Privacy policy</NuxtLink>.</p></div><ul class="rows connect__terms"><li v-for="line in AGREEMENT" :key="line" class="rowitem"><AppIcon name="check" /><span>{{ line }}</span></li></ul><label class="consent-check"><input v-model="linkAccepted" type="checkbox" /><span>I agree to the connection rules and <NuxtLink to="/legal/terms">Terms and conditions</NuxtLink>. This does not authorize AI training.</span></label><p v-if="failure" class="connect__bad" role="alert">{{ failure }}</p><div class="connect__go"><ActionButton :action="requestCode" :disabled="!linkAccepted" icon="arrowRight" trailing done-label="Your code is ready" fail-label="Could not get a code" @ok="afterCode(760)" @fail="onFail" >
                  Agree and get connection code
                </ActionButton><a class="btn btn--ghost btn--large" :href="RULES_URL" target="_blank" rel="noopener">
                  Read the full rules<AppIcon name="external" /></a><button class="btn btn--ghost" @click="go('idle')">Back</button></div></template><template v-else-if="stage === 'code'"><div class="connect__status"><span class="chip" :class="conn.live ? 'chip--live' : ''"><span class="dot dot--beat" />{{ conn.live ? "Code is up" : "Opening the room" }}
                </span><span v-if="expiresIn" class="chip"><AppIcon name="clock" />{{ expiresIn === 'expired' ? 'Code expired' : expiresIn + ' left' }}</span></div><div class="codeplate" :data-live="conn.live ? '' : undefined"><span class="codeplate__scan" aria-hidden="true" /><p class="codeplate__value mono" :aria-label="'Your code is ' + conn.code"><span v-for="(c, i) in codeChars" :key="i" class="codeplate__ch" :style="{ '--i': i }" aria-hidden="true" >{{ c }}</span ></p><RoomJoinButton :code="conn.code || ''" /></div><p v-if="expiresIn === 'expired'" class="meta" role="status">This code has expired. Regenerate it to continue connecting.</p><p v-if="conn.error" class="connect__bad" role="alert"><AppIcon name="info" />{{ conn.error }}</p><p class="connect__bad"><AppIcon name="info" />Do not share this code.</p><label v-if="!linkAccepted" class="consent-check"><input v-model="linkAccepted" type="checkbox" /><span>I agree to the <NuxtLink to="/legal/terms">connection terms</NuxtLink> and have read the <NuxtLink to="/legal/privacy">data notice</NuxtLink> before requesting another code.</span></label><ol class="rows connect__terms"><li class="rowitem"><span class="connect__n">1</span><span>Launch Gorilla Tag and go to the computer</span></li><li class="rowitem"><span class="connect__n">2</span><span>Join <b class="mono">{{ conn.code }}</b></span></li><li class="rowitem"><span class="connect__n">3</span><span>Almost instantly your account will be connected</span></li></ol><div class="connect__go"><ActionButton :action="requestCode" variant="plain" small icon="refresh" done-label="New code" fail-label="Could not regenerate" @fail="onFail" >
                  Regenerate
                </ActionButton><button class="btn btn--ghost" @click="drop">Cancel</button></div></template><template v-else><div class="connect__done"><SuccessCheck label="Account connected" /><h3 class="connect__h">Account connected</h3><p class="meta">
                  {{ player ? player.name : "Your account" }} is connected. Every ranked round you play from
                  here counts.
                </p><button class="btn btn--ghost" :disabled="unlinking" @click="unlink">
                  {{ unlinking ? "Disconnecting..." : "Disconnect account" }}
                </button></div></template></div></Transition></div></section><template v-else-if="player"><div class="world-play-layout"><section><ReplayConsentGate :required="activeMode !== 'ranked'"><PartyPanel v-if="activeMode === 'scrims'" :invite="desktop ? '' : INVITE" /><div v-else-if="activeMode === 'ranked' && codeError" class="world-error" role="alert"><p>Could not load the ranked codes.</p><button class="btn" @click="refreshCodes">Try again</button></div><div v-else-if="activeMode === 'ranked' && codeData?.reason === 'banned'" class="world-empty"><h3>You are rank banned.</h3><p class="meta">Ranked codes stay hidden while your rank ban is active.</p></div><div v-else-if="activeMode === 'practice' && practiceError" class="world-error" role="alert"><p>Could not load your practice sessions.</p><button class="btn" @click="refreshPrac">Try again</button></div><div v-else-if="soon" class="world-empty"><h3>{{ soon.title }} is coming soon.</h3><p class="meta">{{ soon.blurb }}</p></div><CodesCard v-else :mode="activeMode" :codes="myCodes" :practice="prac" :mirror="mirror" :bracket="bracket" :plan="plan" :invite="desktop ? '' : INVITE" :busy="practiceBusy" :failure="practiceFailure" @start="startPractice" @stop="stopPractice" @mirror="startMirror" @mirror-stop="stopMirror" /></ReplayConsentGate></section><aside class="world-play-note"><p v-if="activeMode === 'ranked'">{{ desktop ? 'Select Join in VR to launch Gorilla Tag into a room.' : 'Enter a code at the computer in Gorilla Tag to join.' }}</p><p v-if="activeMode === 'practice' || activeMode === 'mirror'">Practice allowance resets at midnight UTC.</p><div class="world-account-summary"><RankBadge :tier="player.ranked.tier" :size="44" /><span>{{ player.ranked.tier.name }}<small>{{ player.ranked.elo }} Elo</small></span></div><NuxtLink :to="`/player/${player.discordId || player.photonId}`">View your profile <AppIcon name="arrowRight" class="world-inline-arrow" /></NuxtLink></aside></div></template></main>
</template>
<style src="~/assets/css/panel.css">
</style>
