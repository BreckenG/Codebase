<script setup>
import WorldNav from '~/components/WorldNav.vue';
const { enabled: desktop } = useDesktop();
const { load } = useMe();
await load();
const { check: checkAdmin } = useAdmin();
onMounted(checkAdmin);
const route = useRoute();
const ads = computed(() => !desktop && !/^\/(admin|legal|sign-in|subscribe|settings|launcher\/connect)(\/|$)/.test(route.path));
</script>
<template>
<div class="world-app" :class="{ 'launcher-app': desktop }"><NuxtLoadingIndicator color="var(--color-brand)" :height="2" /><a class="skip-link" href="#main">Skip to content</a><DesktopNav v-if="desktop" /><WorldNav v-else /><div class="world-content"><DesktopBar /><div v-if="ads" class="wrap ad-top"><AdSlot place="top" shape="strip" /></div><slot /><footer v-if="!desktop" class="world-footer"><span>Ranked World</span><nav aria-label="Footer"><NuxtLink to="/legal/terms">Terms</NuxtLink><NuxtLink to="/legal/privacy">Privacy</NuxtLink><NuxtLink to="/legal/refunds">Refunds</NuxtLink><NuxtLink to="/legal/cookies">Cookies</NuxtLink><NuxtLink to="/legal/business">Contact</NuxtLink><a href="https://discord.gg/gorillatagcomp">Support</a><NuxtLink to="/subscribe">Membership</NuxtLink></nav><a class="world-footer__gh" href="https://github.com/BreckenG/Codebase" target="_blank" rel="noopener"><AppIcon name="github" />GitHub</a></footer></div><template v-if="ads"><AdSlot place="left" shape="tall" class="ad-rail ad-rail--left" /><AdSlot place="right" shape="tall" class="ad-rail ad-rail--right" /></template><DesktopPrompts v-if="desktop" /><ToastHost /></div>
</template>
<style src="~/assets/css/world.css">
</style>
<style src="~/assets/css/shell.css">
</style>
