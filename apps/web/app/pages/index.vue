<script setup>
const { me } = useMe();
useSeo({
  title: 'Ranked World - Competitive Gorilla Tag Ranked Codes and MMR',
  brandTitle: true,
  description:
    'Ranked World is a competitive Gorilla Tag platform. Join ranked codes for your bracket, climb the MMR leaderboard and run scrims. Practice bots are coming soon.',
});
</script>

<template>
  <HomeOverview v-if="me.user" />
  <HomeLanding v-else />
</template>
