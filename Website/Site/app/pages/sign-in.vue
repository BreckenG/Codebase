<script setup>
import { loginReturnPath } from '~/utils/login-return.js';

useSeo({
  title: 'Sign in with Discord',
  description:
    'Sign in to Ranked World with Discord to connect your Gorilla Tag account, join ranked codes and enter the leaderboard.',
});
const route = useRoute();
const desktop = useDesktop();
const returnTo = computed(() => loginReturnPath(route.query.returnTo) || '');
</script>

<template>
  <main id="main" class="page">
    <div class="wrap si">
      <div class="si__copy">
        <h1 class="reveal-up">Sign in</h1>
        <p class="lead reveal-up" style="--i: 1">
          Discord shares your user ID, display name, and avatar. We do not request your email, contacts, messages, or
          password. Connecting Gorilla Tag is a separate step.
        </p>
        <p class="meta reveal-up" style="--i: 2">
          Read how we use your data in the <NuxtLink to="/legal/privacy">Privacy policy</NuxtLink> and
          <NuxtLink to="/legal/cookies">Cookie policy</NuxtLink>.
        </p>
        <button
          v-if="desktop.enabled"
          type="button"
          class="btn btn--brand btn--large"
          :disabled="desktop.loginPending.value"
          @click="desktop.signIn"
        >
          Continue in browser
        </button>
        <form v-else action="/auth/login" method="post" class="si__form reveal-up" style="--i: 3">
          <input type="hidden" name="returnTo" :value="returnTo" />
          <input type="hidden" name="policyVersion" :value="POLICY_VERSION" />
          <label class="consent-check">
            <input type="checkbox" name="accepted" value="yes" required />
            <span>
              I agree to the <NuxtLink to="/legal/terms">Terms and conditions</NuxtLink>. I am at least 13 and meet the
              higher minimum age, if any, required in my country and by Discord. If I am a minor, my parent or guardian
              has agreed to these terms.
            </span>
          </label>
          <button type="submit" class="btn btn--brand btn--large"><AppIcon name="discord" />Continue to Discord</button>
        </form>
        <p class="meta">This does not authorize marketing or use of your gameplay to train AI.</p>
      </div>
      <ClientOnly><GorillaFigure class="si__fig" pose="wave" :color="[0.93, 0.45, 0.1]" /></ClientOnly>
    </div>
  </main>
</template>

<style scoped>
.si {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 460px);
  gap: 48px;
  align-items: center;
}
.si__copy {
  display: grid;
  justify-items: start;
  gap: 20px;
  max-width: 620px;
}
.si__copy .lead {
  color: var(--text);
  font-size: 18px;
}
.si__copy a {
  color: var(--brand);
  text-decoration: underline;
}
.si__form {
  display: grid;
  justify-items: start;
  gap: 18px;
}
.si__form .consent-check {
  margin: 0;
}
.si__fig {
  width: 100%;
  height: 560px;
}
@media (max-width: 860px) {
  .si {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .si__fig {
    order: -1;
    height: 300px;
  }
}
</style>
