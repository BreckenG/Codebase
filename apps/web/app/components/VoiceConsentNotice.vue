<script setup>
const props = defineProps({ version: { type: String, default: '' } });
const emit = defineEmits(['accepted']);
const busy = ref(false), failure = ref('');
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
<div class="world-empty voice-consent">
  <h3>Ranked voice chat is transcribed</h3>
  <p class="meta">Voice chat in ranked codes is recorded and turned into text transcripts so staff can review slurs and hate speech. Read the <NuxtLink to="/legal/privacy">privacy policy</NuxtLink> for details.</p>
  <p class="meta">You need to agree before you can see or join ranked codes.</p>
  <p v-if="failure" class="meta" role="alert">{{ failure }}</p>
  <button class="btn btn--brand" :disabled="busy" @click="agree">{{ busy ? 'Saving...' : 'I agree' }}</button>
</div>
</template>
