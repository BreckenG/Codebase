<script setup>
const props = defineProps({
  plan: { type: String, default: 'free' },
  mirror: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  failure: { type: String, default: '' },
});
const emit = defineEmits(['start', 'build', 'stop']);
const m = computed(() => props.mirror || {});
const self = computed(() => m.value.self || { status: 'none' });
const session = computed(() => m.value.session || null);
const publics = computed(() => m.value.publics || []);
const pro = computed(() => Boolean(m.value.pro));
const range = computed(() => m.value.penalty || { min: 3, max: 6, def: 3 });
const penalty = ref(3);
watch(range, (r) => (penalty.value = r.def), { immediate: true });
const left = computed(() => Math.max(0, (m.value.perDay || 0) - (m.value.used || 0)));
const ready = computed(() => self.value.status === 'ready');
const building = computed(() => self.value.status === 'building');
const need = computed(() => self.value.need || 0);
const short = computed(() => Math.max(0, need.value - (self.value.rounds || 0)));
const progress = computed(() => (need.value ? Math.min(100, ((self.value.rounds || 0) / need.value) * 100) : 100));
const pct = (v) => `${Math.round((v || 0) * 100)}%`;
const hours = (v) => (v >= 1 ? `${v.toFixed(1)} h` : `${Math.round((v || 0) * 60)} min`);
const day = (v) => (v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'never');
const STICK = {
  3: 'Loose, fills gaps with other players',
  4: 'Mostly their lines',
  5: 'Strict',
  6: 'Only their lines where it can',
};
const label = (s) =>
  s.mode === 'mirror' ? (s.self ? 'Your mirror' : `${s.target}'s mirror`) : `Level bot, ${s.difficulty}`;
const STATUS = {
  none: 'No mirror yet, build one!',
  building: 'Building your mirror. This takes a few minutes.',
  stale: 'That build never finished. Try again.',
  failed: 'The build failed.',
};
</script>

