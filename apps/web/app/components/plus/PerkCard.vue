<script setup>
defineProps({
  tier: { type: String, default: 'plus' },
  title: { type: String, required: true },
  cta: { type: String, default: '' },
  to: { type: String, default: '/subscribe' },
});
</script>

<template>
  <section class="pc" :class="`pc--${tier}`">
    <span class="pc__spark" aria-hidden="true"><i v-for="n in 6" :key="n" :style="{ '--n': n }" /></span>
    <div class="pc__body">
      <PerkTag :tier="tier" />
      <h3>{{ title }}</h3>
      <div class="pc__text"><slot /></div>
    </div>
    <NuxtLink class="btn btn--brand pc__go" :to="to">
      {{ cta || `Get ${tier === 'pro' ? 'Pro' : 'Plus'}` }}<AppIcon name="arrowRight" />
    </NuxtLink>
  </section>
</template>

<style scoped>
.pc {
  --c: var(--plus);
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px 28px;
  overflow: hidden;
  border-radius: var(--r-lg);
  border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
  background: radial-gradient(70% 140% at 0% 0%, color-mix(in srgb, var(--c) 16%, transparent), transparent 60%),
    var(--panel);
  transition:
    border-color 0.3s,
    transform 0.3s var(--ease),
    box-shadow 0.3s;
}
.pc--pro {
  --c: var(--pro);
}
.pc:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--c) 70%, transparent);
  box-shadow: 0 18px 50px color-mix(in srgb, var(--c) 18%, transparent);
}
.pc__body {
  position: relative;
  display: grid;
  justify-items: start;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.pc__body h3 {
  font-size: 24px;
}
.pc__text {
  max-width: 60ch;
  color: var(--text);
}
.pc__go {
  position: relative;
  flex: none;
}
.pc__go svg {
  width: 16px;
  height: 16px;
  transition: transform 0.3s var(--ease);
}
.pc:hover .pc__go svg {
  transform: translateX(4px);
}
.pc__spark i {
  position: absolute;
  top: calc(12% + var(--n) * 12%);
  right: calc(10% + var(--n) * 7%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--c);
  opacity: 0;
  box-shadow: 0 0 10px var(--c);
  animation: float 4s ease-in-out infinite;
  animation-delay: calc(var(--n) * -0.7s);
}
@keyframes float {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.6);
  }
  40% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translateY(-24px) scale(1);
  }
}
@media (max-width: 700px) {
  .pc {
    flex-direction: column;
    align-items: stretch;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pc__spark i {
    animation: none;
  }
}
</style>
