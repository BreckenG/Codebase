<script setup>
import { loginReturnPath } from '~/utils/login-return.js';
const { enabled: desktop, openWebsite } = useDesktop();
const route = useRoute();
const subscribePath = computed(() => loginReturnPath(typeof route.query.ref === 'string' ? `/subscribe?ref=${route.query.ref}` : '/subscribe') || '/subscribe');
const signInPath = computed(() => `/sign-in?returnTo=${encodeURIComponent(subscribePath.value)}`);
const props = defineProps({ tier: { type: Object, required: true }, interval: { type: String, default: 'yearly' }, configured: Boolean, signedIn: Boolean, currentPlan: { type: String, default: 'free' }, referral: { type: Object, default: null } });
defineEmits(['subscribe']);
const owned = computed(() => props.currentPlan === props.tier.key);
const chosen = computed(() => props.tier.intervals.find(i => i.key === props.interval) || props.tier.intervals[0]);
const money = cents => '$' + (cents / 100).toFixed(2);
const deal = computed(() => {
  const r = props.referral;
  if (!r || !r.eligible || props.interval !== (r.interval || 'monthly')) return null;
  const amount = chosen.value?.amount;
  if (!amount || !r.percent) return null;
  return { was: money(amount), now: money(Math.round(amount * (100 - r.percent) / 100)), percent: r.percent, code: r.code };
});
const highlights = computed(() => props.tier.key === 'plus' ? ['10 recent replays, up to 15 minutes', 'All available movement stats', 'More card styles and priority queue', '3 practice matches per day'] : ['100 replays, up to 60 minutes', 'Every card customization', 'Upcoming codes and alerts', '10 practice matches per day', 'All Plus benefits']);
</script>
<template>
<section class="world-plan" :class="`world-plan--${tier.key}`"><div class="world-plan-heading"><h2>{{ tier.name }}</h2><span v-if="owned && signedIn" class="chip">Current plan</span><span v-else-if="deal" class="chip">{{ deal.percent }}% off</span><span v-else-if="chosen.savings" class="chip">Save {{ chosen.savings }}%</span></div><p v-if="deal" class="world-plan-price"><s class="world-plan-was">{{ deal.was }}</s><strong>{{ deal.now }}</strong><span>/ first month</span></p><p v-else class="world-plan-price"><strong>{{ chosen.perMonth }}</strong><span>/ month</span></p><p v-if="deal" class="meta world-plan-billing">{{ deal.code }} applied, {{ deal.percent }}% off. Renews at {{ deal.was }} / month.</p><p v-else class="meta world-plan-billing">{{ chosen.price }} billed {{ chosen.label.toLowerCase() }}</p><button v-if="desktop" class="btn btn--brand" @click="openWebsite(subscribePath)">View on website<AppIcon name="external" /></button><NuxtLink v-else-if="owned && signedIn" class="btn" to="/settings#membership">Manage plan</NuxtLink><button v-else-if="!configured" class="btn" disabled>Unavailable</button><a v-else-if="!signedIn" class="btn btn--brand" :href="signInPath">Sign in to subscribe</a><button v-else class="btn btn--brand" @click="$emit('subscribe', tier.key)">Choose {{ tier.name }}<AppIcon name="arrowRight" /></button><ul class="world-plan-features"><li v-for="feature in highlights" :key="feature">{{ feature }}</li></ul></section>
</template>
