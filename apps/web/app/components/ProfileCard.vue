<script setup>
import { CARD_OPTIONS, clampCard, renderProfileCard } from '~/utils/profile-card.js';
import { privateAvatarSource } from '~/utils/avatar.js';
import { rankBadge } from '~/utils/badges.js';
import { DIVISIONS } from '@ranked-world/ranks';
const props = defineProps({ profile: { type: Object, default: () => ({}) }, card: { type: Object, default: () => ({}) }, level: { type: Number, default: 2 } });
const assets = ref({});
const loading = ref(true);
const failure = ref('');
const mounted = ref(false);
let revision = 0;
let pending;
const cache = new Map();
const selected = computed(() => clampCard(props.card, props.level));
const preview = computed(() => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(renderProfileCard(props.profile, selected.value, props.level, assets.value)));
async function dataUrl(url, type) {
  if (!url) return '';
  if (!cache.has(url)) cache.set(url, (async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Card asset unavailable');
    if (type.startsWith('image/')) {
      type = response.headers.get('content-type')?.split(';')[0];
      if (!['image/png', 'image/webp', 'image/jpeg', 'image/gif'].includes(type)) throw new Error('Invalid card artwork');
    }
    const blob = new Blob([await response.arrayBuffer()], { type });
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
  })().catch(error => { cache.delete(url); throw error; }));
  return cache.get(url);
}
async function loadAssets() {
  const current = ++revision;
  loading.value = true;
  failure.value = '';
  assets.value = {};
  const font = CARD_OPTIONS.font.find(option => option.id === selected.value.font);
  const results = await Promise.allSettled([
    dataUrl(privateAvatarSource(props.profile.avatar), 'image/png'),
    dataUrl(DIVISIONS.includes(props.profile.rank) ? rankBadge(props.profile.rank) : '', 'image/png'),
    dataUrl(font.file ? '/fonts/' + font.file : '', font.file?.endsWith('woff2') ? 'font/woff2' : 'font/ttf'),
  ]);
  if (current !== revision) return;
  assets.value = Object.fromEntries(['avatar', 'badge', 'font'].map((key, i) => [key, results[i].status === 'fulfilled' ? results[i].value : '']));
  if (results.some(result => result.status === 'rejected')) failure.value = 'Some card artwork could not load. Retry before downloading.';
  loading.value = false;
}
watch(() => [props.profile.avatar, props.profile.rank, selected.value.font, mounted.value], () => { if (mounted.value) pending = loadAssets(); }, { immediate: true });
onMounted(() => { mounted.value = true; });
async function png() {
  await pending;
  if (loading.value || failure.value) throw new Error('Wait for card artwork to load');
  const image = new Image();
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = preview.value; });
  const canvas = document.createElement('canvas');
  canvas.width = 1800; canvas.height = 900;
  canvas.getContext('2d').drawImage(image, 0, 0, 1800, 900);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not export card');
  return blob;
}
defineExpose({ png });
</script>
<template>
<div class="player-card" :aria-busy="loading">
  <img :src="preview" :alt="`${profile.discordName || 'Player'}: ${profile.rank || 'Unranked'}, ${profile.elo || 0} Elo`" width="900" height="450" />
  <p v-if="failure" class="meta" role="status">{{ failure }} <button type="button" @click="pending = loadAssets()">Retry artwork</button></p>
</div>
</template>
<style scoped>
.player-card{width:100%;min-width:0}.player-card>img{display:block;width:100%;height:auto;border-radius:clamp(10px,2vw,24px);box-shadow:0 18px 50px #0003}.player-card p{margin:12px 0}.player-card button{color:var(--color-brand);background:none;border:0;font:inherit;text-decoration:underline;cursor:pointer}
</style>
