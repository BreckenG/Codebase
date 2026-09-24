<script setup>
import WorldNav from '~/components/WorldNav.vue';
const { enabled: desktop } = useDesktop();
const { load } = useMe();
await load();
const { check: checkAdmin } = useAdmin();
onMounted(checkAdmin);
</script>
<template>
<div class="world-app" :class="{ 'launcher-app': desktop }"><NuxtLoadingIndicator color="var(--color-brand)" :height="2" /><a class="skip-link" href="#main">Skip to content</a><DesktopNav v-if="desktop" /><WorldNav v-else /><div class="world-content"><DesktopBar /><slot /><footer v-if="!desktop" class="world-footer"><span>Ranked World</span><nav aria-label="Footer"><NuxtLink to="/legal/terms">Terms</NuxtLink><NuxtLink to="/legal/privacy">Privacy</NuxtLink><NuxtLink to="/legal/refunds">Refunds</NuxtLink><NuxtLink to="/legal/cookies">Cookies</NuxtLink><NuxtLink to="/legal/business">Contact</NuxtLink><a href="https://discord.gg/b4nxZCbdR4">Support</a><NuxtLink to="/subscribe">Membership</NuxtLink></nav><a class="world-footer__gh" href="https://github.com/BreckenG/Codebase" target="_blank" rel="noopener"><AppIcon name="github" />GitHub</a></footer></div><DesktopPrompts v-if="desktop" /><ToastHost /></div>
</template>
<style src="~/assets/css/world.css">
</style>
