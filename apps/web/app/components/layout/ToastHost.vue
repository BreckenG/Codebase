<script setup>
const { items, drop } = useToast();
const ICONS = { ok: "check", bad: "info", info: "info" };
</script>
<template>
<div class="toasts" role="status" aria-live="polite"><TransitionGroup name="toast"><div v-for="t in items" :key="t.id" class="toast" :class="`toast--${t.kind}`"><AppIcon :name="ICONS[t.kind] || 'check'" /><span>{{ t.text }}</span><button class="icon-btn toast__x" aria-label="Dismiss" @click="drop(t.id)"><AppIcon name="x" /></button></div></TransitionGroup></div>
</template>
