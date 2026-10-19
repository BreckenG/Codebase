<script setup>
defineProps({ tier: { type: String, default: 'plus' } });
</script>

<template>
  <span class="perk" :class="`perk--${tier}`"><AppIcon name="crown" />{{ tier === 'pro' ? 'Pro' : 'Plus' }}</span>
</template>

<style scoped>
.perk {
  --c: var(--plus);
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--c) 55%, transparent);
  background: color-mix(in srgb, var(--c) 14%, transparent);
  color: var(--c);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}
.perk--pro {
  --c: var(--pro);
}
.perk svg {
  width: 12px;
  height: 12px;
}
.perk::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
  transform: translateX(-120%);
  animation: sheen 3.6s ease-in-out infinite;
}
@keyframes sheen {
  0%,
  65% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(120%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .perk::after {
    animation: none;
  }
}
</style>
