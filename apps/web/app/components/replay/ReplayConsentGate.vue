<script setup>
const props = defineProps({ required: { type: Boolean, default: true }, settings: Boolean });
const { me, load } = useMe();
const { consent, loadConsent, saveConsent } = useReplayConsent();
const checked = ref(false);
onMounted(async () => { await load(); if (props.required || props.settings) await loadConsent(); });
watch(() => props.required, async required => { if (required) { checked.value = false; await loadConsent(); } });
watch(() => me.value.user?.id, async () => { checked.value = false; await loadConsent(); });
watch(() => consent.value.accepted, () => { checked.value = false; });
async function accept() { if (checked.value) await saveConsent(true); }
</script>
<template>
<slot v-if="!required || (!settings && consent.loaded && consent.accepted && !consent.error)" />
<section v-else class="replay-consent" :aria-busy="consent.busy"><h2>{{ settings ? 'Replay and training permission' : 'Before you play' }}</h2><p v-if="!consent.loaded" class="meta" role="status">Loading your recording permission...</p><template v-else><p>This permission covers recording your gameplay movement and routes in Scrims (including Auto Ref), Practice, AI Trainer, and Mirror Bot when those modes are available. It allows us to use new replays to train and improve AI bots, including bots that learn your movement.</p><p class="meta">This permission is separate from account terms. You can withdraw it in Settings to stop new recordings. Withdrawal does not remove the influence of earlier training from an existing model. <NuxtLink to="/legal/privacy">Read the Privacy policy</NuxtLink>.</p><p v-if="consent.error" role="alert" class="bad">{{ consent.error }}</p><button v-if="consent.error" class="btn" :disabled="consent.busy" @click="loadConsent">Try again</button><template v-else-if="settings && consent.accepted"><p class="meta">Permission granted{{ consent.acceptedAt ? ' on ' + exact(consent.acceptedAt) : '' }}.</p><button class="btn" :disabled="consent.busy" @click="saveConsent(false)">{{ consent.busy ? 'Saving...' : 'Withdraw permission' }}</button></template><template v-else><label class="consent-check"><input v-model="checked" type="checkbox" :disabled="consent.busy || !me.user" /><span>I agree to recording my gameplay replays and using them for AI training in Scrims (including Auto Ref), Practice, AI Trainer, and Mirror Bot.</span></label><div class="replay-consent__actions"><button class="btn btn--brand" :disabled="!checked || consent.busy || !me.user" @click="accept">{{ consent.busy ? 'Saving...' : 'Save permission' }}</button><NuxtLink v-if="!settings" class="btn btn--ghost" to="/play?mode=ranked">Cancel</NuxtLink></div><p class="meta">{{ me.user ? 'Saving permission does not start a session or join a queue.' : 'Sign in before saving your permission.' }}</p></template></template></section>
</template>
<style scoped>
.replay-consent{display:grid;gap:18px;padding:26px;border:1px solid var(--color-divider);border-radius:var(--radius-lg);background:var(--surface-2)}.replay-consent h2{font-size:20px}.replay-consent p{margin:0;line-height:1.7}.replay-consent a:not(.btn){color:var(--color-brand);text-decoration:underline}.replay-consent .consent-check{display:flex;align-items:flex-start;gap:12px;line-height:1.65}.replay-consent input{margin-top:6px;accent-color:var(--color-brand);width:18px;height:18px;flex:none}.replay-consent__actions{display:flex;gap:10px;flex-wrap:wrap}.replay-consent>.btn{justify-self:start}
</style>
