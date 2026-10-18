<script setup>
import { CARD_OPTIONS, clampCard } from '~/utils/profile-card.js';
import { invoke, isTauri } from '@tauri-apps/api/core';

const props = defineProps({ position: { type: Number, default: null } });
const loaded = ref(false);
const busy = ref('');
const failure = ref('');
const notice = ref('');
const level = ref(0);
const profile = ref({});
const saved = ref('');
const selected = ref(clampCard({}));
const renderer = ref(null);
const active = ref('background');
const labels = { background: 'Themes', pattern: 'Backgrounds', font: 'Fonts', accent: 'Accents', layout: 'Layout' };
const tierName = (n) => (n === 2 ? 'Pro' : 'Plus');
const changed = computed(() => JSON.stringify(selected.value) !== saved.value);
const required = computed(() => {
  const levels = Object.entries(CARD_OPTIONS).map(
    ([key, opts]) => opts.find((o) => o.id === selected.value[key])?.level || 0,
  );
  return Math.max(...levels);
});
const locked = computed(() => required.value > level.value);
const cardProfile = computed(() => ({ ...profile.value, position: props.position }));
const status = computed(() => {
  if (notice.value) return notice.value;
  return changed.value ? 'Unsaved style' : 'Your card appears on your public profile.';
});

function keep(result) {
  level.value = result.level;
  selected.value = result.card;
  saved.value = JSON.stringify(result.card);
}

async function load() {
  failure.value = '';
  try {
    const result = await apiGet('/api/me/profile-card');
    profile.value = result.profile;
    keep(result);
    loaded.value = true;
  } catch {
    failure.value = 'Your card could not load. Try again.';
  }
}

async function save() {
  busy.value = 'save';
  failure.value = '';
  notice.value = '';
  try {
    keep(await apiFetch('/api/me/profile-card', { method: 'POST', body: selected.value }));
    notice.value = 'Saved to your profile.';
  } catch (error) {
    failure.value = error?.data?.statusMessage || 'Your card could not save. Try again.';
  } finally {
    busy.value = '';
  }
}

