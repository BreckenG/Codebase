<script setup>
const PAGES = [
  { to: '/legal/terms', label: 'Terms' },
  { to: '/legal/privacy', label: 'Privacy' },
  { to: '/legal/refunds', label: 'Refunds' },
  { to: '/legal/cookies', label: 'Cookies' },
  { to: '/legal/business', label: 'Contact' },
];
</script>

<template>
  <nav class="seg legal-nav" aria-label="Legal pages">
    <NuxtLink v-for="p in PAGES" :key="p.to" :to="p.to">{{ p.label }}</NuxtLink>
  </nav>
</template>
