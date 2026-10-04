<script setup>
const props = defineProps({ place: { type: String, default: 'page' } });
const { me } = useMe();
const config = useRuntimeConfig().public;
const pro = computed(() => me.value.plan?.plan === 'pro');
const HOUSE = [
  { key: 'pro', title: 'Pro has no ads', body: '100 replays kept for 30 days, every profile card style and codes 15 minutes early.', label: 'See Pro', to: '/subscribe' },
  { key: 'gtc', title: 'Gorilla Tag Comp on Discord', body: 'Scrims, tournaments and the people who run this ladder.', label: 'Join the Discord', href: 'https://discord.gg/gorillatagcomp' },
  { key: 'launcher', title: 'The launcher joins codes for you', body: 'Press Play on Steam and it opens Gorilla Tag in your ranked room. Round results show up inside VR.', label: 'Download for Windows', to: '/launcher', web: true },
];
const pool = computed(() => HOUSE.filter(a => !(a.web && config.desktop)));
const pick = useState('ad-' + props.place, () => Math.floor(Math.random() * 1000));
const ad = computed(() => pool.value[pick.value % pool.value.length]);
</script>
<template>
<aside v-if="me.loaded && !pro && ad" class="adslot" aria-label="Advertisement"><span class="adslot__tag">Ad</span><div class="adslot__copy"><strong>{{ ad.title }}</strong><span>{{ ad.body }}</span></div><NuxtLink v-if="ad.to" class="btn" :to="ad.to">{{ ad.label }}</NuxtLink><a v-else class="btn" :href="ad.href" target="_blank" rel="noopener sponsored">{{ ad.label }}</a></aside>
</template>
<style scoped>
.adslot{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:var(--gap-16);align-items:center;margin:var(--gap-24) 0;padding:var(--gap-12) var(--gap-16);border:1px solid var(--surface-4);border-radius:var(--radius-lg)}
.adslot__tag{color:var(--color-text-secondary);font-size:var(--text-12);font-weight:700}
.adslot__copy{display:grid;gap:2px;min-width:0}
.adslot__copy strong{color:var(--color-text-primary);font-size:var(--text-14)}
.adslot__copy span{color:var(--color-text-secondary);font-size:var(--text-14)}
@media (max-width:640px){.adslot{grid-template-columns:1fr}.adslot__tag{display:none}}
</style>
