<script setup>
const { load } = useMe();
await load();
</script>
<template>
<div class="app-frame"><NuxtLoadingIndicator color="var(--color-brand)" :height="2" /><a class="skip-link" href="#main">Skip to content</a><AppHeader /><slot /><AppFooter /><ToastHost /></div>
</template>
