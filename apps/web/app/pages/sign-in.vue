<script setup>
import { loginReturnPath } from '~/utils/login-return.js';
useSeo({ title: 'Sign in with Discord', description: 'Sign in to Ranked World with Discord to connect your Gorilla Tag account, join ranked codes and enter the leaderboard.' });
const route = useRoute();
const desktop = useDesktop();
const returnTo = computed(() => loginReturnPath(route.query.returnTo) || '');
</script>
<template>
<main id="main" class="wrap section legal"><div class="world-page-title"><h1>Sign in</h1></div><section class="world-settings-section"><h2>Connect Discord</h2><p>Discord shares your user ID, display name, and avatar. We do not request your email, contacts, messages, or password. Connecting Gorilla Tag is a separate step.</p><p>Read how we use your data in the <NuxtLink to="/legal/privacy">Privacy policy</NuxtLink> and <NuxtLink to="/legal/cookies">Cookie policy</NuxtLink>.</p><button v-if="desktop.enabled" type="button" class="btn btn--brand" :disabled="desktop.loginPending.value" @click="desktop.signIn">Continue in browser</button><form v-else action="/auth/login" method="post" class="legal-consent-form"><input type="hidden" name="returnTo" :value="returnTo" /><input type="hidden" name="policyVersion" :value="POLICY_VERSION" /><label class="consent-check"><input type="checkbox" name="accepted" value="yes" required /><span>I agree to the <NuxtLink to="/legal/terms">Terms and conditions</NuxtLink>. I am at least 13 and meet the higher minimum age, if any, required in my country and by Discord. If I am a minor, my parent or guardian has agreed to these terms.</span></label><button type="submit" class="btn btn--brand"><AppIcon name="discord" />Continue to Discord</button></form><p class="meta">This does not authorize marketing or use of your gameplay to train AI.</p></section></main>
</template>
<style src="~/assets/css/legal.css">
</style>
