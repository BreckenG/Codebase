<script setup>
const PAGES = [{ to: "/legal/terms", label: "Terms" }, { to: "/legal/privacy", label: "Privacy" }, { to: "/legal/refunds", label: "Refunds" }, { to: "/legal/cookies", label: "Cookies" }, { to: "/legal/business", label: "Contact" }];
const route = useRoute();
</script>
<template>
<div class="subtabs"><div class="subtabs__in"><NuxtLink v-for="p in PAGES" :key="p.to" class="tab" :class="{ 'is-selected': route.path === p.to }" :to="p.to" >
        {{ p.label }}
      </NuxtLink></div></div>
</template>
