<script setup>
const page = ref(0);
const { me } = useMe();
const track = ref('ranked');
watch(track, () => { page.value = 0; open.value = new Set(); });
const { data, pending, error, refresh } = await useApiFetch("/api/history", { query: { page, track }, key: "history", lazy: import.meta.client, default: () => null });
const rows = computed(() => data.value?.rows || []);
const capped = computed(() => Boolean(data.value?.capped));
const hasBreakdown = computed(() => Boolean(data.value?.breakdown));
const reach = computed(() => data.value?.reach || 0);
const total = computed(() => data.value?.total || 0);
const pages = computed(() => Math.ceil(reach.value / 25));
const open = ref(new Set());
const gained = computed(() => rows.value.reduce((n, m) => n + (m.delta > 0 ? m.delta : 0), 0));
const lost = computed(() => rows.value.reduce((n, m) => n + (m.delta < 0 ? -m.delta : 0), 0));
const wins = computed(() => rows.value.filter(m => m.won).length);
function toggle(i) { const s = new Set(open.value); s.has(i) ? s.delete(i) : s.add(i); open.value = s; }
const when = d => new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const pct = n => Math.round((n || 0) * 100) + "%";
const clock = s => `${Math.floor((s || 0) / 60)}:${String(Math.round((s || 0) % 60)).padStart(2, "0")}`;
function movers(d) { const out = []; if (d.tags) out.push(`${d.tags} tag${d.tags === 1 ? "" : "s"}`); if (d.survivalSeconds) out.push(`${clock(d.survivalSeconds)} alive`); if (!d.wasInfected) out.push("never tagged"); if (d.firstTagged) out.push("tagged first"); if (d.leftEarly) out.push("left early"); return out; }
useHead({ title: "Match history | Ranked World" });
</script>
<template>
<main id="main" class="wrap section"><div class="page-head"><div><h1>Match history</h1></div></div><div class="world-mode-nav" aria-label="History track"><button v-for="t in ['ranked','scrim']" :key="t" :class="{selected: track === t}" :aria-pressed="track === t" @click="track = t">{{ t === 'ranked' ? 'Ranked' : 'Scrims' }}</button></div><div v-if="!me.user" class="world-empty"><h2>Sign in to view your history</h2><p class="meta">Sign in to see your match history.</p><a class="btn btn--brand" href="/sign-in">Sign in with Discord</a></div><div v-else-if="error" role="alert" class="world-error"><p>Could not load your matches.</p><button class="btn" @click="refresh">Try again</button></div><div v-else-if="data && !data.linked" class="card"><EmptyState icon="link" title="No account connected yet" body="Connect your Gorilla Tag account and every round you play turns up here." ><NuxtLink class="btn btn--brand btn--large" to="/play"><AppIcon name="link" />Connect your account
        </NuxtLink></EmptyState></div><div v-else-if="pending" class="card"><div v-for="n in 6" :key="n" class="sk hist__sk" /></div><div v-else-if="!rows.length" class="card"><EmptyState icon="swords" title="No scored rounds yet" body="Play a ranked code and this fills in."><NuxtLink class="btn btn--brand" to="/play">Find a code</NuxtLink></EmptyState></div><template v-else><section class="slab hist__sum"><div class="figures"><div class="figure"><span class="figure__num pos">+<CountUp :value="gained" /></span><span class="figure__key">Elo gained</span></div><div class="figure"><span class="figure__num neg">-<CountUp :value="lost" /></span><span class="figure__key">Elo lost</span></div><div class="figure"><span class="figure__num"><CountUp :value="wins" /></span><span class="figure__key">Round wins</span></div><div class="figure"><span class="figure__num"><CountUp :value="rows.length" /></span><span class="figure__key">On this page</span></div></div></section><ol class="card rows hist"><li v-for="(m, i) in rows" :key="i" class="hist__item" :style="{ '--i': Math.min(i, 14) }" ><div class="rowitem hist__row"><span class="hist__delta" :class="m.delta >= 0 ? 'pos' : 'neg'">
              {{ m.delta >= 0 ? "+" : "" }}{{ m.delta }}
            </span><div class="hist__body"><div class="hist__title"><span class="mono hist__code">{{ m.code }}</span><span v-if="m.provisional" class="chip">placement</span></div><p class="rowitem__hint">
                {{ m.teamPlacement ? "Team " : "" }}{{ m.placement + 1 }} of {{ m.teamPlacement ? 2 : m.lobbySize }}, {{ m.beforeElo }} to {{ m.afterElo }} Elo
              </p></div><span class="rowitem__end"><span class="meta hist__when">{{ when(m.at) }}</span><button v-if="m.detail" class="icon-btn" :aria-expanded="String(open.has(i))" :aria-label="`${open.has(i) ? 'Hide' : 'Show'} breakdown for match ${m.code}`" :aria-controls="`match-breakdown-${i}`" @click="toggle(i)" ><AppIcon name="chevron" /></button></span></div><Transition name="expand"><div v-if="m.detail && open.has(i)" :id="`match-breakdown-${i}`" class="hist__detail"><div class="hist__detail-in"><div class="bd"><template v-if="m.detail.ratingSystem === 'ranked-performance-v1'"><p>{{ num(m.detail.score) }} total points from {{ m.detail.tags }} tags and {{ num(m.detail.survivalSeconds) }} seconds uninfected.</p><p class="meta">Tag points include the adjustment for your opponents' Elo.</p><div v-if="m.detail.expectedPerformance !== null" class="bd__row"><span class="figure__key">Expected result</span><div class="bar bar--grow"><span :style="{ width: pct(m.detail.expectedPerformance) }" /></div><span class="num">{{ pct(m.detail.expectedPerformance) }}</span></div><div v-if="m.detail.actualPerformance !== null" class="bd__row"><span class="figure__key">Round result</span><div class="bar bar--grow"><span :style="{ width: pct(m.detail.actualPerformance) }" /></div><span class="num">{{ pct(m.detail.actualPerformance) }}</span></div><p v-if="m.detail.protected" class="meta">Fewer than 30 total points: your Elo change is 0, including if you left early.</p><template v-else><p class="meta">Your points, the score gap and your opponents' Elo determine your Elo change.</p><p v-if="m.detail.streakMultiplier > 1" class="meta">{{ m.detail.streakMultiplier }}x streak bonus for consecutive wins above expectations.</p><p v-if="m.detail.leavePenalty > 0" class="meta">Leaving penalty: {{ num(m.detail.leavePenalty) }} Elo.</p></template></template><template v-else-if="m.detail.ratingSystem === 'openskill'"><p>{{ num(m.detail.tags * 30) }} tag points + {{ num(m.detail.survivalSeconds) }} runtime points = {{ num(m.detail.score) }} points</p><p v-if="track === 'scrim'">Team score: {{ num(m.detail.teamScore) }}</p><p class="meta">Your result and the strength of your opponents determine your Elo change.</p></template><template v-else><div class="bd__row"><span class="figure__key">Placement</span><div class="bar bar--grow"><span :style="{ width: pct(m.detail.place01) }" /></div><span class="num">{{ pct(m.detail.place01) }}</span></div><div class="bd__row"><span class="figure__key">Performance</span><div class="bar bar--grow"><span :style="{ width: pct(m.detail.perf01) }" /></div><span class="num">{{ pct(m.detail.perf01) }}</span></div><p class="meta">
                  {{ movers(m.detail).join(", ") || "nothing notable" }}
                  <template v-if="m.detail.eventMultiplier > 1">
                    plus a {{ m.detail.eventMultiplier }}x weekend boost on the gain
                  </template></p></template></div></div></div></Transition></li></ol></template><div v-if="!hasBreakdown && rows.length" class="card upsell hist__up"><p class="meta">
        A subscription shows match points, tags, untagged runtime and rating changes.
      </p><NuxtLink class="btn btn--brand" to="/subscribe">See the plans</NuxtLink></div><div v-if="capped" class="card upsell hist__up"><p class="meta">Showing your last {{ reach }} rounds of {{ total }}. A subscription lifts the cap.</p><NuxtLink class="btn btn--brand" to="/subscribe">See the plans</NuxtLink></div><div v-if="pages > 1" class="pager"><button class="btn btn--ghost" :disabled="page === 0" @click="page--"><AppIcon name="arrowLeft" />Newer
      </button><span class="meta num">Page {{ page + 1 }} of {{ pages }}</span><button class="btn btn--ghost" :disabled="page + 1 >= pages" @click="page++">
        Older<AppIcon name="arrowRight" /></button></div></main>
