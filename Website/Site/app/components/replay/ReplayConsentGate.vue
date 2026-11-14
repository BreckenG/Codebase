<script setup>
const props = defineProps({ required: { type: Boolean, default: true }, settings: Boolean });
const { me, load } = useMe();
const { consent, loadConsent, saveConsent } = useReplayConsent();
const checked = ref(false);
const open = computed(
  () => !props.required || (!props.settings && consent.value.loaded && consent.value.accepted && !consent.value.error),
);
onMounted(async () => {
  await load();
  if (props.required || props.settings) await loadConsent();
});
watch(
  () => props.required,
  async (required) => {
    if (!required) return;
    checked.value = false;
    await loadConsent();
  },
);
watch(
  () => me.value.user?.id,
  async () => {
    checked.value = false;
    await loadConsent();
  },
);
watch(
  () => consent.value.accepted,
  () => {
    checked.value = false;
  },
);

async function accept() {
  if (checked.value) await saveConsent(true);
}
</script>

<template>
  <slot v-if="open" />
  <section v-else class="gate panel" :aria-busy="consent.busy">
    <h2>{{ settings ? 'Replay and training permission' : 'Before you play' }}</h2>
    <p v-if="!consent.loaded" class="meta" role="status">Loading your recording permission...</p>
    <template v-else>
      <p>
        This permission covers recording your gameplay movement and routes in Scrims (including Auto Ref), Practice, AI
        Trainer, and Mirror Bot when those modes are available. It allows us to use new replays to train and improve AI
        bots, including bots that learn your movement.
      </p>
      <p class="meta">
        This permission is separate from account terms. You can withdraw it in Settings to stop new recordings.
        Withdrawal does not remove the influence of earlier training from an existing model.
        <NuxtLink to="/legal/privacy">Read the Privacy policy</NuxtLink>.
      </p>
      <p v-if="consent.error" role="alert" class="bad">{{ consent.error }}</p>
      <button v-if="consent.error" class="btn" :disabled="consent.busy" @click="loadConsent">Try again</button>
      <template v-else-if="settings && consent.accepted">
        <p class="meta">Permission granted{{ consent.acceptedAt ? ` on ${exact(consent.acceptedAt)}` : '' }}.</p>
        <button class="btn" :disabled="consent.busy" @click="saveConsent(false)">
          {{ consent.busy ? 'Saving...' : 'Withdraw permission' }}
        </button>
      </template>
      <template v-else>
        <label class="consent-check">
          <input v-model="checked" type="checkbox" :disabled="consent.busy || !me.user" />
          <span>
            I agree to recording my gameplay replays and using them for AI training in Scrims (including Auto Ref),
            Practice, AI Trainer, and Mirror Bot.
          </span>
        </label>
        <div class="go-row">
          <button class="btn btn--brand" :disabled="!checked || consent.busy || !me.user" @click="accept">
            {{ consent.busy ? 'Saving...' : 'Save permission' }}
          </button>
          <NuxtLink v-if="!settings" class="btn btn--ghost" to="/play?mode=ranked">Cancel</NuxtLink>
        </div>
        <p class="meta">
          {{
            me.user
              ? 'Saving permission does not start a session or join a queue.'
              : 'Sign in before saving your permission.'
          }}
        </p>
      </template>
    </template>
  </section>
</template>

<style scoped>
.gate {
  display: grid;
  gap: 18px;
}
.gate h2 {
  font-size: clamp(26px, 3vw, 36px);
}
.gate p {
  max-width: 68ch;
}
.gate a:not(.btn) {
  color: var(--brand);
  text-decoration: underline;
}
.gate > .btn {
  justify-self: start;
}
</style>
