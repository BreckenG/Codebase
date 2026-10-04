<script setup>
import { rankBadge } from "~/utils/badges";
const route = useRoute();
const router = useRouter();
const { me } = useMe();
const CATEGORIES = [{ key: "LOW", label: "Low", icon: "compass" }, { key: "MID", label: "Mid", icon: "shield" }, { key: "HIGH", label: "High", icon: "swords" }, { key: "TOP", label: "Top", icon: "crown" }];
const PER_PAGE = [20, 50, 100];
const sortsReq = useApiFetch("/api/sorts", { key: "sorts", lazy: import.meta.client, default: () => null });
const SORTS = computed(() => sortsReq.data.value?.sorts || []);
const METRICS = computed(() => sortsReq.data.value?.metrics || []);
const track = ref(route.query.track === "scrim" ? "scrim" : "ranked");
const page = ref(Number(route.query.page || 1));
const per = ref(PER_PAGE.includes(Number(route.query.per)) ? Number(route.query.per) : 20);
const search = ref(String(route.query.q || ""));
const category = ref(String(route.query.category || ""));
const sort = ref(String(route.query.sort || "relevance"));
const metric = ref(String(route.query.metric || "elo"));
const grid = ref(false);
const query = computed(() => ({ track: track.value, page: String(page.value), per: String(per.value), q: search.value || undefined, category: category.value || undefined, sort: sort.value, metric: metric.value }));
const listReq = useApiFetch("/api/leaderboard", { key: "leaderboard", query, lazy: import.meta.client, default: () => null });
await Promise.all([sortsReq, listReq]);
const { data, pending, error, refresh } = listReq;
watch(query, q => router.replace({ query: { ...q } }));
watch(() => route.query, q => { track.value = q.track === "scrim" ? "scrim" : "ranked"; page.value = Number(q.page || 1); per.value = PER_PAGE.includes(Number(q.per)) ? Number(q.per) : 20; search.value = String(q.q || ""); category.value = String(q.category || ""); sort.value = String(q.sort || "relevance"); metric.value = String(q.metric || "elo"); });
let timer;
function clearSearch() { clearTimeout(timer); search.value = ""; page.value = 1; }
function onSearch(e) { clearTimeout(timer); const value = e.target.value.trim(); timer = setTimeout(() => { search.value = value; page.value = 1; }, 300); }
function pickMetric(key) { metric.value = key; page.value = 1; }
function setTrack(t) { track.value = t; page.value = 1; }
function goTo(n) { page.value = Math.min(Math.max(1, n), pages.value); window.scrollTo({ top: 0, behavior: "smooth" }); }
function setPer(n) { per.value = n; page.value = 1; }
function clearAll() { search.value = ""; category.value = ""; metric.value = "elo"; page.value = 1; }
const rows = computed(() => data.value?.rows || []);
const total = computed(() => data.value?.total || 0);
const podium = computed(() => !grid.value && page.value === 1 && !search.value && sort.value === "relevance" && rows.value.length > 3 ? rows.value.slice(0, 3) : []);
const rest = computed(() => rows.value.slice(podium.value.length));
function setSort(key) { sort.value = key; page.value = 1; }
const pages = computed(() => data.value?.pages || 1);
const friendsLocked = computed(() => Boolean(data.value?.friendsLocked));
const activeFilters = computed(() => { let n = 0; if (category.value) n++; if (search.value) n++; if (metric.value !== "elo") n++; return n; });
const metricLabel = computed(() => METRICS.value.find(m => m.key === metric.value)?.label || "MMR");
function clock(sec) { const h = Math.floor((sec || 0) / 3600); const m = Math.round((sec || 0) % 3600 / 60); if (h) return h + "h " + m + "m"; return m + "m"; }
function metricValue(p) { const t = p[track.value]; switch (metric.value) { case "peak": return num(t.peakElo); case "rounds": return num(t.rounds); case "wins": return num(t.wins); case "winrate": return t.winRate + "%"; case "tags": return num(t.tags); case "runtime": return clock(t.survivalSeconds); case "streak": return num(t.winStreak); default: return num(t.elo); } }
const FACTS = [{ key: "winrate", icon: "activity", label: "Win rate", unit: "won", read: t => t.winRate + "%" }, { key: "peak", icon: "crown", label: "Peak MMR", unit: "peak", read: t => num(t.peakElo) }, { key: "streak", icon: "swords", label: "Win streak", unit: "win streak", read: t => num(t.winStreak) }, { key: "wins", icon: "trophy", label: "Wins", unit: "wins", read: t => num(t.wins) }];
const facts = computed(() => { const out = []; for (const f of FACTS) { if (f.key === metric.value) continue; if (out.length >= 2) break; out.push(f); } return out; });
onBeforeUnmount(() => clearTimeout(timer));
useSeo({ title: "Gorilla Tag ranked leaderboard", description: "The Ranked World ladder. Sort competitive Gorilla Tag players by MMR, peak MMR, wins, tags, win streak or time survived, and filter by rank bracket." });
</script>
<template>
<main id="main" class="wrap section"><div class="world-page-title"><div><h1>Leaderboard</h1></div><NuxtLink class="btn" to="/me"><AppIcon name="user" />Your profile</NuxtLink></div><div class="world-ladder-heading"><div class="world-mode-nav" aria-label="Leaderboard track"><button v-for="t in ['ranked','scrim']" :key="t" :aria-pressed="track === t" :class="{selected: track === t}" @click="setTrack(t)">{{ t === 'ranked' ? 'Ranked' : 'Scrims' }}</button></div><span class="meta">{{ num(total) }} players</span></div><div class="world-filterbar"><label class="field world-ladder-search"><AppIcon name="search" /><input type="search" :value="search" @input="onSearch" placeholder="Find a player" aria-label="Search players" /><button v-if="search" class="icon-btn" aria-label="Clear search" @click.prevent="clearSearch"><AppIcon name="x" /></button></label><ThemedSelect :model-value="category" :options="[{ value: '', label: 'All brackets' }, ...CATEGORIES]" label="Bracket" @update:model-value="category = $event; page = 1" /><ThemedSelect :model-value="metric" :options="METRICS" label="Metric" @update:model-value="pickMetric" /><ThemedSelect :model-value="sort" :options="SORTS" label="Order" @update:model-value="setSort" /><button class="icon-btn" :aria-label="grid ? 'Switch to rows' : 'Switch to grid'" @click="grid = !grid"><AppIcon :name="grid ? 'rows' : 'grid'" /></button></div><div class="world-ladder-options"><button v-if="activeFilters" class="btn btn--ghost" @click="clearAll">Clear filters</button><span v-else class="meta">{{ metricLabel }} / {{ category || 'All brackets' }}</span><ThemedSelect class="themed-select--inline" :model-value="per" :options="PER_PAGE" label="Per page" @update:model-value="setPer" /></div><div v-if="friendsLocked" class="world-error"><p class="meta">Friends leaderboards require a subscription. Showing the full ladder.</p><NuxtLink class="btn" to="/subscribe">See plans</NuxtLink></div><div v-if="error" role="alert" class="world-error"><p>We could not load the leaderboard.</p><button class="btn" @click="refresh">Try again</button></div><div v-else-if="pending" class="world-skeleton" aria-label="Loading leaderboard" aria-busy="true" /><div v-else-if="!rows.length" class="world-empty"><h2>{{ activeFilters ? 'No players match.' : 'No ranked players yet' }}</h2><p class="meta">{{ activeFilters ? 'Try a different name or reset your filters.' : 'Play your first ranked rounds to enter the leaderboard.' }}</p><button v-if="activeFilters" class="btn" @click="clearAll">Clear filters</button><NuxtLink v-else class="btn btn--brand" to="/play">Start playing</NuxtLink></div><div v-else class="world-ladder" :class="{ 'world-ladder--grid': grid }"><div v-if="podium.length" class="ladder-podium"><NuxtLink v-for="p in podium" :key="p.discordId" :to="`/player/${p.discordId}`" class="ladder-podium__spot" :class="[tierClass(p[track].tier.name), 'is-' + p.rank]"><span class="ladder-podium__place">{{ p.rank }}</span><PlayerAvatar :name="p.name" :src="p.avatar || p.discord?.avatar || ''" :discord-id="p.discordId || ''" :size="p.rank === 1 ? 72 : 56" /><div class="ladder-podium__who"><strong>{{ p.name }}</strong><small>{{ p[track].tier.name }} / {{ p[track].winRate }}% won / {{ num(p[track].rounds) }} rounds</small></div><img class="ladder-podium__badge" :src="rankBadge(p[track].tier.name)" alt="" /><div class="ladder-podium__value"><strong>{{ metricValue(p) }}</strong><small>{{ metricLabel }}</small></div></NuxtLink></div><div v-if="!grid" class="world-ladder-labels" aria-hidden="true"><span>#</span><span>Player</span><span>Division</span><span>{{ facts[0].label }}</span><span>{{ metricLabel }}</span></div><NuxtLink v-for="p in rest" :key="p.discordId || p.rank" :to="`/player/${p.discordId}`" class="world-ladder-row" :class="{ 'world-ladder-row--you': me.user && p.discordId === me.user.id }"><span class="world-standing">{{ p.rank }}</span><div class="world-player-cell"><PlayerAvatar :name="p.name" :src="p.avatar || p.discord?.avatar || ''" :discord-id="p.discordId || ''" :size="36" /><div><strong>{{ p.name }}</strong><small>{{ num(p[track].rounds) }} rounds / {{ clock(p[track].survivalSeconds) }} survived / {{ num(p[track].tags) }} tags</small></div><span v-if="me.user && p.discordId === me.user.id" class="chip">You</span></div><span class="world-division" :class="tierClass(p[track].tier.name)"><img :src="rankBadge(p[track].tier.name)" alt="" loading="lazy" /><span>{{ p[track].tier.name }}<small>{{ p[track].tier.category }}</small></span></span><span class="world-ladder-fact">{{ facts[0].read(p[track]) }}<small>{{ facts[1].read(p[track]) }} {{ facts[1].unit }}</small></span><strong class="world-ladder-value">{{ metricValue(p) }}</strong></NuxtLink></div><PagerNav v-if="pages > 1" class="world-ladder-pager" :page="page" :pages="pages" @go="goTo" /><AdSlot place="ladder" /></main>
</template>
