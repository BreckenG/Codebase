<script setup>
const props = defineProps({ mods: { type: Array, default: () => [] } });
const emit = defineEmits(['cleared']);
const busy = ref(false);
const failure = ref('');
const one = computed(() => props.mods.length === 1);

async function done() {
  if (busy.value) return;
  busy.value = true;
  failure.value = '';
  try {
    await apiFetch('/api/me/mods', { method: 'POST', body: { removed: true } });
    emit('cleared');
  } catch (e) {
    failure.value = e?.data?.statusMessage || 'Could not save that. Try again.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="empty">
    <h3>Remove your mods to play ranked</h3>
    <p>
      Your game had {{ one ? 'a mod' : 'mods' }} on in a ranked lobby<template v-if="mods.length"
        >: {{ mods.join(', ') }}</template
      >. Mods are not allowed in ranked, so you were removed from the code.
    </p>
    <p>
      Delete {{ one ? 'it' : 'them' }} from your game and restart it. If a mod is still on when you join, you get
      removed again.
    </p>
    <p v-if="failure" class="bad" role="alert">{{ failure }}</p>
    <button class="btn btn--brand" :disabled="busy" @click="done">{{ busy ? 'Saving...' : 'I removed them' }}</button>
  </div>
</template>
