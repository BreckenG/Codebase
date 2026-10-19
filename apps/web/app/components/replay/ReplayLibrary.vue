<script setup>
const props = defineProps({ track: { type: String, default: 'ranked' } });
const { data, pending, error, refresh } = await useApiFetch('/api/me/replays', {
  key: 'my-replays',
  lazy: import.meta.client,
  default: () => null,
});
const rows = computed(() =>
  (data.value?.rows || []).filter((r) => (r.kind === 'ranked') === (props.track === 'ranked')),
);
const selected = ref('');
const replay = shallowRef(null);
const loading = ref(false);
const playbackError = ref('');
let generation = 0;
const when = (value) =>
  new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const duration = (value) => `${Math.floor(value / 60000)}m ${Math.floor(value / 1000) % 60}s`;
const basic = computed(() => [
  { label: 'Scored rounds', value: data.value.basic.rounds },
  { label: 'Tags', value: data.value.basic.tags },
  { label: 'Untagged runtime', value: `${data.value.basic.untaggedSeconds}s` },
  { label: 'Wins', value: data.value.basic.wins },
]);
const PREVIEW = [
  { label: 'Distance and speed', value: '123.4 m / 5.6 m/s', blur: true },
  { label: 'Player perspectives', value: 'First person / Third person' },
  { label: 'Replay controls', value: 'Timeline / Free camera' },
];

async function open(row) {
  const current = ++generation;
  selected.value = row.id;
  replay.value = null;
  loading.value = true;
  playbackError.value = '';
  try {
    const value = await apiFetch(`/api/me/replays/${row.id}`);
    if (current === generation) replay.value = value;
  } catch (e) {
    if (current === generation) playbackError.value = e.data?.statusMessage || 'Could not load this replay.';
  } finally {
    if (current === generation) loading.value = false;
  }
}

function close() {
  replay.value = null;
  selected.value = '';
}

watch(data, () => {
  generation++;
  selected.value = '';
  replay.value = null;
  loading.value = false;
});
</script>

<template>
  <div class="rp">
    <div v-if="data && !pending" class="rp__bar">
      <button class="btn btn--ghost btn--small" @click="refresh"><AppIcon name="refresh" />Refresh</button>
    </div>
    <div v-if="pending && !data" class="skeleton" role="status" aria-label="Loading your replay library" />
    <div v-else-if="error" class="empty">
      <h2>Your replays are unavailable</h2>
      <p>{{ error.data?.statusMessage || 'Sign in or try again in a moment.' }}</p>
      <NuxtLink v-if="error.statusCode === 401" class="btn btn--brand" to="/sign-in">
        <AppIcon name="discord" />Sign in
      </NuxtLink>
      <button v-else class="btn btn--brand" @click="refresh">Try again</button>
    </div>
    <template v-else-if="data">
      <section v-show="!replay" class="rp__basic" aria-label="Basic statistics">
        <dl>
          <div v-for="b in basic" :key="b.label" class="stat">
            <dt>{{ b.value }}</dt>
            <dd>{{ b.label }}</dd>
          </div>
        </dl>
        <p class="meta">{{ data.basic.scope }}</p>
      </section>

      <section v-if="data.locked" class="rp__locked panel">
        <div class="rp__copy">
          <span class="rp__tags"><PerkTag /><PerkTag tier="pro" /></span>
          <h2>Watch your rounds back</h2>
          <p>
            Plus includes your 10 most recent eligible replays from 7 days, up to 15 minutes each. Pro includes 100 from
            30 days, up to 60 minutes each. Both include all available replay statistics.
          </p>
          <NuxtLink class="btn btn--brand btn--large" to="/subscribe">Compare plans</NuxtLink>
        </div>
        <div class="rp__preview" aria-label="Locked feature preview. No replay data.">
          <div v-for="p in PREVIEW" :key="p.label" class="rp__line">
            <span class="meta">{{ p.label }}</span>
            <strong :class="{ rp__blur: p.blur }" :aria-hidden="p.blur ? 'true' : undefined">{{ p.value }}</strong>
          </div>
          <p class="meta">Placeholder preview, not your statistics. No replay data is loaded.</p>
        </div>
      </section>

      <div v-else-if="data.consentRequired" class="empty">
        <h2>Replay consent is required</h2>
        <p>Manage your movement recording consent in your account before opening replays.</p>
        <NuxtLink class="btn btn--brand" to="/settings">Account settings</NuxtLink>
      </div>

      <template v-else>
        <div v-if="replay" class="section-head">
          <button class="btn btn--ghost" @click="close"><AppIcon name="arrowLeft" />Back to library</button>
          <span class="meta">{{ replay.map }} / {{ when(replay.startedAt) }}</span>
        </div>
        <div v-else class="section-head">
          <h2>Your library</h2>
          <span class="meta">
            {{ data.rows.length }} / {{ data.limits.count }} replays, last {{ data.limits.days }} days, up to
            {{ data.limits.minutes }} minutes each
          </span>
        </div>
        <div v-if="!rows.length" class="empty">
          <h3>No eligible replays yet</h3>
          <p>
            Completed recordings you participated in appear here within your plan's history window. Recording requires
            consent and available telemetry.
          </p>
          <NuxtLink class="btn btn--brand" to="/play">Find a game</NuxtLink>
        </div>
        <div v-else v-show="!replay" class="rp__grid" aria-label="Your replay library">
          <button
            v-for="(row, i) in rows"
            :key="row.id"
            class="rp__entry reveal-up"
            :class="{ on: selected === row.id }"
            :style="{ '--i': Math.min(i, 12) }"
            :aria-pressed="selected === row.id"
            @click="open(row)"
          >
            <span class="rp__map">{{ row.map }}</span>
            <strong>{{ row.kind.replaceAll('_', ' ') }}</strong>
            <span class="meta">{{ when(row.startedAt) }}</span>
            <span class="rp__foot">
              <span>{{ duration(row.actualDurationMs ?? row.durationMs) }}</span>
              <span class="rp__watch">
                <AppIcon name="play" />{{ selected === row.id ? 'Selected' : 'Watch replay' }}
              </span>
            </span>
            <small v-if="row.clipped" class="meta">Preview first {{ Math.floor(row.durationMs / 60000) }}m</small>
          </button>
        </div>
        <div v-if="loading" class="alert" role="status"><p>Loading the recorded map and player movement...</p></div>
        <div v-else-if="playbackError" class="alert" role="alert">
          <p>{{ playbackError }}</p>
          <button class="btn btn--small" @click="open({ id: selected })">Try again</button>
        </div>
        <ClientOnly><ReplayViewer v-if="replay" :key="replay.id" :replay="replay" /></ClientOnly>
      </template>
    </template>
  </div>