</template>
<style scoped>
.hist__sk{height:64px;margin-bottom:var(--gap-8)}
.hist__sk:last-child{margin-bottom:0}
.hist__sum{--accent:var(--color-brand);margin-bottom:var(--gap-16)}
.hist__up{margin-top:var(--gap-16)}
.hist{padding:var(--gap-4) var(--gap-16);margin:0;list-style:none}
.hist__item{--i:0;animation:rise 420ms var(--ease-ios) both;animation-delay:calc(var(--i) * 24ms)}
.hist__row{align-items:center;gap:var(--gap-16);padding:var(--gap-12) 0}
.hist__delta{min-width:4.25rem;flex:none;display:inline-flex;align-items:center;justify-content:center;height:34px;padding:0 var(--gap-8);border-radius:var(--radius-md);background:color-mix(in srgb, currentColor 13%, transparent);font-size:var(--text-16);font-weight:var(--weight-extrabold);font-variant-numeric:tabular-nums}
.hist__body{min-width:0}
.hist__title{display:flex;align-items:center;gap:var(--gap-8);flex-wrap:wrap}
.hist__code{color:var(--color-text-primary);font-weight:var(--weight-bold);letter-spacing:0.04em}
.hist__when{white-space:nowrap;font-size:var(--text-12)}
.hist__detail{display:grid;grid-template-rows:1fr}
.hist__detail-in{min-height:0;overflow:hidden}
.bd{display:flex;flex-direction:column;gap:var(--gap-8);padding:0 0 var(--gap-16) calc(4.25rem + var(--gap-16))}
.bd__row{display:grid;grid-template-columns:7rem 1fr 3rem;align-items:center;gap:var(--gap-12)}
.bd__row .num{text-align:right;font-size:var(--text-14);color:var(--color-text-primary)}
.expand-enter-active,
.expand-leave-active{transition:grid-template-rows var(--dur-slow) var(--ease-ios),
    opacity var(--dur-base) var(--ease-out)}
.expand-enter-from,
.expand-leave-to{grid-template-rows:0fr;opacity:0}
@media (max-width: 620px){.hist__when{display:none}.bd{padding-left:0}.bd__row{grid-template-columns:5.5rem 1fr 3rem}}
@media (prefers-reduced-motion: reduce){.hist__item{animation:none}}
</style>
