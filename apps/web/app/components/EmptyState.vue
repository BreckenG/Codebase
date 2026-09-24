<script setup>
defineProps({ icon: { type: String, default: "inbox" }, title: { type: String, required: true }, body: { type: String, default: "" } });
</script>
<template>
<div class="empty"><span class="empty__tile"><AppIcon :name="icon" /></span><h3>{{ title }}</h3><p v-if="body" class="meta">{{ body }}</p><slot /></div>
</template>
