<script setup>
const props = defineProps({ place: { type: String, default: 'page' } });
const { me } = useMe();
const config = useRuntimeConfig().public;
const plan = computed(() => me.value.plan?.plan || 'free');
const HOUSE = [
  { key: 'pro', tone: 'pro', kicker: 'Ranked World Pro', title: 'See your codes 15 minutes early', perks: ['100 replays kept for 30 days', '10 practice matches a day', 'No ads'], label: 'Go Pro', to: '/subscribe', art: '/img/hero/forest-treehouse.webp', mark: '/img/planet-pro.png', hide: ['pro'] },
  { key: 'plus', tone: 'plus', kicker: 'Ranked World Plus', title: 'Know why your MMR moved', perks: ['Full MMR breakdown every round', 'All movement stats', 'Priority scrim queue'], label: 'Get Plus', to: '/subscribe', art: '/img/hero/forest-canopy.webp', mark: '/img/planet-plus.png', hide: ['plus', 'pro'] },
  { key: 'gtc', tone: 'brand', kicker: 'Gorilla Tag Comp', title: 'Find a team. Play scrims tonight.', perks: ['4v4 scrims', 'Tournaments', 'The staff who run this ladder'], label: 'Join the Discord', icon: 'discord', href: 'https://discord.gg/gorillatagcomp', art: '/img/hero/forest-campfire.jpg' },
  { key: 'launcher', tone: 'brand', kicker: 'Free for Windows', title: 'Press Play. Land in your ranked room.', perks: ['Joins your code for you', 'Round results inside VR', 'See which friends are on'], label: 'Download the launcher', icon: 'download', to: '/launcher', shot: '/img/ads/launcher.jpg', web: true },
];
const pool = computed(() => HOUSE.filter(a => !(a.web && config.desktop) && !(a.hide || []).includes(plan.value)));
const pick = useState('ad-' + props.place, () => Math.floor(Math.random() * 1000));
const ad = computed(() => pool.value[pick.value % pool.value.length]);
</script>
<template>
<aside v-if="me.loaded && plan !== 'pro' && ad" class="adslot" :class="'adslot--' + ad.tone" aria-label="Advertisement">
  <component :is="ad.to ? resolveComponent('NuxtLink') : 'a'" class="adslot__link" v-bind="ad.to ? { to: ad.to } : { href: ad.href, target: '_blank', rel: 'noopener sponsored' }">
    <div class="adslot__art" :class="{ 'adslot__art--shot': ad.shot }" aria-hidden="true"><img :src="ad.shot || ad.art" alt="" loading="lazy" /><img v-if="ad.mark" class="adslot__mark" :src="ad.mark" alt="" /></div>
    <div class="adslot__copy">
      <span class="adslot__kicker">{{ ad.kicker }}</span>
      <strong>{{ ad.title }}</strong>
      <ul><li v-for="perk in ad.perks" :key="perk"><AppIcon name="check" />{{ perk }}</li></ul>
      <span class="adslot__cta"><AppIcon v-if="ad.icon" :name="ad.icon" />{{ ad.label }}</span>
    </div>
    <span class="adslot__tag">Ad</span>
  </component>
</aside>
</template>
<style scoped>
.adslot{--ad:var(--color-brand);--ad-ink:var(--color-brand-inverted);margin:var(--gap-24) 0}
.adslot--pro{--ad:var(--color-pro);--ad-ink:#160a2e}
.adslot--plus{--ad:var(--color-plus);--ad-ink:#04222c}
.adslot__link{position:relative;display:block;min-height:208px;overflow:hidden;border-radius:var(--radius-lg);background:#16191c;border:1px solid #ffffff14;color:var(--color-text);text-decoration:none;transition:border-color .18s ease}
.adslot__link:hover{border-color:var(--ad)}
.adslot__art{position:absolute;inset:0 0 0 38%}
.adslot__art>img:first-child{width:100%;height:100%;object-fit:cover;transition:transform .5s ease-out}
.adslot__link:hover .adslot__art>img:first-child{transform:scale(1.03)}
.adslot__art::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#16191c 0%,#16191cd9 22%,#16191c33 70%,#16191c00 100%)}
.adslot__art--shot{inset:28px -40px -60px 52%;border:1px solid #ffffff24;border-radius:var(--radius-lg);overflow:hidden;box-shadow:0 18px 40px #000a}
.adslot__art--shot>img:first-child{object-position:left top}
.adslot__art--shot::after{background:linear-gradient(90deg,#16191c66 0%,#16191c00 30%)}
.adslot__mark{position:absolute;right:36px;top:50%;z-index:1;width:176px;height:auto;transform:translateY(-50%);image-rendering:pixelated}
.adslot__copy{position:relative;display:grid;gap:10px;justify-items:start;max-width:560px;padding:26px 28px}
.adslot__kicker{color:var(--ad);font-size:var(--text-12);font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.adslot__copy strong{color:var(--color-text-primary);font-family:var(--font-display);font-size:30px;font-weight:800;letter-spacing:-.02em;line-height:1.08;text-wrap:balance}
.adslot ul{display:flex;flex-wrap:wrap;gap:6px 16px;margin:0;padding:0;list-style:none}
.adslot li{display:flex;align-items:center;gap:6px;color:#d6d9dc;font-size:var(--text-14);font-weight:500}
.adslot li .icon{width:14px;height:14px;color:var(--ad)}
.adslot__cta{display:inline-flex;align-items:center;gap:8px;min-height:42px;margin-top:6px;padding:0 18px;border-radius:var(--radius-sm);background:var(--ad);color:var(--ad-ink);font-size:var(--text-14);font-weight:700;transition:transform .15s ease}
.adslot__link:hover .adslot__cta{transform:translateY(-1px)}
.adslot__cta .icon{width:16px;height:16px}
.adslot__tag{position:absolute;top:10px;right:12px;z-index:2;padding:2px 6px;border-radius:var(--radius-sm);background:#111315cc;color:#9da4aa;font-size:10px;font-weight:700;letter-spacing:.06em}
@media (max-width:760px){.adslot__art{inset:0}.adslot__art::after{background:#16191cd9}.adslot__art--shot{display:none}.adslot__mark{display:none}.adslot__copy strong{font-size:24px}}
@media (prefers-reduced-motion:reduce){.adslot__art>img:first-child,.adslot__cta{transition:none}}
</style>
