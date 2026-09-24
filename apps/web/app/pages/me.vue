<script setup>
const { load } = useMe();
const route = useRoute();
const failed = ref(false);
onMounted(async () => { const state = await load(true); if (state.user) return navigateTo("/player/" + state.user.id, { replace: true }); if (route.query.from === "login") failed.value = true;else window.location.href = "/auth/login"; });
useHead({ title: "Your profile | Ranked World" });
</script>
<template>
<main id="main" class="wrap section handoff"><div v-if="failed" class="card handoff__card"><EmptyState icon="user" title="Could not finish signing you in" body="Your browser did not keep the session. Check cookies are on, then try again." ><a class="btn btn--brand btn--large" href="/sign-in"><AppIcon name="discord" />Try again
        </a></EmptyState></div><div v-else class="handoff__wait"><span class="handoff__orbit" aria-hidden="true"><img src="/img/planet.png" alt="" width="56" height="56" /></span><h1>Taking you to your profile</h1><p class="meta">One moment.</p></div></main>
</template>
<style scoped>
.handoff{display:grid;place-items:center;min-height:52vh}
.handoff__card{width:min(560px, 100%)}
.handoff__wait{text-align:center}
.handoff__wait h1{margin-top:var(--gap-24);font-size:var(--text-24)}
.handoff__wait p{margin-top:var(--gap-6)}
.handoff__orbit{position:relative;display:grid;place-items:center;width:96px;height:96px;margin:0 auto}
.handoff__orbit::before{content:"";position:absolute;inset:0;border-radius:var(--radius-max);border:2px solid var(--surface-4);border-top-color:var(--color-brand);animation:spin 1.1s linear infinite}
.handoff__orbit img{width:56px;height:56px;object-fit:contain;animation:bob 2.6s var(--ease-standard) infinite}
@keyframes bob{0%, 100%{transform:translateY(-3px)}50%{transform:translateY(3px)}}
@media (prefers-reduced-motion: reduce){.handoff__orbit img{animation:none}}
</style>
