<script setup>
defineProps({ label: { type: String, default: "Done" } });
</script>
<template>
<div class="tick" role="img" :aria-label="label"><svg viewBox="0 0 52 52" aria-hidden="true"><circle class="tick__halo" cx="26" cy="26" r="23" /><circle class="tick__ring" cx="26" cy="26" r="23" /><path class="tick__mark" d="M15 27.5 22.5 35 38 19" /></svg></div>
</template>