<template>
  <section class="mirror" aria-labelledby="mirror-heading">
    <div class="section-head">
      <h2 id="mirror-heading">{{ session ? 'Your session' : 'Mirror bots' }}</h2>
      <span class="meta">{{ left }} / {{ m.perDay || 0 }} matches left</span>
    </div>
    <div v-if="failure" class="alert" role="alert">
      <p>{{ failure }}</p>
    </div>
    <div v-if="!m.linked" class="empty">
      <h3>Connect your game account first</h3>
      <p>Your mirror is built from your own ranked matches, so it needs to know which player you are.</p>
      <NuxtLink class="btn btn--brand" to="/play">Connect</NuxtLink>
    </div>
    <div v-else-if="session" class="live panel" role="status">
      <span class="chip" :class="{ 'chip--live': session.phase !== 'starting' }">
        <span class="dot" />{{ session.phase }}
      </span>
      <h3 class="live__code">{{ session.phase === 'starting' ? 'Opening your room...' : session.code }}</h3>
      <p class="meta">
        {{
          session.phase === 'starting'
            ? 'Keep this page open. Your code will appear when the room is ready.'
            : 'Join this code at the computer in Gorilla Tag.'
        }}
      </p>
      <div class="live__row">
        <span class="chip chip--brand"><AppIcon name="bot" />{{ label(session) }}</span>
        <RoomJoinButton v-if="session.code && session.phase !== 'starting'" :code="session.code" />
      </div>
      <dl v-if="session.points" class="live__score">
        <div class="stat">
          <dt>{{ session.points[0] || 0 }}</dt>
          <dd>You</dd>
        </div>
        <div class="stat">
          <dt>{{ session.points[1] || 0 }}</dt>
          <dd>{{ session.mode === 'mirror' ? 'Mirror' : 'Bot' }}</dd>
        </div>
      </dl>
      <div class="go-row">
        <button class="btn" :disabled="busy" @click="emit('stop')">End session</button>
        <NuxtLink v-if="session.mode === 'mirror'" class="btn btn--ghost" to="/play?mode=practice"
          >Back to the level bots</NuxtLink
        >
      </div>
    </div>
    <template v-else>
      <div class="panel mirror__self">
        <div class="mirror__stage" aria-hidden="true">
          <ClientOnly>
            <GorillaFigure
              :pose="ready ? 'flex' : building ? 'reach' : 'wave'"
              :color="m.color || [0.93, 0.45, 0.1]"
              :cosmetics="m.cosmetics || []"
            />
          </ClientOnly>
        </div>
        <div class="mirror__side">
          <div class="mirror__head">
            <h3>Your mirror</h3>
            <span v-if="self.public" class="chip chip--brand">Public</span>
          </div>
          <template v-if="ready && self.stats">
            <dl class="mirror__stats">
              <div class="stat">
                <dt>{{ pct(self.stats.heldInOwn) }}</dt>
                <dd>likeness</dd>
              </div>
              <div class="stat">
                <dt>{{ hours(self.stats.hours) }}</dt>
                <dd>of your movement</dd>
              </div>
              <div class="stat">
                <dt>{{ self.stats.rounds }}</dt>
                <dd>ranked rounds</dd>
              </div>
              <div class="stat">
                <dt>{{ (self.stats.floor || 0).toFixed(1) }} m/s</dt>
                <dd>floor pace</dd>
              </div>
            </dl>
            <label class="mirror__slider">
              <span>
                Stick to your lines: <strong>{{ penalty }}</strong> <span class="meta">{{ STICK[penalty] }}</span>
              </span>
              <input v-model.number="penalty" type="range" :min="range.min" :max="range.max" step="1" />
            </label>
            <div class="go-row">
              <button
                class="btn btn--brand btn--large"
                :disabled="busy || !left"
                @click="emit('start', { target: 'self', penalty })"
              >
                <AppIcon name="play" />{{ busy ? 'Starting your session...' : 'Play your mirror' }}
              </button>
              <button class="btn" :disabled="busy || building" @click="emit('build')">
                <AppIcon name="refresh" />Rebuild
              </button>
            </div>
            <span class="meta">Built {{ day(self.builtAt) }}</span>
          </template>
          <template v-else-if="short && !building">
            <p class="mirror__lead">
              Play {{ short }} more ranked match{{ short === 1 ? '' : 'es' }} to build your mirror.
            </p>
            <div class="bar mirror__bar"><span :style="{ width: `${progress}%` }" /></div>
            <span class="meta">{{ self.rounds || 0 }} / {{ need }} matches</span>
            <div class="go-row">
              <NuxtLink class="btn btn--brand" to="/play">Find a ranked code</NuxtLink>
            </div>
          </template>
          <template v-else>
            <p class="mirror__lead">{{ STATUS[self.status] || STATUS.none }}</p>
            <p v-if="self.status === 'failed' && self.error" class="bad">{{ self.error }}</p>
            <div class="go-row">
              <button class="btn btn--brand btn--large" :disabled="busy || building" @click="emit('build')">
                <AppIcon :name="building ? 'clock' : 'bot'" />{{ building ? 'Building...' : 'Build my mirror' }}
              </button>
            </div>
          </template>
        </div>
      </div>
      <div class="section-head">
        <h2>Public mirrors</h2>
        <span v-if="!pro" class="meta">A Pro feature</span>
      </div>
      <div v-if="!publics.length" class="empty">
        <h3>No public mirrors yet</h3>
      </div>
      <div v-else class="mirror__grid">
        <article
          v-for="(p, i) in publics"
          :key="p.photonId"
          class="mirror__card reveal-up"
          :class="{ 'mirror__card--locked': !p.playable }"
          :style="{ '--i': i }"
        >
          <div class="mirror__body" :aria-hidden="!p.playable">
            <div class="mirror__rig">
              <GorillaPortrait pose="flex" :color="p.color" :cosmetics="p.cosmetics" />
            </div>
            <strong class="mirror__name">{{ p.display || p.name }}</strong>
            <span class="meta">{{ p.name }}</span>
            <span v-if="p.title" class="mirror__title">{{ p.title }}</span>
            <span v-if="p.stats" class="meta">{{ pct(p.stats.heldInOwn) }} likeness, {{ p.stats.rounds }} rounds</span>
            <button
              class="btn btn--brand mirror__play"
              :disabled="busy || !left || !p.playable"
              @click="emit('start', { target: p.photonId, penalty })"
            >
              <AppIcon name="play" />Play
            </button>
          </div>
          <div v-if="!p.playable" class="mirror__lock">
            <span class="chip chip--gold"><AppIcon name="crown" />Pro</span>
            <NuxtLink class="btn btn--small" to="/subscribe">Get Pro</NuxtLink>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
