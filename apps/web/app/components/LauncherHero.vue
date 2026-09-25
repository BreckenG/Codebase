<script setup>
import { DIVISIONS } from '@ranked-world/ranks';
const props = defineProps({ player: { type: Object, default: null } });
const { me } = useMe();
const { signIn, loginPending, available, status, busy, pendingJoin, requestLaunch } = useDesktop();
const art = ['/img/hero/forest-sunset.webp', '/img/hero/forest-treehouse.webp', '/img/hero/forest-canopy.webp', '/img/hero/forest-campfire.jpg'];
const index = ref(0);
let timer = 0;
const linked = computed(() => Boolean(props.player?.linked));
const ranked = computed(() => props.player?.ranked);
const tier = computed(() => ranked.value?.tier);
const next = computed(() => tier.value && !tier.value.isTop ? DIVISIONS[tier.value.index + 1] : null);
const name = computed(() => props.player?.name || me.value.user?.username || 'Ranked World');
const running = computed(() => Boolean(status.value?.gameRunning));
const canLaunch = computed(() => available && !busy.value && status.value?.gameInstalled && !running.value && !pendingJoin.value);
onMounted(() => {
  for (const src of art) { const img = new Image(); img.src = src; }
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => { index.value = (index.value + 1) % art.length; }, 8000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>
<template>
<section class="lhero">
  <div class="lhero__art" aria-hidden="true"><img v-for="(src, i) in art" :key="src" :src="src" alt="" :class="{ 'is-on': i === index }" /></div>
  <div class="lhero__body">
    <template v-if="linked">
      <h1 class="lhero__name">{{ name }}</h1>
      <NuxtLink v-if="tier" to="/me" class="lhero__rank">
        <RankBadge :tier="tier" :size="64" :show-percent="false" />
        <span class="lhero__tier"><strong>{{ tier.name }}</strong><span><CountUp :value="ranked.elo || 0" /> Elo<template v-if="player.position"> <i>/</i> #{{ player.position }}</template></span></span>
      </NuxtLink>
      <div v-if="tier" class="lhero__next"><span class="lhero__bar"><i :style="{ '--w': (tier.isTop ? 100 : tier.percent) + '%' }" /></span><small>{{ next ? tier.eloToNext + ' to ' + next : 'Top division' }}</small></div>
      <div class="lhero__actions">
        <button class="btn btn--brand lhero__play" :class="{ 'is-live': running }" :disabled="!canLaunch" @click="requestLaunch()"><AppIcon name="play" />{{ running ? 'In game' : 'Play' }}</button>
        <NuxtLink to="/play" class="btn lhero__ghost"><AppIcon name="hash" />Codes</NuxtLink>
      </div>
    </template>
    <template v-else>
      <h1 class="lhero__name">{{ me.user ? name : 'Ranked World' }}</h1>
      <p class="lhero__line">{{ me.user ? 'Connect Gorilla Tag to get a rank.' : 'Sign in to see your rank and join codes.' }}</p>
      <div class="lhero__actions">
        <NuxtLink v-if="me.user" to="/play" class="btn btn--brand lhero__play"><AppIcon name="link" />Connect Gorilla Tag</NuxtLink>
        <button v-else class="btn btn--brand lhero__play" :disabled="loginPending" @click="signIn"><AppIcon name="discord" />Sign in with Discord</button>
      </div>
    </template>
  </div>
</section>
</template>
