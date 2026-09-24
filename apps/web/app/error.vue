<script setup>
const props = defineProps({ error: { type: Object, default: null } });
const code = computed(() => Number(props.error?.statusCode) || 500);
const digits = computed(() => String(code.value).split(''));
const title = computed(() => ({ 400: 'Invalid request', 401: 'Sign in required', 403: 'Access denied', 404: 'Page not found', 408: 'Request timed out', 410: 'Page no longer available', 429: 'Too many requests', 500: 'Something went wrong', 502: 'Server unavailable', 503: 'Service unavailable', 504: 'Request timed out' })[code.value] || 'Could not open this page');
function back() { const previous = window.history.state?.back; return clearError({ redirect: typeof previous === 'string' && previous.startsWith('/') && !previous.startsWith('//') ? previous : '/' }); }
useHead(() => ({ title: `${title.value} | Ranked World` }));
</script>
<template>
<main id="main" class="world-app world-error"><div class="world-error-code" role="img" :aria-label="`Error ${code}`"><span v-for="(digit, index) in digits" :key="index" class="world-error-digit" :class="{ 'world-error-planet': digit === '0' }" aria-hidden="true"><img v-if="digit === '0'" src="/img/planet-grey.png" alt="" /><template v-else>{{ digit }}</template></span></div><h1>{{ title }}</h1><button class="btn" @click="back"><AppIcon name="arrowLeft" />Back</button></main>
</template>
<style src="~/assets/css/world.css">
</style>
