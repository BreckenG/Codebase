<script setup>
const props = defineProps({ version: { type: String, default: '' } });
const emit = defineEmits(['accepted']);
const busy = ref(false);
const failure = ref('');

async function agree() {
  if (busy.value) return;
  busy.value = true;
  failure.value = '';
  try {
    await apiFetch('/api/me/voice-consent', { method: 'POST', body: { accepted: true, version: props.version } });
    emit('accepted');
  } catch (e) {
    failure.value = e?.data?.statusMessage || 'Could not save that. Try again.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="empty voice">
    <h3>Ranked voice chat is transcribed and voice matched</h3>
    <p>
      Voice chat in ranked codes is turned into text transcripts, and audio clips of flagged lines are kept, so staff
      can enforce the rules. We also keep a voice signature (numbers that describe how your voice sounds) and a few
      short clips of your voice, to find alternate accounts of banned players. Staff can also record ranked codes for
      videos, which can include your voice. Read the <NuxtLink to="/legal/privacy">privacy policy</NuxtLink> for
      details.
    </p>
    <p>You need to agree before you can see or join ranked codes.</p>
    <p v-if="failure" class="bad" role="alert">{{ failure }}</p>
    <button class="btn btn--brand" :disabled="busy" @click="agree">{{ busy ? 'Saving...' : 'I agree' }}</button>
  </div>
</template>

<style scoped>
.voice p {
  max-width: 62ch;
}
.voice a {
  color: var(--brand);
  text-decoration: underline;
}
</style>
