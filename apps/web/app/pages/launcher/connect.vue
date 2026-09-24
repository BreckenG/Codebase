<script setup>
useHead({ title: 'Connect launcher | Ranked World', meta: [{ name: 'robots', content: 'noindex, nofollow' }] });
const route = useRoute();
const { me, load } = useMe();
const code = computed(() => typeof route.query.code === 'string' && /^[A-HJ-NP-Z2-9]{8}$/.test(route.query.code) ? route.query.code : '');
const grant = ref(null);
const accepted = ref(false);
const busy = ref(false);
const done = ref(false);
const loading = ref(true);
const error = ref('');
const signIn = computed(() => '/sign-in?returnTo=' + encodeURIComponent('/launcher/connect?code=' + code.value));
onMounted(async () => { if (!code.value) { error.value = 'This request is invalid. Start sign in again in your launcher.'; loading.value = false; return; } try { await load(true); grant.value = await apiFetch('/api/desktop/request', { query: { code: code.value } }); } catch { error.value = 'This request is unavailable or expired. Start sign in again in your launcher.'; } finally { loading.value = false; } });
async function approve() { if (!accepted.value || busy.value || !grant.value) return; busy.value = true; error.value = ''; try { await apiFetch('/api/desktop/approve', { method: 'POST', body: { userCode: code.value, approved: true } }); done.value = true; } catch { error.value = 'Approval failed. Your request may have expired. Start sign in again in your launcher.'; } finally { busy.value = false; } }
</script>
<template>
<main id="main" class="wrap section legal"><div class="world-page-title"><h1>Connect your launcher</h1></div><section class="world-settings-section"><p v-if="loading" role="status">Checking your request.</p><template v-else-if="done"><h2>Launcher approved</h2><p role="status">Return to your desktop launcher to finish signing in. You can close this tab.</p></template><template v-else-if="grant"><h2>Ranked World desktop</h2><p>Confirm this code matches the code shown in your desktop launcher.</p><p class="device-code" aria-label="Approval code">{{ grant.userCode }}</p><p>Only approve a request you started on your own computer. Approval lets the launcher access your account and perform account actions for 30 days, or until you sign out of the launcher.</p><template v-if="me.user"><p>Signing in as {{ me.user.username }}.</p><form class="legal-consent-form" @submit.prevent="approve"><label class="consent-check"><input v-model="accepted" type="checkbox" required :disabled="busy" /><span>I started this request and want to connect this launcher to my account.</span></label><button type="submit" class="btn btn--brand" :disabled="!accepted || busy">{{ busy ? 'Connecting...' : 'Approve launcher' }}</button></form></template><NuxtLink v-else :to="signIn" class="btn btn--brand">Sign in with Discord</NuxtLink></template><p v-if="error" role="alert">{{ error }}</p></section></main>
</template>
<style src="~/assets/css/legal.css">
</style>
<style scoped>
.device-code{font-size:2rem;font-weight:700;letter-spacing:.18em;font-variant-numeric:tabular-nums}
</style>
