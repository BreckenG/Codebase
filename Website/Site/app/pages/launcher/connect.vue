<script setup>
useHead({ title: 'Connect launcher | Ranked World', meta: [{ name: 'robots', content: 'noindex, nofollow' }] });
const route = useRoute();
const { me, load } = useMe();
const code = computed(() => {
  const q = route.query.code;
  return typeof q === 'string' && /^[A-HJ-NP-Z2-9]{8}$/.test(q) ? q : '';
});
const grant = ref(null);
const accepted = ref(false);
const busy = ref(false);
const done = ref(false);
const loading = ref(true);
const error = ref('');
const signIn = computed(() => `/sign-in?returnTo=${encodeURIComponent(`/launcher/connect?code=${code.value}`)}`);
onMounted(async () => {
  if (!code.value) {
    error.value = 'This request is invalid. Start sign in again in your launcher.';
    loading.value = false;
    return;
  }
  try {
    await load(true);
    grant.value = await apiFetch('/api/desktop/request', { query: { code: code.value } });
  } catch {
    error.value = 'This request is unavailable or expired. Start sign in again in your launcher.';
  } finally {
    loading.value = false;
  }
});

async function approve() {
  if (!accepted.value || busy.value || !grant.value) return;
  busy.value = true;
  error.value = '';
  try {
    await apiFetch('/api/desktop/approve', { method: 'POST', body: { userCode: code.value, approved: true } });
    done.value = true;
  } catch {
    error.value = 'Approval failed. Your request may have expired. Start sign in again in your launcher.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main id="main" class="page">
    <div class="wrap lc">
      <section class="panel lc__card">
        <h1>Connect your launcher</h1>
        <p v-if="loading" class="meta" role="status">Checking your request.</p>
        <template v-else-if="done">
          <SuccessCheck label="Launcher approved" />
          <h2>Launcher approved</h2>
          <p role="status">Return to your desktop launcher to finish signing in. You can close this tab.</p>
        </template>
        <template v-else-if="grant">
          <p>Confirm this code matches the code shown in your desktop launcher.</p>
          <p class="lc__code" aria-label="Approval code">{{ grant.userCode }}</p>
          <p class="meta">
            Only approve a request you started on your own computer. Approval lets the launcher access your account and
            perform account actions for 30 days, or until you sign out of the launcher.
          </p>
          <form v-if="me.user" class="lc__form" @submit.prevent="approve">
            <p>
              Signing in as <strong>{{ me.user.username }}</strong
              >.
            </p>
            <label class="consent-check">
              <input v-model="accepted" type="checkbox" required :disabled="busy" />
              <span>I started this request and want to connect this launcher to my account.</span>
            </label>
            <button type="submit" class="btn btn--brand btn--large" :disabled="!accepted || busy">
              {{ busy ? 'Connecting...' : 'Approve launcher' }}
            </button>
          </form>
          <NuxtLink v-else :to="signIn" class="btn btn--brand btn--large">
            <AppIcon name="discord" />Sign in with Discord
          </NuxtLink>
        </template>
        <p v-if="error" class="bad" role="alert">{{ error }}</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.lc {
  display: grid;
  place-items: center;
  min-height: 60vh;
}
.lc__card {
  display: grid;
  justify-items: start;
  gap: 16px;
  width: min(620px, 100%);
  padding: 40px;
}
.lc__card h1 {
  font-size: clamp(36px, 5vw, 56px);
}
.lc__code {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: clamp(40px, 7vw, 64px);
  font-weight: 800;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
}
.lc__form {
  display: grid;
  justify-items: start;
  gap: 12px;
}
.lc__form .consent-check {
  margin: 0;
}
</style>
