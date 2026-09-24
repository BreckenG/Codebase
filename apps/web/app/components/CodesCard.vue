<script setup>
import { RANKED_SLOTS } from "@ranked-world/ranks";
const props = defineProps({ mode: { type: String, default: 'ranked' }, busy: { type: Boolean, default: false }, failure: { type: String, default: '' }, codes: { type: Array, default: () => [] }, trainer: { type: Array, default: () => [] }, practice: { type: Object, default: null }, mirror: { type: Object, default: null }, bracket: { type: String, default: null }, plan: { type: String, default: "free" }, invite: { type: String, default: "" } });
const emit = defineEmits(["start", "stop", "mirror", "mirror-stop"]);
const { data: cat } = await useApiFetch("/api/plans", { key: "plans", default: () => null });
const MODES = [{ key: "ranked", label: "Ranked" }, { key: "practice", label: "Practice" }, { key: "trainer", label: "AI Trainer" }, { key: "mirror", label: "Mirror bot", needs: "pro" }];
const RANK = { free: 0, plus: 1, pro: 2 };
const rank = computed(() => RANK[props.plan] ?? 0);
const mode = computed(() => props.mode);
const upcoming = ref([]);
const previewError = ref("");
let previewRequest = 0;
async function loadUpcoming() {
  const request = ++previewRequest;
  if (props.plan !== "pro" || props.mode !== "ranked") { upcoming.value = []; return; }
  try {
    const result = await apiGet("/api/me/upcoming-codes");
    if (request !== previewRequest) return;
    upcoming.value = result.codes || [];
    previewError.value = "";
  } catch {
    if (request !== previewRequest) return;
    upcoming.value = [];
    previewError.value = "Your code preview is unavailable. We will retry shortly.";
  }
}
watch(() => [props.plan, props.mode, props.bracket], () => { upcoming.value = []; previewError.value = ""; loadUpcoming(); });
function rotationLabel(code) {
  if (code.delayed || new Date(code.scheduledAt).getTime() <= now.value) return "Waiting for the current room to empty";
  return `Scheduled in ${Math.max(1, Math.ceil((new Date(code.scheduledAt).getTime() - now.value) / 60000))} min`;
}
const categories = computed(() => cat.value?.trainerCategories || []);
const mine = computed(() => categories.value.filter(c => (RANK[c.tier] ?? 0) <= rank.value));
const gated = computed(() => categories.value.filter(c => (RANK[c.tier] ?? 0) > rank.value));
const owned = computed(() => new Set(mine.value.map(c => c.key)));
const gatedBlurb = computed(() => { const names = gated.value.map(g => g.label); if (names.length < 3) return names.join(" and "); return `${names[0]}, ${names[1]} and ${names.length - 2} more`; });
const labels = computed(() => { const out = {}; for (const c of categories.value) out[c.key] = c.label; return out; });
const live = computed(() => props.trainer.filter(c => c.active !== false));
const teaching = computed(() => live.value.filter(c => owned.value.has(c.category)));
const behind = computed(() => live.value.filter(c => !owned.value.has(c.category)));
const prac = computed(() => props.practice || null);
const signedIn = computed(() => Boolean(prac.value?.signedIn));
const perDay = computed(() => prac.value?.perDay ?? cat.value?.practicePerDay?.[props.plan] ?? 1);
const left = computed(() => Math.max(0, perDay.value - (prac.value?.used || 0)));
const pct = computed(() => perDay.value ? left.value / perDay.value * 100 : 0);
const session = computed(() => prac.value?.session || null);
const difficulties = computed(() => prac.value?.difficulties || []);
const level = ref("average");
const chosen = computed(() => difficulties.value.find(d => d.value === level.value) || difficulties.value[0] || null);
const starting = computed(() => props.busy);
function begin() { if (!chosen.value || chosen.value.locked || !left.value || starting.value) return; emit('start', chosen.value.value); }
const now = ref(0);
let tick;
onMounted(() => { now.value = Date.now(); loadUpcoming(); tick = setInterval(() => { now.value = Date.now(); loadUpcoming(); }, 30000); });
onBeforeUnmount(() => clearInterval(tick));
const resets = computed(() => { if (!now.value) return ""; const d = new Date(now.value); const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now.value; const h = Math.floor(ms / 3600000); const m = Math.floor(ms % 3600000 / 60000); return h ? `${h}h ${m}m` : `${m}m`; });
</script>
<template>
<div class="codes"><template v-if="mode === 'ranked'"><div class="world-section-head"><h2>Available codes</h2><span class="meta">{{ codes.length }} open / {{ bracket || 'Your bracket' }}</span></div><div v-for="c in codes" :key="c.code" class="world-code"><span class="world-code__icon"><AppIcon name="hash" /></span><div><strong>{{ c.code }}</strong><small>{{ c.count || 0 }}/{{ RANKED_SLOTS }} players / Open</small></div><RoomJoinButton :code="c.code" /></div><div v-if="!codes.length" class="world-empty"><h3>No open codes right now.</h3><p class="meta">Codes open as players come online. You can practice while you wait.</p><NuxtLink class="btn" to="/play?mode=practice">Open Practice<AppIcon name="arrowRight" /></NuxtLink></div><div class="codes__next"><h3>Early code access</h3><p class="meta">Pro reveals your bracket's reserved codes 15 minutes before each two hour rotation. Rooms wait until players leave.</p><template v-if="plan === 'pro'"><p v-if="previewError" class="meta" role="status">{{ previewError }}</p><div v-for="c in upcoming" :key="c.code" class="world-code"><span class="world-code__icon"><AppIcon name="hash" /></span><div><strong>{{ c.code }}</strong><small>{{ rotationLabel(c) }}</small></div><span class="chip">Reserved</span></div><p v-if="!upcoming.length && !previewError" class="meta">Your next preview will appear here 15 minutes before rotation. We will alert you in Notifications.</p></template><NuxtLink v-if="plan !== 'pro'" class="btn btn--ghost" to="/subscribe">Explore Pro</NuxtLink></div></template><template v-else-if="mode === 'practice'"><div v-if="failure" class="world-error" role="alert"><p>{{ failure }}</p></div><div v-if="!signedIn" class="world-empty"><h3>Sign in to practice</h3><p class="meta">Sign in to configure a practice match against the bot.</p><a class="btn btn--brand" href="/sign-in">Sign in with Discord</a></div><template v-else><div class="world-section-head"><h2>{{ session ? 'Your session' : 'Difficulty' }}</h2><span class="meta">{{ left }} / {{ perDay }} matches left</span></div><template v-if="session"><div class="world-practice-session" role="status"><h3>{{ session.phase === 'starting' ? 'Opening your room...' : session.code }}</h3><p class="meta">{{ session.phase === 'starting' ? 'Keep this page open. Your code will appear when the room is ready.' : 'Join this code at the computer in Gorilla Tag.' }}</p><div class="world-practice-session__status"><span class="chip">{{ session.phase }}</span><span class="meta">{{ session.difficulty }}</span><RoomJoinButton v-if="session.code && session.phase !== 'starting'" :code="session.code" /></div><div v-if="session.points" class="world-score"><span>You<strong>{{ session.points[0] || 0 }}</strong></span><span>Bot<strong>{{ session.points[1] || 0 }}</strong></span></div></div><button class="btn" :disabled="busy" @click="emit('stop')">End practice</button></template><template v-else-if="left"><div class="codes__difficulties" role="group" aria-label="Practice difficulty"><button v-for="d in difficulties" :key="d.value" class="botrow codes__diff" :class="{ 'is-selected': d.value === level }" :aria-pressed="d.value === level" @click="level = d.value"><span class="codes__choice" aria-hidden="true" /><span class="botrow__body"><span class="title">{{ d.label }}</span><span class="meta">{{ d.blurb }}</span></span><span v-if="d.locked" class="tag">{{ d.tier === 'pro' ? 'Pro' : 'Plus' }}</span></button></div><div class="world-practice-start"><button class="btn btn--brand" :disabled="!chosen || chosen.locked || starting" @click="begin"><AppIcon name="play" />{{ starting ? 'Starting your session...' : 'Start practice' }}</button><NuxtLink v-if="chosen?.locked" class="btn" to="/subscribe">Unlock {{ chosen.label }}</NuxtLink><span class="meta">{{ resets ? 'Resets in ' + resets : 'Resets at midnight UTC' }}</span></div></template><div v-else class="world-empty"><h3>Daily limit reached</h3><p class="meta">You have used all {{ perDay }} matches. Your allowance resets at midnight UTC{{ resets ? ', in ' + resets : '' }}.</p><NuxtLink v-if="plan !== 'pro'" class="btn" to="/subscribe">See practice allowances</NuxtLink><NuxtLink v-else class="btn" to="/play">Find a ranked code</NuxtLink></div></template></template><template v-else-if="mode === 'trainer'"><div class="world-section-head"><h2>AI Trainer</h2><span class="chip">Coming soon</span></div><div v-for="c in teaching" :key="c.code" class="world-code"><span class="world-code__icon"><AppIcon name="bot" /></span><div><strong>{{ labels[c.category] || 'Drill' }}</strong><small>{{ c.code }} / {{ c.count || 0 }} players</small></div><RoomJoinButton :code="c.code" /></div><div v-if="!teaching.length" class="world-empty"><h3>AI Trainer is coming soon.</h3><p class="meta">Training lobbies are not running yet, on any plan. You cannot join a drill today. The categories below are what your plan will include when it opens.</p></div><div class="world-training-categories"><div v-for="c in categories" :key="c.key" class="world-training-category"><AppIcon name="target" /><div><h3>{{ c.label }}</h3><p class="meta">{{ owned.has(c.key) ? 'Included' : 'Requires ' + (c.tier === 'pro' ? 'Pro' : 'Plus') }}</p></div><span class="chip">{{ owned.has(c.key) ? 'Unlocked' : 'Locked' }}</span></div></div><NuxtLink v-if="gated.length" class="btn" to="/subscribe">Compare training access<AppIcon name="arrowRight" /></NuxtLink></template><MirrorBotPanel v-else :plan="plan" :mirror="mirror" :busy="busy" :failure="failure" @start="o => emit('mirror', o)" @stop="emit('mirror-stop')" /></div>
</template>
