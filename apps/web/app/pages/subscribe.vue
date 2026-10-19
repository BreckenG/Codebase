<script setup>
const route = useRoute();
const refCode = computed(() =>
  String(route.query.ref || '')
    .trim()
    .toUpperCase()
    .slice(0, 20),
);
const { data, error, refresh } = await useApiFetch(
  () => `/api/billing/config${refCode.value ? `?ref=${encodeURIComponent(refCode.value)}` : ''}`,
  { key: `billing-config:${String(route.query.ref || 'none').toUpperCase()}`, default: () => null },
);
const config = computed(() => data.value);
const tiers = computed(() => config.value?.catalog?.tiers || []);
const referral = computed(() => config.value?.referral || null);
const currentPlan = computed(() => config.value?.plan?.plan || 'free');
const interval = ref(route.query.ref ? 'monthly' : 'yearly');
watch(
  config,
  (c) => {
    if (c?.catalog?.defaultInterval) interval.value = route.query.ref ? 'monthly' : c.catalog.defaultInterval;
  },
  { immediate: true },
);
const cycles = computed(() => tiers.value[0]?.intervals || []);
const openTier = ref(null);
const modalTier = computed(() => tiers.value.find((t) => t.key === openTier.value) || null);
const FREE = [
  'Ranked codes and leaderboards',
  '1 practice match per day (coming soon)',
  'Basic training categories',
  'Last 25 matches',
];
const features = [
  {
    name: 'Replay library (scrims and practice)',
    free: 'None',
    plus: '10 replays / 7 days',
    pro: '100 replays / 30 days',
  },
  { name: 'Replay length', free: 'None', plus: 'Up to 15 minutes', pro: 'Up to 60 minutes' },
  { name: 'Movement stats', free: 'Basic', plus: 'All available stats', pro: 'All available stats' },
  { name: 'Profile cards', free: 'Basic', plus: 'More themes and fonts', pro: 'All customization' },
  { name: 'First into new codes', free: 'None', plus: 'None', pro: '2 minutes before public' },
  { name: 'See who is in each code', free: 'None', plus: 'None', pro: 'Names and ranks' },
  { name: 'Upcoming code preview', free: 'None', plus: 'None', pro: '15 minutes before rotation' },
  { name: 'Queue priority', free: 'Standard', plus: 'Priority', pro: 'Priority' },
  { name: 'Friend leaderboard', free: 'None', plus: 'Included', pro: 'Included' },
  { name: 'Practice matches (coming soon)', free: '1 per day', plus: '3 per day', pro: '10 per day' },
  { name: 'Bot difficulty (coming soon)', free: 'Up to Average', plus: 'Up to Good', pro: 'Up to Best' },
  { name: 'Training categories (coming soon)', free: 'Basic', plus: 'Advanced + cut offs', pro: 'All categories' },
  { name: 'Match history', free: '25 matches', plus: 'Unlimited', pro: 'Unlimited' },
];
const COLS = [
  { key: 'free', name: 'Free' },
  { key: 'plus', name: 'Plus' },
  { key: 'pro', name: 'Pro' },
];
const includes = (key) => (key === 'plus' ? 'Includes Free benefits' : 'Includes Plus benefits');
useSeo({
  title: 'Membership: Plus and Pro',
  description:
    'Compare Free, Plus and Pro on Ranked World. Replays, movement stats, profile card themes, practice matches per day, bot difficulty and match history.',
});
</script>

