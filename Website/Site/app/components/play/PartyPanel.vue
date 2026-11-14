<script setup>
defineProps({ invite: { type: String, default: '' } });
const { data, refresh, error } = await useApiFetch('/api/me/party', { key: 'party', default: () => null });
const { toast } = useToast();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const who = (p) => p.name || p.username || p.discordId;
const busy = ref('');
const failure = ref('');
const inviteId = ref('');
const now = ref(Date.now());
let poll;
let clock;
const party = computed(() => data.value?.party || null);
const invites = computed(() => data.value?.invites || []);
const match = computed(() => data.value?.match || null);
const rulesets = computed(() => data.value?.rulesets || { gtc: { label: 'GTC', sizes: ['4v4'] } });
const label = (key) => rulesets.value[key]?.label || 'GTC';
const rulesetWanted = ref('');
const shownRuleset = computed(() => rulesetWanted.value || party.value?.ruleset || 'gtc');
const sizes = computed(() => rulesets.value[shownRuleset.value]?.sizes || data.value?.sizes || ['4v4']);
const maxParty = computed(() => data.value?.maxParty || 4);
const youLead = computed(() => Boolean(party.value?.youLead));
const queued = computed(() => Boolean(party.value?.queuedAt));
const full = computed(() => (party.value?.members.length || 0) >= maxParty.value);
const everyoneReady = computed(() => (party.value?.members || []).every((m) => m.ready));
const youReady = computed(() => Boolean(party.value?.members.find((m) => m.you)?.ready));
const found = computed(() => party.value?.searching || 1);
const need = computed(() => party.value?.need || 8);
const waited = computed(() => {
  if (!party.value?.queuedAt) return '';
  const s = Math.max(0, Math.floor((now.value - party.value.queuedAt) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
});
const queueText = computed(() => {
  if (found.value >= need.value) return 'Enough players found, building the match.';
  const rest = `${label(party.value.ruleset)} ${party.value.size}. Searches stop after 30 minutes.`;
  return `The match starts when ${need.value - found.value} more players search for ${rest}`;
});
const sizeWanted = ref('');
const shownSize = computed(() => sizeWanted.value || party.value?.size || '');

async function setPick(action, wanted, value) {
  wanted.value = value;
  failure.value = '';
  try {
    await apiPost('/api/me/party', { action, arg: value });
    for (let i = 0; i < 10; i++) {
      await refresh();
      if (party.value?.[action] === value) break;
      await wait(500);
    }
    if (party.value?.[action] !== value) failure.value = 'The bot has not picked that up yet.';
  } catch (e) {
    failure.value = e.message;
  } finally {
    wanted.value = '';
  }
}

function setSize(s) {
  if (shownSize.value !== s) setPick('size', sizeWanted, s);
}

function setRuleset(r) {
  if (shownRuleset.value !== r) setPick('ruleset', rulesetWanted, r);
}

async function send(action, arg) {
  busy.value = action + (arg || '');
  failure.value = '';
  try {
    await apiPost('/api/me/party', { action, arg });
    for (let i = 0; i < 12; i++) {
      await wait(500);
      await refresh();
      if (!data.value?.pending) break;
    }
    if (data.value?.error) failure.value = data.value.error;
    else if (data.value?.pending) failure.value = 'The bot has not picked that up yet, it may be offline.';
  } catch (e) {
    failure.value = e.message;
  } finally {
    busy.value = '';
  }
}

async function commit(action, arg) {
  await send(action, arg);
  if (failure.value) throw new Error(failure.value);
}

const hits = ref([]);
const selected = ref([]);
const inviting = ref(false);
const searchInput = ref(null);
const searching = ref(false);
const searchError = ref('');
const capacity = computed(() => Math.max(0, Math.min(3, maxParty.value - (party.value?.members.length || 1))));
const availableHits = computed(() =>
  hits.value.filter((h) => !selected.value.some((s) => s.discordId === h.discordId)),
);
const placeholder = computed(() => {
  if (selected.value.length >= capacity.value) return 'Ready to invite';
  return selected.value.length ? 'Add another player' : 'Search for players';
});
const inviteLabel = computed(() => {
  if (inviting.value) return 'Inviting...';
  return selected.value.length > 1 ? `Invite ${selected.value.length} players` : 'Invite';
});
let debounce;
let searchVersion = 0;

function onSearch(e) {
  const q = e.target.value;
  const version = ++searchVersion;
  inviteId.value = q;
  clearTimeout(debounce);
  hits.value = [];
  searchError.value = '';
  searching.value = q.trim().length >= 2;
  if (!searching.value) return;
  debounce = setTimeout(async () => {
    try {
      const r = await apiGet('/api/me/party/search', { query: { q } });
      if (version === searchVersion) hits.value = r?.hits || [];
    } catch (err) {
      if (version === searchVersion) searchError.value = err?.data?.statusMessage || 'Search failed. Try again.';
    } finally {
      if (version === searchVersion) searching.value = false;
    }
  }, 250);
}

function pick(hit) {
  if (inviting.value || selected.value.length >= capacity.value) return;
  if (selected.value.some((p) => p.discordId === hit.discordId)) return;
  selected.value = [...selected.value, hit];
  searchVersion++;
  clearTimeout(debounce);
  hits.value = [];
  inviteId.value = '';
  searching.value = false;
  searchError.value = '';
  nextTick(() => searchInput.value?.focus());
}

function removeSelection(id) {
  if (!inviting.value) selected.value = selected.value.filter((p) => p.discordId !== id);
  nextTick(() => searchInput.value?.focus());
}

function chooseFirst() {
  if (availableHits.value.length) pick(availableHits.value[0]);
}

async function sendInvite() {
  if (inviting.value || busy.value || !selected.value.length) return;
  inviting.value = true;
  const errors = [];
  let sent = 0;
  try {
    for (const hit of [...selected.value]) {
      await send('invite', hit.discordId);
      if (failure.value) {
        errors.push(`${who(hit)}: ${failure.value}`);
        continue;
      }
      selected.value = selected.value.filter((p) => p.discordId !== hit.discordId);
      sent++;
    }
    failure.value = errors.join(' ');
    if (sent) toast(sent === 1 ? 'Invitation sent' : `${sent} invitations sent`);
  } finally {
    inviting.value = false;
  }
}

watch(
  () => party.value?.members.map((m) => m.discordId).join(','),
  () => {
    const fresh = selected.value.filter((s) => !party.value?.members.some((m) => m.discordId === s.discordId));
    selected.value = fresh.slice(0, capacity.value);
  },
);
watch(queued, (on) => {
  if (on) now.value = Date.now();
});
onMounted(() => {
  poll = setInterval(() => {
    if (!document.hidden) refresh();
  }, 5000);
  clock = setInterval(() => {
    if (queued.value) now.value = Date.now();
  }, 1000);
});
onBeforeUnmount(() => {
  searchVersion++;
  clearTimeout(debounce);
  clearInterval(poll);
  clearInterval(clock);
});
</script>

<template>
  <div class="party">
    <div class="section-head">
      <h2>Your party</h2>
      <span class="chip" :class="{ 'chip--live': queued }">
        <span v-if="queued" class="dot" />{{ party ? `${party.members.length} / ${maxParty}` : 'Not in a party' }}
      </span>
    </div>

    <div v-if="error" class="alert" role="alert">
      <p>Could not load your party.</p>
      <button class="btn btn--small" @click="refresh">Try again</button>
    </div>

    <section v-else-if="match" class="live panel" role="status">
      <span class="chip chip--live"><span class="dot" />{{ match.state }}</span>
      <h3 class="live__code">{{ match.code || 'spawning' }}</h3>
      <p class="meta">Match in progress, {{ label(match.ruleset) }} {{ match.size }}</p>
      <div class="party__actions">
        <RoomJoinButton v-if="match.code" :code="match.code" />
        <button v-if="match.canStop" class="btn btn--ghost" :disabled="busy !== ''" @click="send('stop')">
          Stop scrim
        </button>
      </div>
      <p v-if="failure" class="bad" role="alert">{{ failure }}</p>
    </section>

    <template v-else>
      <TransitionGroup name="party-list" tag="div" class="rows party__list">
        <div v-for="m in party?.members || []" :key="m.discordId" class="row">
          <PlayerAvatar :name="m.name" :src="m.avatar" :discord-id="m.discordId || ''" :size="40" />
          <div class="party__who">
            <strong>{{ m.name }}</strong>
            <span class="meta">
              <template v-if="m.leader">Leader</template><template v-if="m.leader && m.rank"> / </template>{{ m.rank }}
            </span>
          </div>
          <span class="chip" :class="{ 'chip--live': m.ready }"
            ><AppIcon v-if="m.ready" name="check" />{{ m.ready ? 'ready' : 'not ready' }}</span
          >
          <button
            v-if="youLead && !m.you && !queued"
            class="icon-btn"
            :disabled="busy !== ''"
            :aria-label="`Remove ${m.name} from party`"
            @click="send('kick', m.discordId)"
          >
            <AppIcon name="x" />
          </button>
        </div>
        <div v-for="i in invites" :key="`inv-${i.discordId}`" class="row party__inv">
          <PlayerAvatar :name="i.name" :src="i.avatar" :discord-id="i.discordId || ''" :size="40" />
          <div class="party__who">
            <strong>{{ i.name }}</strong
            ><span class="meta">invited you</span>
          </div>
          <button
            class="btn btn--brand btn--small"
            :disabled="busy !== ''"
            :aria-label="`Accept invitation from ${i.name}`"
            @click="send('accept', i.discordId)"
          >
            Accept
          </button>
          <button
            class="btn btn--ghost btn--small"
            :disabled="busy !== ''"
            :aria-label="`Decline invitation from ${i.name}`"
            @click="send('decline', i.discordId)"
          >
            Decline
          </button>
        </div>
      </TransitionGroup>

      <div v-if="youLead && !queued && !full" class="invite">
        <div class="invite__box">
          <span v-for="p in selected" :key="p.discordId" class="invite__pick">
            <PlayerAvatar :name="who(p)" :src="p.avatar" :discord-id="p.discordId || ''" :size="22" />
            <span>{{ who(p) }}</span>
            <button
              type="button"
              class="icon-btn"
              :disabled="inviting"
              :aria-label="`Remove ${who(p)} from invitations`"
              @click="removeSelection(p.discordId)"
            >
              <AppIcon name="x" />
            </button>
          </span>
          <label class="invite__input">
            <AppIcon name="search" />
            <input
              ref="searchInput"
              :value="inviteId"
              :disabled="inviting || selected.length >= capacity"
              :placeholder="placeholder"
              aria-label="Search for someone to invite"
              autocomplete="off"
              @input="onSearch"
              @keydown.enter.prevent="chooseFirst"
            />
          </label>
          <button class="btn btn--small" :disabled="busy !== '' || inviting || !selected.length" @click="sendInvite">
            {{ inviteLabel }}
          </button>
        </div>
        <div v-if="availableHits.length" class="invite__hits">
          <button
            v-for="h in availableHits"
            :key="h.discordId"
            class="row"
            :disabled="inviting || selected.length >= capacity"
            :aria-label="`Add ${who(h)} to invitations`"
            @click="pick(h)"
          >
            <PlayerAvatar
              :name="h.name || h.username || '?'"
              :src="h.avatar"
              :discord-id="h.discordId || ''"
              :size="28"
            />
            <div class="party__who">
              <strong>{{ who(h) }}</strong
              ><span v-if="h.username && h.name" class="meta">@{{ h.username }}</span>
            </div>
            <span v-if="h.rank" class="meta">{{ h.rank }}</span>
          </button>
        </div>
        <p v-else-if="searchError" class="bad" role="alert">{{ searchError }}</p>
        <p v-else-if="inviteId.trim().length >= 2 && !searching" class="meta">No other connected players match.</p>
        <p v-if="selected.length" class="meta">{{ selected.length }} / {{ capacity }} selected</p>
      </div>

      <div v-if="youLead && !queued" class="party__opts">
        <div class="seg" role="group" aria-label="Game mode">
          <button
            v-for="(r, key) in rulesets"
            :key="key"
            :aria-pressed="shownRuleset === key"
            :disabled="busy !== ''"
            @click="setRuleset(key)"
          >
            {{ r.label }}
          </button>
        </div>
        <div class="seg" role="group" aria-label="Match size">
          <button
            v-for="s in sizes"
            :key="s"
            :aria-pressed="shownSize === s"
            :disabled="busy !== ''"
            @click="setSize(s)"
          >
            {{ s }}
          </button>
        </div>
      </div>
      <p v-if="youLead && !queued && rulesets[shownRuleset]?.about" class="meta">{{ rulesets[shownRuleset].about }}</p>
      <p v-else-if="party" class="meta">{{ label(party.ruleset) }} {{ party.size }}</p>
      <p v-if="failure" class="bad" role="alert">{{ failure }}</p>
      <p v-if="queued" class="meta">{{ queueText }}</p>

      <div class="party__actions">
        <button v-if="queued" class="btn btn--outline btn--large" :disabled="busy !== ''" @click="send('cancel')">
          <span class="dot" />{{ found }} of {{ need }} found, {{ waited }}, cancel
        </button>
        <ActionButton
          v-else-if="!youReady"
          icon="check"
          :action="() => commit('ready')"
          done-label="Ready"
          fail-label="Could not ready up"
        >
          Ready up
        </ActionButton>
        <ActionButton
          v-else-if="youLead && everyoneReady"
          icon="play"
          :action="() => commit('play')"
          done-label="Searching"
          fail-label="Could not start"
        >
          Start search
        </ActionButton>
        <button v-else class="btn btn--large" disabled>
          {{ youLead ? 'Waiting on your party' : 'Waiting on the party leader' }}
        </button>
        <button v-if="youReady && !queued" class="btn btn--ghost" :disabled="busy !== ''" @click="send('ready')">
          Not ready
        </button>
        <button
          v-if="party && party.members.length > 1"
          class="btn btn--ghost"
          :disabled="busy !== ''"
          @click="send('leave')"
        >
          Leave
        </button>
        <a v-if="invite" class="btn btn--ghost" :href="invite"><AppIcon name="discord" />Discord</a>
      </div>
    </template>
  </div>
</template>

<style scoped>
.party {
  display: grid;
  gap: 22px;
}
.party .section-head {
  margin: 0;
}
.party__list {
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--panel);
}
.party__list:empty {
  display: none;
}
.party__list .row {
  padding: 14px 18px;
}
.party__who {
  display: grid;
  flex: 1;
  min-width: 0;
}
.party__who strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.party__inv {
  background: color-mix(in srgb, var(--brand) 8%, transparent);
}
.invite {
  display: grid;
  gap: 10px;
}
.invite__box {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 8px 8px 14px;
  border-radius: var(--r);
  border: 1px solid var(--line-2);
  background: var(--raise);
  transition: border-color 0.2s;
}
.invite__box:focus-within {
  border-color: var(--brand);
}
.invite__pick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 3px 4px 3px 5px;
  border-radius: var(--r-sm);
  background: var(--raise-2);
  color: var(--ink);
  font-size: 13px;
}
.invite__pick > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.invite__pick .icon-btn {
  width: 26px;
  height: 26px;
  flex: none;
}
.invite__input {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 150px;
  color: var(--dim);
}
.invite__input svg {
  width: 16px;
  height: 16px;
  flex: none;
}
.invite__input input {
  width: 100%;
  min-width: 0;
  padding: 8px 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  outline: 0;
}
.invite__hits {
  display: grid;
  border-radius: var(--r);
  border: 1px solid var(--line);
  background: var(--panel-solid);
  overflow: hidden;
}
.invite__hits .row {
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
}
.party__opts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.party__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.party-list-enter-active,
.party-list-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s var(--ease);
}
.party-list-enter-from,
.party-list-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
@media (max-width: 600px) {
  .invite__box > .btn {
    width: 100%;
  }
}
</style>
