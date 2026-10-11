<script setup>
const { data, error, pending } = await useApiFetch('/api/me/shares', { key: 'my-shares', default: () => null });
const country = ref('US');
const busy = ref(false);
const failure = ref('');
const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
const day = (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const setupLabel = computed(() => {
  if (busy.value) return 'Opening...';
  return data.value?.payout?.connected ? 'Finish setup' : 'Start setup';
});

async function setup() {
  busy.value = true;
  failure.value = '';
  try {
    const r = await apiFetch('/api/me/shares', { method: 'POST', body: { country: country.value } });
    window.location.assign(r.url);
  } catch (e) {
    failure.value = e?.data?.statusMessage || 'Could not start payout setup. Try again.';
    busy.value = false;
  }
}

useHead({ title: 'Payouts | Ranked World', meta: [{ name: 'robots', content: 'noindex,nofollow' }] });
</script>

<template>
  <main id="main" class="page">
    <div class="wrap po">
      <header class="page-head"><h1 class="reveal-up">Payouts</h1></header>
      <div v-if="pending && !data" class="skeleton" role="status" aria-label="Loading" />
      <div v-else-if="error || !data" class="empty">
        <h3>Nothing here</h3>
        <p>This page is only for Ranked World management.</p>
      </div>
      <template v-else>
        <section v-if="!data.payout?.manual && !data.payout?.ready" class="panel po__card">
          <h2>Set up your payouts</h2>
          <p class="meta">Stripe sends your money to your bank. You need to be 18 or older to own the account.</p>
          <p v-if="failure" class="bad" role="alert">{{ failure }}</p>
          <div class="po__setup">
            <label class="po__field">
              <span class="meta">Country</span>
              <input v-model="country" class="field" maxlength="2" />
            </label>
            <button class="btn btn--brand" :disabled="busy" @click="setup">{{ setupLabel }}</button>
          </div>
        </section>
        <section class="panel po__card">
          <h2>Sent to you</h2>
          <p class="po__total">{{ money(data.totalCents) }}<span class="meta"> in total</span></p>
          <p v-if="!data.gifts.length" class="meta">Nothing yet.</p>
          <ul v-else class="po__list">
            <li v-for="(g, n) in data.gifts" :key="n">
              <span>{{ day(g.paidAt) }}</span>
              <span class="meta">{{ g.method === 'manual' ? 'Sent by hand' : 'Stripe' }}</span>
              <strong>{{ money(g.cents) }}</strong>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.po {
  display: grid;
  gap: 20px;
  max-width: 760px;
}
.po .page-head {
  margin-bottom: 20px;
}
.po__card {
  display: grid;
  gap: 10px;
}
.po__card h2 {
  font-size: 28px;
}
.po__setup {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 8px;
}
.po__field {
  display: grid;
  gap: 6px;
}
.po__field input {
  width: 84px;
  min-height: 44px;
  padding: 0 12px;
  color: var(--ink);
  font: inherit;
  text-transform: uppercase;
}
.po__total {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 44px;
  font-weight: 800;
}
.po__total .meta {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 400;
}
.po__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.po__list li {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  font-size: 14px;
}
.po__list strong {
  color: var(--ink);
}
</style>
