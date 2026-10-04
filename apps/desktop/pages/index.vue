<script setup>
import { RANKED_SLOTS } from '@ranked-world/ranks';
const { me } = useMe();
const { data, pending, error, refresh } = await useApiFetch('/api/me/player', { key: 'launcher-player', default: () => ({ player: null }) });
const { data: rooms, pending: loadingCodes, error: codeError, refresh: refreshCodes } = await useApiFetch('/api/codes', { key: 'launcher-codes', default: () => ({ codes: [] }) });
const lastPlayer = shallowRef(null), lastCodes = shallowRef([]);
watch(() => data.value?.player, p => { if (p) lastPlayer.value = p; }, { immediate: true });
watch(() => rooms.value?.codes, c => { if (c && !codeError.value) lastCodes.value = c; }, { immediate: true });
const player = computed(() => data.value?.player || (error.value ? lastPlayer.value : null)), linked = computed(() => Boolean(player.value?.linked));
const mode = ref('ranked'), track = computed(() => player.value?.[mode.value]);
const codes = computed(() => ((codeError.value ? lastCodes.value : rooms.value?.codes) || []).filter(c => c.active));
const rounds = computed(() => (player.value?.matches || []).filter(m => (m.track || 'ranked') === mode.value).slice(0, 6));
const series = computed(() => (player.value?.matches || []).filter(m => (m.track || 'ranked') === mode.value && Number.isFinite(m.afterElo)).reverse());
const trend = computed(() => {
  const s = series.value;
  if (s.length < 2) return null;
  const vals = [s[0].afterElo - (s[0].delta || 0), ...s.map(m => m.afterElo)];
  const lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(1, hi - lo);
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * 600, 104 - ((v - lo) / span) * 88]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return { line, area: line + ' L600 120 L0 120 Z', change: vals[vals.length - 1] - vals[0], count: s.length, end: pts[pts.length - 1] };
});
const KEY = 'rw-launcher-seen';
const since = ref(null), rankUp = ref(null);
let base = null;
function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} }
watch(player, p => {
  if (!import.meta.client || !p?.linked || !p.ranked) return;
  const r = p.ranked, now = { id: p.discordId || p.photonId, elo: r.elo, rounds: r.rounds, wins: r.wins, peak: r.peakElo, index: r.tier?.index ?? 0 };
  const prev = read();
  if (!base) base = prev && prev.id === now.id ? prev : now;
  if (base.id === now.id) {
    const played = now.rounds - base.rounds;
    since.value = played > 0 ? { elo: now.elo - base.elo, rounds: played, wins: now.wins - base.wins, best: now.elo > base.peak } : null;
  }
  if (prev && prev.id === now.id && now.index > prev.index) rankUp.value = { tier: r.tier, gain: now.elo - base.elo };
  save(now);
}, { immediate: true });
const desktop = useDesktop();
const { toast } = useToast();
const { data: social, refresh: refreshFriends } = await useApiFetch('/api/me/friends', { key: 'launcher-friends', default: () => ({ friends: [] }) });
const { data: partyData, refresh: refreshParty } = await useApiFetch('/api/me/party', { key: 'launcher-party', default: () => null });
const friends = computed(() => social.value?.friends || []), online = computed(() => friends.value.filter(f => f.online).length);
const party = computed(() => partyData.value?.party), match = computed(() => partyData.value?.match), queued = computed(() => Boolean(party.value?.queuedAt));
const partyBusy = ref(false);
async function partySend(action) {
  if (partyBusy.value) return;
  partyBusy.value = true;
  try { await apiPost('/api/me/party', { action }); await refreshParty(); } catch (e) { toast(e?.data?.statusMessage || 'That did not go through. Try again.', 'bad'); } finally { partyBusy.value = false; }
}
const place = n => { const k = n + 1, t = k % 100; return k + (t > 10 && t < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][k % 10] || 'th'); };
const SESSION = 'rw-launcher-session';
const ended = ref(null);
function session() { try { return JSON.parse(localStorage.getItem(SESSION) || 'null'); } catch { return null; } }
watch(() => [desktop.status.value?.gameRunning, player.value?.ranked?.rounds], ([running]) => {
  const p = player.value;
  if (!import.meta.client || running == null || !p?.linked || !p.ranked) return;
  const cur = session();
  if (running && !cur) { try { localStorage.setItem(SESSION, JSON.stringify({ at: Date.now(), rounds: p.ranked.rounds, elo: p.ranked.elo, wins: p.ranked.wins })); } catch {} ended.value = null; }
  if (!running && cur) { ended.value = { ...cur, until: Date.now() }; try { localStorage.removeItem(SESSION); } catch {} }
}, { immediate: true });
const recap = computed(() => {
  const e = ended.value, p = player.value;
  if (!e || !p?.ranked) return null;
  const played = p.ranked.rounds - e.rounds;
  if (played <= 0) return null;
  const list = (p.matches || []).filter(m => (m.track || 'ranked') === 'ranked' && new Date(m.at).getTime() >= e.at);
  const best = list.length ? Math.min(...list.map(m => m.placement ?? 99)) : null;
  return { rounds: played, elo: p.ranked.elo - e.elo, wins: p.ranked.wins - e.wins, minutes: Math.max(1, Math.round((e.until - e.at) / 60000)), best: best == null || best === 99 ? null : place(best), tags: list.reduce((n, m) => n + (m.tags || 0), 0) };
});
let seenRounds = null;
watch(() => player.value?.ranked?.rounds, n => {
  if (n == null) return;
  if (seenRounds != null && n > seenRounds) {
    const m = (player.value.matches || []).find(x => (x.track || 'ranked') === 'ranked'), t = player.value.ranked.tier;
    if (m && m.delta != null) {
      const title = signed(m.delta) + ' MMR', body = (m.placement == null ? 'Round scored' : place(m.placement) + ' of ' + m.lobbySize) + (m.code ? ' in ' + m.code : ''), detail = t && !t.isTop ? t.eloToNext + ' MMR to the next division' : '';
      toast(title + ', ' + body, m.delta >= 0 ? 'ok' : 'bad');
      desktop.notify({ kind: m.delta >= 0 ? 'up' : 'down', title, body, detail });
    }
  }
  seenRounds = n;
});
const more = [{ to: '/play?mode=practice', icon: 'target', label: 'Practice' }, { to: '/play?mode=scrims', icon: 'users', label: 'Party and scrims' }, { to: '/replays', icon: 'play', label: 'Replays' }];
const signed = n => (n > 0 ? '+' : n < 0 ? '-' : '') + num(Math.abs(n));
let poll;
let slow = 0;
onMounted(() => { poll = setInterval(() => { refresh(); refreshCodes(); refreshParty(); if (++slow % 4 === 0) refreshFriends(); }, 15000); });
onBeforeUnmount(() => clearInterval(poll));
useHead({ title: 'Home | Ranked World' });
</script>
<template>
<main id="main" class="wrap section launcher-home">
<LauncherHero :player="player" />
<div v-if="since" class="lsince" role="status"><span class="lsince__title">Since last time</span><span class="lsince__chip" :class="since.elo >= 0 ? 'is-up' : 'is-down'" style="--i:0"><AppIcon :name="since.elo >= 0 ? 'trophy' : 'activity'" />{{ signed(since.elo) }} MMR</span><span class="lsince__chip" style="--i:1">{{ since.rounds }} round{{ since.rounds === 1 ? '' : 's' }}</span><span v-if="since.wins > 0" class="lsince__chip" style="--i:2">{{ since.wins }} win{{ since.wins === 1 ? '' : 's' }}</span><span v-if="since.best" class="lsince__chip is-best" style="--i:3"><AppIcon name="sparkles" />New best</span><button class="lsince__close" aria-label="Dismiss" @click="since = null"><AppIcon name="x" /></button></div>
<div class="lgrid">
<div class="lcol">
<section v-if="recap" class="lcard lrecap" role="status"><header class="lcard__head"><h2>Last session</h2><button class="lcard__link" @click="ended = null">Dismiss</button></header><div class="lrecap__big" :class="recap.elo >= 0 ? 'is-up' : 'is-down'">{{ signed(recap.elo) }}<small>MMR</small></div><dl class="lstats"><div><dt>Rounds</dt><dd>{{ recap.rounds }}</dd></div><div><dt>Wins</dt><dd>{{ recap.wins }}</dd></div><div><dt>Best finish</dt><dd>{{ recap.best || '-' }}</dd></div><div><dt>Played</dt><dd>{{ recap.minutes }} min</dd></div></dl></section>
<section v-if="error && !player" class="lcard lcard--empty" role="alert"><p>Could not load your stats.</p><button class="btn" @click="refresh">Retry</button></section>
<section v-else-if="pending && !player" class="lcard lcard--empty" aria-busy="true" role="status"><span class="lskel" /><span class="lskel lskel--short" /></section>
<section v-else-if="!linked" class="lcard lstart"><h2>Get set up</h2><ol><li :class="me.user ? 'is-done' : 'is-now'"><span class="lstart__mark"><AppIcon v-if="me.user" name="check" /><template v-else>1</template></span>Sign in with Discord</li><li :class="me.user ? 'is-now' : ''"><span class="lstart__mark">2</span>Connect Gorilla Tag<NuxtLink v-if="me.user" to="/play" class="btn btn--brand">Connect</NuxtLink></li><li><span class="lstart__mark">3</span>Join a ranked code</li></ol></section>
<section v-else class="lcard ltrend"><header class="lcard__head"><div class="lseg" role="tablist" aria-label="Track"><button v-for="key in ['ranked', 'scrim']" :key="key" role="tab" :aria-selected="mode === key" @click="mode = key">{{ key === 'ranked' ? 'Ranked' : 'Scrims' }}</button></div><span v-if="trend" class="ltrend__change" :class="trend.change >= 0 ? 'is-up' : 'is-down'">{{ signed(trend.change) }} over {{ trend.count }} rounds</span></header><div class="ltrend__big"><CountUp :value="track?.elo || 0" /><small>MMR</small></div><svg v-if="trend" :key="mode + trend.line" class="ltrend__svg" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ltrend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ee862a" stop-opacity=".32" /><stop offset="1" stop-color="#ee862a" stop-opacity="0" /></linearGradient></defs><path class="ltrend__area" :d="trend.area" fill="url(#ltrend-fill)" /><path class="ltrend__line" :d="trend.line" /><circle class="ltrend__dot" :cx="trend.end[0]" :cy="trend.end[1]" r="5" /></svg><p v-else class="lcard__note">Play a few rounds to see your trend.</p><dl class="lstats"><div><dt>Win rate</dt><dd>{{ track?.winRate ?? 0 }}%</dd></div><div><dt>Rounds</dt><dd><CountUp :value="track?.rounds || 0" /></dd></div><div><dt>Best</dt><dd><CountUp :value="track?.peakElo || 0" /></dd></div><div><dt>Streak</dt><dd :class="{ 'is-hot': (track?.winStreak || 0) >= 2 }"><AppIcon v-if="(track?.winStreak || 0) >= 2" name="flame" />{{ track?.winStreak || 0 }}</dd></div></dl></section>
<section class="lcard lrounds"><header class="lcard__head"><h2>Recent rounds</h2><NuxtLink to="/history" class="lcard__link">History<AppIcon name="arrowRight" /></NuxtLink></header><ol v-if="rounds.length"><li v-for="(round, i) in rounds" :key="(round.at || '') + i" :style="{ '--i': i }"><span class="lrounds__place" :class="{ 'is-win': round.placement === 0 }"><AppIcon v-if="round.placement === 0" name="crown" /><template v-else>{{ round.placement == null ? '-' : '#' + (round.placement + 1) }}</template></span><span class="lrounds__code"><strong>{{ round.code || (round.category ? round.category + ' code' : 'Round') }}</strong><small>{{ round.at ? ago(round.at) : '' }}</small></span><span class="lrounds__delta" :class="round.delta > 0 ? 'is-up' : round.delta < 0 ? 'is-down' : ''">{{ round.delta == null ? '-' : signed(round.delta) }}</span></li></ol><p v-else class="lcard__note">{{ linked ? 'No rounds yet.' : 'Your rounds show up here.' }}</p></section>
</div>
<div class="lcol">
<section class="lcard lcodes"><header class="lcard__head"><h2><span class="llive" aria-hidden="true" />Live codes</h2><span v-if="codes.length" class="lcard__count">{{ codes.length }}</span></header><VoiceConsentNotice v-if="rooms?.reason === 'voice-consent'" :version="rooms.version" @accepted="refreshCodes" /><p v-else-if="loadingCodes && !codes.length" class="lcard__note" role="status">Loading...</p><div v-else-if="codeError && !codes.length" class="lcard__note" role="alert">Codes did not load. <button class="lcard__link" @click="refreshCodes">Retry</button></div><ul v-else-if="codes.length"><li v-for="code in codes.slice(0, 4)" :key="code.code"><div class="lcodes__top"><strong>{{ code.code }}</strong><span class="lcodes__tag">{{ code.category || rooms.bracket }}</span><span v-if="(code.count ?? 0) >= RANKED_SLOTS - 2" class="lcodes__hot">Almost full</span></div><span class="lcodes__seats" :aria-label="(code.count ?? 0) + ' of ' + RANKED_SLOTS + ' players'"><i v-for="n in RANKED_SLOTS" :key="n" :class="{ 'is-on': n <= (code.count ?? 0) }" :style="{ '--n': n }" /></span><RoomJoinButton :code="code.code" /></li></ul><p v-else class="lcard__note">{{ linked ? 'No codes open right now.' : 'Connect your account to see codes.' }}</p><NuxtLink to="/play" class="lcard__foot">All codes<AppIcon name="arrowRight" /></NuxtLink></section>
<section v-if="linked" class="lcard lscrim"><header class="lcard__head"><h2>Scrims</h2><NuxtLink to="/play?mode=scrims" class="lcard__link">Party</NuxtLink></header><template v-if="match"><p class="lscrim__state"><strong>{{ match.code || 'Preparing your room' }}</strong><span>{{ match.size }} {{ match.state }}</span></p><RoomJoinButton v-if="match.code" :code="match.code" /></template><template v-else-if="queued"><p class="lscrim__state"><strong>Finding a {{ party.size }}</strong><span>{{ party.searching || 0 }} of {{ party.need }} players in queue</span></p><button class="btn" :disabled="partyBusy" @click="partySend('cancel')">Leave queue</button></template><template v-else><p class="lscrim__state"><strong>{{ party?.size || '4v4' }} {{ (party?.ruleset || 'gtc').toUpperCase() }}</strong><span>{{ (party?.members?.length || 1) === 1 ? 'Solo, you get teammates from the queue' : party.members.length + ' in your party' }}</span></p><button class="btn btn--brand" :disabled="partyBusy || (party && !party.youLead)" @click="partySend('play')">{{ party && !party.youLead ? 'Your leader queues' : 'Queue for a scrim' }}</button></template><p v-if="partyData?.error" class="lcard__note" role="alert">{{ partyData.error }}</p></section><section v-if="linked" class="lcard lfriends"><header class="lcard__head"><h2>Friends</h2><span v-if="online" class="lcard__count">{{ online }} on</span></header><ul v-if="friends.length"><li v-for="f in friends.slice(0, 6)" :key="f.discordId"><PlayerAvatar :name="f.name" :src="f.avatar" :discord-id="f.discordId" :size="30" /><NuxtLink :to="'/player/' + f.discordId" class="lfriends__who"><strong>{{ f.name }}</strong><small>{{ f.rank }}</small></NuxtLink><span class="lfriends__state" :class="{ 'is-on': f.online }">{{ f.online ? 'In a ' + f.category + ' room' : 'Offline' }}</span></li></ul><p v-else class="lcard__note">No friends added yet. Add them from /panel in Discord.</p><NuxtLink v-if="friends.length > 6" to="/leaderboard?sort=friends" class="lcard__foot">All {{ friends.length }} friends</NuxtLink></section><nav class="lcard lmore" aria-label="More"><NuxtLink v-for="m in more" :key="m.to" :to="m.to"><span class="lmore__icon"><AppIcon :name="m.icon" /></span>{{ m.label }}<AppIcon name="arrowRight" class="lmore__go" /></NuxtLink></nav>
</div>
</div>
<LauncherRankUp v-if="rankUp" :tier="rankUp.tier" :gain="rankUp.gain" @close="rankUp = null" />
</main>
</template>
