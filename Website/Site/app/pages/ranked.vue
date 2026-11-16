<script setup>
useSeo({
  title: 'Gorilla Tag ranking: MMR and divisions',
  description:
    'How Ranked World scores a Gorilla Tag round: points per tag, how that becomes an MMR change, 15 divisions across four brackets, and which rounds count.',
});
</script>

<template>
  <main id="main">
    <div class="wrap rk__head">
      <header class="page-head">
        <h1 class="reveal-up">Ranked system</h1>
        <NuxtLink class="btn" to="/leaderboard"><AppIcon name="trophy" />Leaderboard</NuxtLink>
      </header>
    </div>
    <TierHall />
  </main>
</template>

<style scoped>
main .rk__head {
  padding-top: calc(var(--nav) + 56px);
}
.rk__head .page-head {
  margin-bottom: 0;
}
@media (max-width: 860px) {
  main .rk__head {
    padding-top: calc(var(--nav) + 32px);
  }
}
</style>