.mirror {
  display: grid;
  gap: 24px;
}
.mirror .section-head {
  margin: 0;
}
.mirror__self {
  display: grid;
  grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  padding: 12px 28px 12px 12px;
  overflow: hidden;
  background: radial-gradient(60% 120% at 15% 60%, color-mix(in srgb, var(--brand) 14%, transparent), transparent 70%),
    var(--panel);
}
.mirror__stage {
  height: 280px;
}
.mirror__side {
  display: grid;
  gap: 16px;
  justify-items: start;
}
.mirror__head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mirror__head h3 {
  margin: 0;
  font-size: 24px;
}
.mirror__lead {
  margin: 0;
  color: var(--ink);
  font-size: 18px;
}
.mirror__bar {
  width: min(360px, 100%);
}
.mirror__bar span {
  transition: width 0.8s var(--ease);
}
.mirror__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  width: 100%;
  margin: 0;
}
.mirror__slider {
  display: grid;
  gap: 8px;
  width: min(480px, 100%);
}
.mirror__slider input {
  width: 100%;
  accent-color: var(--brand);
}
.mirror__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}
.mirror__card {
  position: relative;
  padding: 12px 14px 18px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: radial-gradient(90% 60% at 50% 30%, color-mix(in srgb, var(--brand) 12%, transparent), transparent 70%),
    var(--panel);
  transition:
    transform 0.3s var(--ease),
    border-color 0.25s,
    box-shadow 0.3s;
}
.mirror__card:not(.mirror__card--locked):hover {
  transform: translateY(-4px);
  border-color: var(--line-2);
  box-shadow: 0 18px 44px -24px var(--brand);
}
.mirror__body {
  display: grid;
  justify-items: center;
  gap: 4px;
  text-align: center;
}
.mirror__rig {
  width: 140px;
  margin-bottom: 4px;
  transition: transform 0.4s var(--ease);
}
.mirror__card:hover .mirror__rig {
  transform: scale(1.05) rotate(-2deg);
}
.mirror__name {
  max-width: 100%;
  overflow: hidden;
  color: var(--ink);
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mirror__title {
  margin-top: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--brand) 14%, transparent);
  color: var(--brand);
  font-size: 13px;
  font-weight: 700;
}
.mirror__play {
  margin-top: 10px;
}
.mirror__card--locked .mirror__body {
  filter: blur(5px);
  pointer-events: none;
  user-select: none;
}
.mirror__lock {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
}
.chip--gold {
  background: rgba(240, 192, 64, 0.16);
  color: #f0c040;
}
.bad {
  margin: 0;
  color: var(--bad, #ff6b6b);
}
@media (max-width: 720px) {
  .mirror__self {
    grid-template-columns: 1fr;
    padding: 0 20px 24px;
  }
  .mirror__stage {
    height: 220px;
  }
}
@media (max-width: 560px) {
  .mirror__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .mirror__rig {
    width: 110px;
  }
}
</style>
