<script setup>
import { loginReturnPath } from '~/utils/login-return.js';
const { enabled: desktop, openWebsite } = useDesktop();
const route = useRoute();
const subscribePath = computed(
  () =>
    loginReturnPath(typeof route.query.ref === 'string' ? `/subscribe?ref=${route.query.ref}` : '/subscribe') ||
    '/subscribe',
);
const signInPath = computed(() => `/sign-in?returnTo=${encodeURIComponent(subscribePath.value)}`);
const props = defineProps({
  tier: { type: Object, required: true },
  interval: { type: String, default: 'yearly' },
  configured: Boolean,
  signedIn: Boolean,
  currentPlan: { type: String, default: 'free' },
  referral: { type: Object, default: null },
});
defineEmits(['subscribe']);
const LOOK = { plus: { pose: 'wave', color: [0.16, 0.76, 0.94] }, pro: { pose: 'cheer', color: [0.66, 0.44, 1] } };
const look = computed(() => LOOK[props.tier.key] || LOOK.plus);
const owned = computed(() => props.currentPlan === props.tier.key);
const chosen = computed(() => props.tier.intervals.find((i) => i.key === props.interval) || props.tier.intervals[0]);
const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const deal = computed(() => {
  const r = props.referral;
  if (!r || !r.eligible || (r.interval && props.interval !== r.interval)) return null;
  const amount = chosen.value?.amount;
  if (!amount || !r.percent) return null;
  return {
    was: money(amount),
    now: money(Math.round((amount * (100 - r.percent)) / 100)),
    percent: r.percent,
    code: r.code,
  };
});
const highlights = computed(() =>
  props.tier.key === 'plus'
    ? [
        '10 recent scrim and practice replays, up to 15 minutes',
        'All available movement stats',
        'More card styles and priority queue',
        '3 practice matches per day (coming soon)',
      ]
    : [
        '100 scrim and practice replays, up to 60 minutes',
        'Every card customization',
        'New codes 2 minutes before everyone',
        'See who is in every code',
        '2 extra seats in full codes',
        'No ads',
        '10 practice matches per day (coming soon)',
        'All Plus benefits',
      ],
);
</script>
<template>
  <section class="plan" :class="`plan--${tier.key}`">
    <ClientOnly
      ><GorillaFigure class="plan__fig" :pose="look.pose" :color="look.color" :glow="look.color"
    /></ClientOnly>
    <div class="plan__head">
      <h2>{{ tier.name }}</h2>
      <span v-if="owned && signedIn" class="chip chip--live">Current plan</span>
      <span v-else-if="deal" class="chip chip--brand">{{ deal.percent }}% off</span>
      <span v-else-if="chosen.savings" class="chip chip--brand">Save {{ chosen.savings }}%</span>
    </div>
    <p v-if="deal" class="plan__price">
      <s>{{ deal.was }}</s
      ><strong>{{ deal.now }}</strong
      ><span>/ first payment</span>
    </p>
    <p v-else class="plan__price">
      <strong>{{ chosen.perMonth }}</strong
      ><span>/ month</span>
    </p>
    <p v-if="deal" class="meta">{{ deal.code }} applied, {{ deal.percent }}% off. Renews at {{ deal.was }} / month.</p>
    <p v-else class="meta">{{ chosen.price }} billed {{ chosen.label.toLowerCase() }}</p>
    <button v-if="desktop" class="btn btn--brand" @click="openWebsite(subscribePath)">
      View on website<AppIcon name="external" />
    </button>
    <NuxtLink v-else-if="owned && signedIn" class="btn" to="/settings#membership">Manage plan</NuxtLink>
    <button v-else-if="!configured" class="btn" disabled>Unavailable</button>
    <a v-else-if="!signedIn" class="btn btn--brand" :href="signInPath">Sign in to subscribe</a>
    <button v-else class="btn btn--brand" @click="$emit('subscribe', tier.key)">Choose {{ tier.name }}</button>
    <ul class="plan__list">
      <li v-for="feature in highlights" :key="feature"><AppIcon name="check" />{{ feature }}</li>
    </ul>
  </section>
</template>