</template>

<style scoped>
.rp__bar {
  display: flex;
  justify-content: flex-end;
  margin: -12px 0 12px;
}
.rp__basic {
  margin-bottom: 48px;
}
.rp__basic dl {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin: 0 0 16px;
}
.rp__locked {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 40px;
  padding: 40px;
  background: radial-gradient(ellipse at 90% 0%, color-mix(in srgb, var(--brand) 12%, transparent), transparent 65%),
    var(--panel);
}
.rp__copy {
  display: grid;
  justify-items: start;
  align-content: center;
  gap: 18px;
}
.rp__tags {
  display: flex;
  gap: 6px;
}
.rp__copy p {
  max-width: 52ch;
}
.rp__preview {
  display: grid;
  align-self: center;
  padding: 8px 24px 20px;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--bg);
}
.rp__line {
  display: grid;
  gap: 6px;
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}
.rp__line strong {
  color: var(--ink);
}
.rp__blur {
  filter: blur(6px);
  user-select: none;
}
.rp__preview > p {
  margin-top: 14px;
  font-size: 12px;
}
.rp__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.rp__entry {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 20px;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text);
  text-align: left;
  transition:
    transform 0.25s var(--ease),
    border-color 0.25s;
}
.rp__entry:hover {
  transform: translateY(-3px);
  border-color: var(--line-2);
}
.rp__entry.on {
  border-color: var(--brand);
  background: color-mix(in srgb, var(--brand) 8%, var(--panel-solid));
}
.rp__map {
  color: var(--brand);
  font-size: 13px;
  font-weight: 700;
}
.rp__entry strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 22px;
  text-transform: capitalize;
}
.rp__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
  font-size: 13px;
}
.rp__watch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink);
  font-weight: 600;
}
.rp__watch svg {
  width: 14px;
  height: 14px;
}
@media (max-width: 860px) {
  .rp__basic dl {
    grid-template-columns: repeat(2, 1fr);
  }
  .rp__locked {
    grid-template-columns: 1fr;
    padding: 24px;
    gap: 24px;
  }
}
</style>