<template>
  <main id="main" class="page">
    <div class="wrap">
      <header class="page-head">
        <div>
          <h1 class="reveal-up">Membership</h1>
        </div>
        <NuxtLink v-if="config?.signedIn" class="btn btn--ghost" to="/settings#membership">
          Manage subscription<AppIcon name="arrowRight" />
        </NuxtLink>
      </header>

      <div v-if="error" class="alert" role="alert">
        <p>Could not load plans.</p>
        <button class="btn btn--small" @click="refresh">Try again</button>
      </div>
      <template v-else-if="config?.catalog">
        <p v-if="referral && referral.eligible" class="alert sub__ref" role="status">
          <span>
            <strong>{{ referral.code }} applied.</strong> {{ referral.percent }}% off your first payment on any plan.
            Renewals are at the regular price. The partner behind this code earns a commission on your first year of
            payments.
          </span>
        </p>
        <p v-else-if="referral" class="alert" role="status">
          <span>
            <strong>{{ referral.code }}</strong> gives {{ referral.percent }}% off a first subscription. It does not
            apply to your account.
          </span>
        </p>

        <div class="sub__cycle">
          <div class="seg" role="group" aria-label="Billing cycle">
            <button
              v-for="cycle in cycles"
              :key="cycle.key"
              :aria-pressed="interval === cycle.key"
              @click="interval = cycle.key"
            >
              {{ cycle.label }}
            </button>
          </div>
        </div>

        <div class="sub__plans">
          <section class="plan plan--free">
            <ClientOnly>
              <GorillaFigure class="plan__fig" pose="idle" :color="[0.55, 0.55, 0.58]" :glow="[0.7, 0.7, 0.75]" />
            </ClientOnly>
            <div class="plan__head">
              <h2>Free</h2>
              <span v-if="currentPlan === 'free' && config.signedIn" class="chip chip--live">Current plan</span>
            </div>
            <p class="plan__price"><strong>$0</strong><span>/ month</span></p>
            <p class="meta">No subscription required</p>
            <NuxtLink class="btn" to="/play">Play ranked</NuxtLink>
            <ul class="plan__list">
              <li v-for="f in FREE" :key="f"><AppIcon name="check" />{{ f }}</li>
            </ul>
          </section>
          <PlusPlanCard
            v-for="tier in tiers"
            :key="tier.key"
            :tier="tier"
            :interval="interval"
            :configured="config.configured"
            :signed-in="config.signedIn"
            :current-plan="currentPlan"
            :referral="referral"
            @subscribe="openTier = $event"
          />
        </div>
        <p class="meta sub__note">
          Prices in USD. Cancel anytime.<span v-if="!config.configured">
            Paid subscriptions are not available yet.</span
          >
        </p>

        <section class="section">
          <div class="section-head"><h2>Compare plans</h2></div>
          <div class="sub__table" role="region" aria-label="Membership comparison" tabindex="0">
            <table class="table">
              <thead>
                <tr>
                  <th />
                  <th v-for="c in COLS" :key="c.key" class="sub__col" :class="`sub__col--${c.key}`">{{ c.name }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in features" :key="f.name">
                  <th scope="row">{{ f.name }}</th>
                  <td v-for="c in COLS" :key="c.key" class="sub__cell" :class="`sub__col--${c.key}`">
                    <span v-if="f[c.key] === 'None'" class="sub__no" aria-label="Not included"
                      ><AppIcon name="x"
                    /></span>
                    <template v-else>
                      <span class="sub__yes" aria-label="Included"><AppIcon name="check" /></span>
                      <small v-if="f[c.key] !== 'Included'">{{ f[c.key] }}</small>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <details class="sub__more">
          <summary>All membership benefits<AppIcon name="chevron" /></summary>
          <div class="sub__perks">
            <section v-for="tier in [config.catalog.free, ...tiers]" :key="tier.key">
              <h3>{{ tier.name }}</h3>
              <p v-if="tier.key !== 'free'" class="meta">{{ includes(tier.key) }}</p>
              <ul class="plan__list">
                <li v-for="perk in tier.perks" :key="perk"><AppIcon name="check" />{{ perk }}</li>
              </ul>
            </section>
          </div>
        </details>
      </template>
      <div v-else class="skeleton" role="status" aria-label="Loading plans" />
      <PlusCheckoutModal
        :open="Boolean(openTier)"
        :tier="modalTier"
        :interval="interval"
        :publishable-key="config?.publishableKey || ''"
        @close="openTier = null"
      />
    </div>
  </main>
</template>

<style scoped>
.sub__ref {
  border-color: color-mix(in srgb, var(--brand) 40%, transparent);
}
.sub__cycle {
  display: flex;
  justify-content: center;
  margin: 8px 0 28px;
}
.sub__plans {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}
.sub__note {
  margin-top: 18px;
  text-align: center;
}
.sub__table {
  overflow-x: auto;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--panel);
}
.sub__table table {
  min-width: 680px;
}
.sub__table th[scope='row'] {
  color: var(--text);
  font-size: 14px;
  font-weight: 400;
}
.sub__table th.sub__col {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
  text-align: center;
}
.sub__col--plus {
  color: var(--plus);
}
.sub__col--pro {
  color: var(--pro);
}
.sub__table td.sub__cell {
  text-align: center;
  white-space: normal;
}
.sub__table td.sub__col--pro {
  background: color-mix(in srgb, var(--pro) 6%, transparent);
}
.sub__yes,
.sub__no {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
}
.sub__yes {
  background: color-mix(in srgb, var(--good) 16%, transparent);
  color: var(--good);
}
.sub__no {
  background: var(--raise);
  color: var(--dim);
}
.sub__yes svg,
.sub__no svg {
  width: 14px;
  height: 14px;
}
.sub__cell small {
  display: block;
  margin-top: 6px;
  color: var(--dim);
  font-size: 12px;
}
.sub__more {
  padding: 8px 0 24px;
  border-top: 1px solid var(--line);
}
.sub__more summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  color: var(--ink);
  font-weight: 600;
  list-style: none;
  cursor: pointer;
}
.sub__more summary::-webkit-details-marker {
  display: none;
}
.sub__more summary svg {
  width: 16px;
  height: 16px;
  transition: transform 0.3s var(--ease);
}
.sub__more[open] summary svg {
  transform: rotate(180deg);
}
.sub__perks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
}
@media (max-width: 960px) {
  .sub__plans,
  .sub__perks {
    grid-template-columns: 1fr;
  }
}
</style>
