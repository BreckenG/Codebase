<script setup>
const { enabled: desktop } = useDesktop();
const { me, load } = useMe();
await load();
const { check: checkAdmin } = useAdmin();
onMounted(checkAdmin);
const route = useRoute();
const plan = useAds();
const has = (spot) => plan.value.spots.includes(spot);
const rail = computed(() => (desktop ? 'right' : plan.value.rail));
const NO_ADS_DESKTOP = /^\/(admin|special|payouts|legal|subscribe|settings|launcher)(\/|$)/;
const NO_ADS_WEB = /^\/(admin|special|payouts|legal|sign-in|subscribe|settings|launcher\/connect)(\/|$)/;
const ads = computed(() => !(desktop ? NO_ADS_DESKTOP : NO_ADS_WEB).test(route.path));
const sideAd = computed(() => desktop && ads.value && has('side') && me.value.loaded && me.value.plan?.plan !== 'pro');
</script>

<template>
  <div v-if="desktop" class="world-app launcher-app" :class="{ 'has-side-ad': sideAd }">
    <NuxtLoadingIndicator color="var(--color-brand)" :height="2" />
    <a class="skip-link" href="#main">Skip to content</a>
    <DesktopNav />
    <div class="world-content" :class="{ site: route.path !== '/' }">
      <DesktopBar />
      <div v-if="ads && (has('top') || has('side'))" class="wrap ad-top" :class="{ 'ad-top--fallback': !has('top') }">
        <AdSlot place="top" shape="strip" />
      </div>
      <slot />
      <div v-if="ads && has('bottom')" class="wrap ad-bottom"><AdSlot place="bottom" /></div>
    </div>
    <AdSlot
      v-if="ads && has('side')"
      :key="rail"
      :place="rail"
      shape="tall"
      class="ad-rail"
      :class="'ad-rail--' + rail"
    />
    <DesktopPrompts />
    <ToastHost />
  </div>
  <div v-else class="site">
    <NuxtLoadingIndicator color="#ee862a" :height="2" />
    <a class="skip-link" href="#main">Skip to content</a>
    <SiteNav />
    <slot />
    <div v-if="ads && (has('top') || has('bottom'))" class="wrap site-ad"><AdSlot place="bottom" /></div>
    <AdSlot
      v-if="ads && has('side')"
      :key="rail"
      :place="rail"
      shape="tall"
      class="ad-rail"
      :class="'ad-rail--' + rail"
    />
    <SiteFooter />
    <ToastHost />
  </div>
</template>

<style src="~/assets/css/world.css"></style>
<style src="~/assets/css/shell.css"></style>
<style src="~/assets/css/site.css"></style>
<style>
.site-ad {
  margin-top: 96px;
}
</style>
