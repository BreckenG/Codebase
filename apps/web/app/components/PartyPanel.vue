<script setup>
const props = defineProps({ invite: { type: String, default: "" } });
const { data, refresh, error } = await useApiFetch("/api/me/party", { key: "party", default: () => null });
const busy = ref("");
const failure = ref("");
const inviteId = ref("");
const now = ref(Date.now());
let poll;
let clock;
const party = computed(() => data.value?.party || null);
const invites = computed(() => data.value?.invites || []);
const match = computed(() => data.value?.match || null);
const sizes = computed(() => data.value?.sizes || ["4v4"]);
const maxParty = computed(() => data.value?.maxParty || 4);
const youLead = computed(() => Boolean(party.value?.youLead));
const queued = computed(() => Boolean(party.value?.queuedAt));
const full = computed(() => (party.value?.members.length || 0) >= maxParty.value);
const everyoneReady = computed(() => (party.value?.members || []).every(m => m.ready));
const youReady = computed(() => Boolean(party.value?.members.find(m => m.you)?.ready));
const waited = computed(() => { if (!party.value?.queuedAt) return ""; const s = Math.max(0, Math.floor((now.value - party.value.queuedAt) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; });
const sizeWanted = ref("");
const shownSize = computed(() => sizeWanted.value || party.value?.size || "");
async function setSize(s) { if (shownSize.value === s) return; sizeWanted.value = s; failure.value = ""; try { await apiPost("/api/me/party", { action: "size", arg: s }); for (let i = 0; i < 10; i++) { await refresh(); if (party.value?.size === s) break; await new Promise(r => setTimeout(r, 500)); } if (party.value?.size !== s) failure.value = "The bot has not picked that up yet."; } catch (e) { failure.value = e.message; } finally { sizeWanted.value = ""; } }
async function send(action, arg) { busy.value = action + (arg || ""); failure.value = ""; try { await apiPost("/api/me/party", { action, arg }); for (let i = 0; i < 12; i++) { await new Promise(r => setTimeout(r, 500)); await refresh(); if (!data.value?.pending) break; } if (data.value?.error) failure.value = data.value.error;else if (data.value?.pending) failure.value = "The bot has not picked that up yet, it may be offline."; } catch (e) { failure.value = e.message; } finally { busy.value = ""; } }
async function commit(action, arg) { await send(action, arg); if (failure.value) throw new Error(failure.value); }
const hits = ref([]);
const selected=ref([]),inviting=ref(false),searchInput=ref(null);
const capacity=computed(()=>Math.max(0,Math.min(3,maxParty.value-(party.value?.members.length||1))));
const availableHits=computed(()=>hits.value.filter(h=>!selected.value.some(s=>s.discordId===h.discordId)));
const {toast}=useToast();
const searching = ref(false);
let debounce;
let searchVersion=0;
const searchError=ref("");
function onSearch(e){const q=e.target.value,version=++searchVersion;inviteId.value=q;clearTimeout(debounce);hits.value=[];searchError.value="";searching.value=q.trim().length>=2;if(!searching.value)return;debounce=setTimeout(async()=>{try{const r=await apiGet("/api/me/party/search",{query:{q}});if(version===searchVersion)hits.value=r?.hits||[]}catch(e){if(version===searchVersion)searchError.value=e?.data?.statusMessage||"Search failed. Try again."}finally{if(version===searchVersion)searching.value=false}},250);}
function pick(hit){if(inviting.value||selected.value.length>=capacity.value||selected.value.some(p=>p.discordId===hit.discordId))return;selected.value=[...selected.value,hit];searchVersion++;clearTimeout(debounce);hits.value=[];inviteId.value="";searching.value=false;searchError.value="";nextTick(()=>searchInput.value?.focus());}
function removeSelection(id){if(!inviting.value)selected.value=selected.value.filter(p=>p.discordId!==id);nextTick(()=>searchInput.value?.focus());}
function chooseFirst(){if(availableHits.value.length)pick(availableHits.value[0]);}
async function sendInvite(){if(inviting.value||busy.value||!selected.value.length)return;inviting.value=true;const errors=[];let sent=0;try{for(const hit of [...selected.value]){await send("invite",hit.discordId);if(failure.value)errors.push(`${hit.name||hit.username||hit.discordId}: ${failure.value}`);else{selected.value=selected.value.filter(p=>p.discordId!==hit.discordId);sent++}}failure.value=errors.join(" ");if(sent)toast(sent===1?"Invitation sent":`${sent} invitations sent`)}finally{inviting.value=false}}
watch(()=>party.value?.members.map(m=>m.discordId).join(","),()=>{selected.value=selected.value.filter(s=>!party.value?.members.some(m=>m.discordId===s.discordId)).slice(0,capacity.value)});
watch(queued, on => { if (on) now.value = Date.now(); });
onMounted(() => { poll = setInterval(() => { if (!document.hidden) refresh(); }, 5000); clock = setInterval(() => { if (queued.value) now.value = Date.now(); }, 1000); });
onBeforeUnmount(() => { searchVersion++; clearTimeout(debounce); clearInterval(poll); clearInterval(clock); });
</script>
<template>
<div class="slab party"><div class="row between party__head"><h2 class="card-title">Party and queue</h2><span class="chip" :class="{ 'chip--live': queued }"><span v-if="queued" class="dot dot--beat" />
        {{ party ? party.members.length + " / " + maxParty : "Not in a party" }}
      </span></div><div v-if="error" class="world-error" role="alert"><p>Could not load your party.</p><button class="btn" @click="refresh">Try again</button></div><div v-else-if="match" class="party__match" role="status"><div><span class="title mono">{{ match.code || "spawning" }}</span><p class="meta">Match in progress, {{ match.size }}</p></div><span class="chip chip--live"><span class="dot dot--beat" />{{ match.state }}</span><RoomJoinButton v-if="match.code" :code="match.code" /></div><template v-else><TransitionGroup name="party-list" tag="div" class="party__members"><div v-for="m in party?.members || []" :key="m.discordId" class="list-row"><PlayerAvatar :name="m.name" :src="m.avatar" :discord-id="m.discordId || ''" :size="28" /><span class="title">{{ m.name }}</span><span v-if="m.leader" class="chip"><AppIcon name="crown" />Leader</span><span v-if="m.rank" class="meta">{{ m.rank }}</span><span class="grow" /><span class="chip" :class="{ 'chip--live': m.ready }"><AppIcon v-if="m.ready" name="check" />{{ m.ready ? "ready" : "not ready" }}
          </span><button v-if="youLead && !m.you && !queued" class="icon-btn" :disabled="busy !== ''" :aria-label="`Remove ${m.name} from party`" @click="send('kick', m.discordId)" ><AppIcon name="x" /></button></div></TransitionGroup><TransitionGroup name="party-list" tag="div" class="party__invites"><div v-for="i in invites" :key="i.discordId" class="list-row"><PlayerAvatar :name="i.name" :src="i.avatar" :discord-id="i.discordId || ''" :size="28" /><span class="title">{{ i.name }}</span><span class="meta">invited you</span><span class="grow" /><button class="btn btn--brand" :disabled="busy !== ''" :aria-label="`Accept invitation from ${i.name}`" @click="send('accept', i.discordId)">
            Accept
          </button><button class="btn btn--ghost" :disabled="busy !== ''" :aria-label="`Decline invitation from ${i.name}`" @click="send('decline', i.discordId)">
            Decline
          </button></div></TransitionGroup><div v-if="youLead && !queued && !full" class="party__invite"><div class="party__search"><div class="party__selection"><span v-for="person in selected" :key="person.discordId" class="party__selected"><PlayerAvatar :name="person.name || person.username || person.discordId" :src="person.avatar" :discord-id="person.discordId || ''" :size="22" /><span>{{ person.name || person.username || person.discordId }}</span><button type="button" class="icon-btn" :disabled="inviting" :aria-label="`Remove ${person.name || person.username || person.discordId} from invitations`" @click="removeSelection(person.discordId)"><AppIcon name="x" /></button></span><label class="party__input"><AppIcon name="search" /><input ref="searchInput" :value="inviteId" :disabled="inviting || selected.length >= capacity" :placeholder="selected.length >= capacity ? 'Ready to invite' : selected.length ? 'Add another player' : 'Search for players'" aria-label="Search for someone to invite" autocomplete="off" @input="onSearch" @keydown.enter.prevent="chooseFirst" /></label></div><div v-if="availableHits.length" class="party__hits"><button v-for="h in availableHits" :key="h.discordId" class="party__hit" :disabled="inviting || selected.length >= capacity" :aria-label="`Add ${h.name || h.username || h.discordId} to invitations`" @click="pick(h)"><PlayerAvatar :name="h.name || h.username || '?'" :src="h.avatar" :discord-id="h.discordId || ''" :size="26" /><span class="title">{{ h.name || h.username || h.discordId }}</span><span v-if="h.username && h.name" class="meta">@{{ h.username }}</span><span class="grow" /><span v-if="h.rank" class="meta">{{ h.rank }}</span></button></div><p v-else-if="searchError" class="meta bad" role="alert">{{ searchError }}</p><p v-else-if="inviteId.trim().length >= 2 && !searching" class="meta party__nohits">No other connected players match.</p><p v-if="selected.length" class="meta party__selection-count">{{ selected.length }} / {{ capacity }} selected</p></div><button class="btn" :disabled="busy !== '' || inviting || !selected.length" @click="sendInvite">{{ inviting ? 'Inviting...' : selected.length > 1 ? `Invite ${selected.length} players` : 'Invite' }}</button></div><div v-if="youLead && !queued" class="party__sizes" role="group" aria-label="Match size"><button v-for="s in sizes" :key="s" class="tab" :class="{ 'is-selected': shownSize === s }" :aria-pressed="shownSize === s" :disabled="busy !== ''" @click="setSize(s)" >
          {{ s }}
        </button></div><p v-if="failure" class="meta bad" role="alert">{{ failure }}</p><div class="party__actions"><button v-if="queued" class="btn btn--outline btn--large party__queue" :disabled="busy !== ''" @click="send('cancel')"><span class="dot dot--beat" />Searching {{ waited }}, cancel
        </button><ActionButton v-else-if="!youReady" class="party__queue" icon="check" :action="() => commit('ready')" done-label="Ready" fail-label="Could not ready up" >
          Ready up
        </ActionButton><ActionButton v-else-if="youLead && everyoneReady" class="party__queue" icon="play" :action="() => commit('play')" done-label="Searching" fail-label="Could not start" >
          Start search
        </ActionButton><button v-else class="btn btn--large party__queue" disabled>
          {{ youLead ? "Waiting on your party" : "Waiting on the party leader" }}
        </button><button v-if="youReady && !queued" class="btn btn--ghost" :disabled="busy !== ''" @click="send('ready')">
          Not ready
        </button><button v-if="party && party.members.length > 1" class="btn btn--ghost" :disabled="busy !== ''" @click="send('leave')">
          Leave
        </button><a v-if="invite" class="btn btn--ghost" :href="invite"><AppIcon name="discord" />Discord</a></div></template></div>
</template>

<style scoped>
.party__selection{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:7px 10px;border:1px solid var(--color-divider);border-radius:var(--radius-md);background:var(--surface-2)}
.party__selection:focus-within{border-color:var(--color-brand)}
.party__selected{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:3px 4px 3px 5px;border-radius:6px;background:var(--surface-4);font-size:13px}
.party__selected>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.party__selected .icon-btn{width:26px;height:26px;flex:none}
.party__input{display:flex;align-items:center;gap:8px;flex:1;min-width:130px}.party__input>svg{flex:none;width:16px;height:16px}.party__input input{width:100%;min-width:0;border:0;background:transparent;color:inherit;outline:0;padding:6px 0;font:inherit}.party__selection-count{margin-top:6px}
@media(max-width:600px){.party__invite{flex-direction:column;align-items:stretch}.party__invite>.btn{width:100%}.party__selection{width:100%}}
</style>