async function download() {
  busy.value = 'download';
  failure.value = '';
  try {
    const blob = await renderer.value.png();
    if (isTauri()) {
      const png = Array.from(new Uint8Array(await blob.arrayBuffer()));
      notice.value = `Saved to ${await invoke('save_profile_card', { png })}`;
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ranked-world-card.png';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice.value = 'Your card is ready to share.';
  } catch {
    failure.value = 'Could not download your card. Check that the artwork loaded and try again.';
  } finally {
    busy.value = '';
  }
}

function choose(id) {
  selected.value[active.value] = id;
  notice.value = '';
}

onMounted(load);
</script>

<template>
  <section class="section studio" aria-labelledby="card-studio-heading" :aria-busy="!!busy">
    <div class="section-head">
      <h2 id="card-studio-heading">Your player card</h2>
      <span class="chip chip--brand">{{ ['Free', 'Plus', 'Pro'][level] }}</span>
    </div>
    <p v-if="failure" role="alert" class="bad">{{ failure }}</p>
    <button v-if="failure && !loaded" class="btn" @click="load">Try again</button>
    <p v-if="!loaded && !failure" role="status" class="meta">Loading your card...</p>
    <template v-if="loaded">
      <div class="studio__preview">
        <ProfileCard ref="renderer" :profile="cardProfile" :card="selected" :level="2" />
        <span v-if="locked" class="chip studio__flag">{{ tierName(required) }} preview</span>
      </div>
      <div class="studio__editor panel">
        <div class="seg studio__tabs" aria-label="Card customization">
          <button
            v-for="(label, key) in labels"
            :key="key"
            type="button"
            :aria-pressed="active === key"
            @click="active = key"
          >
            {{ label }}
          </button>
        </div>
        <fieldset :key="active">
          <legend class="sr-only">{{ labels[active] }}</legend>
          <div class="studio__choices">
            <button
              v-for="option in CARD_OPTIONS[active]"
              :key="option.id"
              type="button"
              :disabled="!!busy"
              :aria-pressed="selected[active] === option.id"
              @click="choose(option.id)"
            >
              <span
                v-if="option.colors"
                class="studio__theme"
                :style="{ background: `linear-gradient(125deg,${option.colors.join(',')})` }"
                ><span
              /></span>
              <span v-else-if="option.color" class="studio__swatch" :style="{ background: option.color }" />
              <span v-else-if="active === 'pattern'" class="studio__pattern" :class="`studio__pattern--${option.id}`" />
              <span
                v-else-if="active === 'font'"
                class="studio__font"
                :class="`studio__font--${option.id}`"
                :style="{ fontFamily: option.file ? '' : option.family }"
                >Aa</span
              >
              <span class="studio__name">
                {{ option.label }}<PerkTag v-if="option.level > level" :tier="option.level === 2 ? 'pro' : 'plus'" />
              </span>
            </button>
          </div>
        </fieldset>
        <div class="studio__foot">
          <p v-if="locked" class="meta">This style comes with {{ tierName(required) }}.</p>
          <p v-else class="meta" role="status" aria-live="polite">{{ status }}</p>
          <div class="studio__actions">
            <NuxtLink v-if="locked" to="/subscribe" class="btn btn--brand">View membership</NuxtLink>
            <button v-else class="btn btn--brand" :disabled="!!busy || !changed" @click="save">
              {{ busy === 'save' ? 'Saving...' : 'Save style' }}
            </button>
            <button class="btn" :disabled="!!busy || locked" @click="download">
              {{ busy === 'download' ? 'Exporting...' : 'Download PNG' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.studio__preview {
  position: relative;
  max-width: 980px;
  margin-bottom: 20px;
}
.studio__flag {
  position: absolute;
  right: 16px;
  bottom: 16px;
}
.studio__editor {
  padding: 0;
  overflow: hidden;
}
.studio__tabs {
  display: flex;
  margin: 16px 16px 0;
  max-width: calc(100% - 32px);
  overflow-x: auto;
}
.studio__editor fieldset {
  min-width: 0;
  margin: 0;
  padding: 20px;
  border: 0;
}
.studio__choices {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
}
.studio__choices button {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--raise);
  color: var(--ink);
  font-size: 12px;
  text-align: left;
  transition:
    border-color 0.2s,
    background 0.2s,
    transform 0.2s var(--ease);
}
.studio__choices button:hover {
  transform: translateY(-2px);
  border-color: var(--line-2);
}
.studio__choices button[aria-pressed='true'] {
  border-color: var(--brand);
  background: color-mix(in srgb, var(--brand) 8%, transparent);
}
.studio__theme,
.studio__pattern {
  position: relative;
  width: 100%;
  height: 48px;
  overflow: hidden;
  border-radius: 6px;
}
.studio__theme span {
  position: absolute;
  top: 12px;
  right: -5px;
  width: 75px;
  height: 75px;
  border: 1px solid #ffffff25;
  border-radius: 50%;
}
.studio__name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  width: 100%;
}
.studio__swatch {
  width: 28px;
  height: 28px;
  border: 1px solid #fff3;
  border-radius: 50%;
}
.studio__font {
  height: 40px;
  font-size: 27px;
}
.studio__font--pixel {
  font-family: CardPixel, monospace;
}
.studio__font--space {
  font-family: CardSpace, sans-serif;
}
.studio__font--display {
  font-family: CardDisplay, sans-serif;
}
.studio__font--sora {
  font-family: Sora, sans-serif;
}
.studio__font--archivo {
  font-family: Archivo, sans-serif;
}
.studio__pattern {
  background-color: #232a35;
}
.studio__pattern--orbit {
  background-image: repeating-radial-gradient(
    ellipse at 80% 65%,
    transparent 0 10px,
    #f4af8335 11px 12px,
    transparent 13px 20px
  );
}
.studio__pattern--grid {
  background-image: linear-gradient(#ffffff18 1px, transparent 1px),
    linear-gradient(90deg, #ffffff18 1px, transparent 1px);
  background-size: 12px 12px;
}
.studio__pattern--contour {
  background-image: repeating-radial-gradient(
    ellipse at 100% 150%,
    transparent 0 7px,
    #f4af8345 8px 9px,
    transparent 10px 14px
  );
}
.studio__pattern--waves {
  background-image: repeating-radial-gradient(
    ellipse at 0 100%,
    transparent 0 5px,
    #9cdaee45 6px 7px,
    transparent 8px 13px
  );
}
.studio__pattern--prism {
  background-image: repeating-linear-gradient(125deg, transparent 0 25px, #d5b9fa30 26px 40px);
}
.studio__pattern--forest {
  background-image: conic-gradient(from 150deg at 50% 0, #b1ecc930 60deg, transparent 0);
  background-size: 30px 40px;
}
.studio__pattern--stars {
  background-image: radial-gradient(#d5b9fa 1px, transparent 2px);
  background-size: 22px 19px;
}
.studio__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-top: 1px solid var(--line);
}
.studio__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}
@media (max-width: 600px) {
  .studio__choices {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .studio__foot {
    flex-direction: column;
    align-items: stretch;
  }
  .studio__actions > .btn {
    flex: 1;
  }
}
</style>
