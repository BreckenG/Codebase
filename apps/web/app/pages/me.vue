<script setup>
const { load } = useMe();
const route = useRoute();
const failed = ref(false);
onMounted(async () => {
  const state = await load(true);
  if (state.user) return navigateTo(`/player/${state.user.id}`, { replace: true });
  if (route.query.from === 'login') failed.value = true;
  else window.location.href = '/auth/login';
});
useHead({ title: 'Your profile | Ranked World' });
</script>

<template>
  <main id="main" class="page">
    <div class="wrap handoff">
      <div v-if="failed" class="empty">
        <h1>Could not finish signing you in</h1>
        <p>Your browser did not keep the session. Check cookies are on, then try again.</p>
        <a class="btn btn--brand btn--large" href="/sign-in"><AppIcon name="discord" />Try again</a>
      </div>
      <div v-else class="handoff__wait">
        <span class="handoff__orbit" aria-hidden="true"><img src="/img/planet.png" alt="" width="56" height="56" /></span>
        <h1>Taking you to your profile</h1>
        <p class="meta">One moment.</p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.handoff {
  display: grid;
  place-items: center;
  min-height: 52vh;
}
.handoff h1 {
  font-size: clamp(32px, 4vw, 52px);
}
.handoff__wait {
  display: grid;
  justify-items: center;
  gap: 10px;
  text-align: center;
}
.handoff__orbit {
  position: relative;
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  margin-bottom: 14px;
}
.handoff__orbit::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid var(--raise-2);
  border-top-color: var(--brand);
  border-radius: 50%;
  animation: spin 1.1s linear infinite;
}
.handoff__orbit img {
  object-fit: contain;
  animation: bob 2.6s ease-in-out infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes bob {
  50% {
    transform: translateY(6px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .handoff__orbit img {
    animation: none;
  }
}
</style>
