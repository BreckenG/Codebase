<script setup>
const props = defineProps({ plan: { type: Object, default: null }, tiers: { type: Array, default: () => [] } });
const emit = defineEmits(["changed"]);
const error = ref("");
const confirmCancel = ref(false);
const current = computed(() => props.plan?.plan || "free");
const subscribed = computed(() => current.value !== "free");
const canceling = computed(() => Boolean(props.plan?.cancelAtPeriodEnd));
const pending = computed(() => props.plan?.pendingPlan || null);
const tierName = key => props.tiers.find(t => t.key === key)?.name || key;
const renewLabel = computed(() => { const d = props.plan?.currentPeriodEnd; if (!d) return null; return new Date(d).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }); });
const nextUp = computed(() => { if (!subscribed.value) return null; if (canceling.value) return `Ends on ${renewLabel.value}. You keep everything until then.`; if (pending.value) return `Switches to ${tierName(pending.value)} on ${renewLabel.value}.`; if (renewLabel.value) return `Renews on ${renewLabel.value}.`; return null; });
async function act(path) { error.value = ""; await apiPost(path); confirmCancel.value = false; emit("changed"); }
function onFail(e) { error.value = e?.message || "That did not go through."; }
</script>
<template>
<div class="card manage"><div class="manage__head"><div><h2 class="card-title">Subscription</h2><p class="meta">{{ subscribed ? "Ranked World " + tierName(current) : "Free plan" }}</p></div><span v-if="subscribed" class="tag" :data-plan="current">{{ tierName(current) }}</span></div><p v-if="nextUp" class="meta manage__next">{{ nextUp }}</p><p v-if="plan?.status === 'past_due'" class="manage__warn">
      Last payment did not go through. Stripe retries on its own and nothing switches off in the meantime.
    </p><p v-if="error" class="manage__warn">{{ error }}</p><div v-if="!subscribed" class="manage__actions"><NuxtLink class="btn btn--brand" to="/subscribe">See the plans</NuxtLink></div><div v-else class="manage__actions"><NuxtLink v-if="!canceling" class="btn btn--brand" to="/subscribe">
        {{ current === "pro" ? "Change plan" : "Upgrade to Pro" }}
      </NuxtLink><ActionButton v-if="canceling || pending" small icon="check" :action="() => act('/api/billing/resume')" done-label="Kept" fail-label="Did not go through" @fail="onFail" >
        {{ canceling ? "Keep my subscription" : "Cancel the switch" }}
      </ActionButton><template v-if="!canceling"><button v-if="!confirmCancel" class="btn btn--ghost" @click="confirmCancel = true">Cancel subscription</button><template v-else><ActionButton small variant="danger" :action="() => act('/api/billing/cancel')" done-label="Cancelled" fail-label="Did not go through" @fail="onFail" >
            Yes, cancel it
          </ActionButton><button class="btn btn--ghost" @click="confirmCancel = false">Never mind</button></template></template></div><p v-if="confirmCancel && !canceling" class="meta manage__note">
      You keep everything until {{ renewLabel || "the end of the period" }}, and you can undo this any time before then.
    </p></div>
</template>
<style scoped>
.manage__head{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--gap-16)}
.manage__next{margin-top:var(--gap-8)}
.manage__warn{margin-top:var(--gap-12);color:var(--color-red)}
.manage__actions{display:flex;flex-wrap:wrap;gap:var(--gap-8);margin-top:var(--gap-16)}
.manage__note{margin-top:var(--gap-12)}
.tag[data-plan="plus"]{color:var(--color-plus);background:var(--color-plus-highlight)}
.tag[data-plan="pro"]{color:var(--color-pro);background:var(--color-pro-highlight)}
</style>
