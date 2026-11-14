<script setup>
const { me } = useMe();
useSeo({
  title: 'Ranked World - Competitive Gorilla Tag Ranked Codes and MMR',
  brandTitle: true,
  description:
    'Ranked World is a competitive Gorilla Tag platform. Join ranked codes for your skill bracket, climb the MMR leaderboard, run scrims and watch your matches back in 3D.',
});
</script>

<template>
  <HomeOverview v-if="me.user" />
  <HomeLanding v-else />
</template>
