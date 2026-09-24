<script setup>
const INVITE = "https://discord.gg/gorillatagcomp";
</script>
<template>
<footer class="sitefoot"><div class="wrap sitefoot__grid"><div><NuxtLink class="brand" to="/"><img class="brand-mark" src="/img/planet.png" alt="" width="26" height="26" /> Ranked World
        </NuxtLink><p class="meta sitefoot__blurb">
          Ranked lobbies, scrims, and practice bots for Gorilla Tag. Run by players, out of a Discord
          server.
        </p><div class="socials"><a :href="INVITE" aria-label="Discord"><AppIcon name="discord" /></a></div></div><div><h4>Play</h4><ul><li><NuxtLink to="/leaderboard">Players</NuxtLink></li><li><NuxtLink to="/play">Ranked codes</NuxtLink></li><li><NuxtLink to="/subscribe">Ranked World+</NuxtLink></li></ul></div><div><h4>Help</h4><ul><li><NuxtLink to="/ranked">How ranking works</NuxtLink></li><li><NuxtLink to="/me">Your profile</NuxtLink></li><li><a :href="INVITE">Support</a></li><li><a :href="INVITE">Report a player</a></li><li><a :href="INVITE">Appeal a ban</a></li></ul></div><div><h4>Legal</h4><ul><li><NuxtLink to="/legal/terms">Terms of use</NuxtLink></li><li><NuxtLink to="/legal/privacy">Privacy policy</NuxtLink></li><li><NuxtLink to="/legal/refunds">Refunds and billing</NuxtLink></li><li><a :href="INVITE">Rules</a></li></ul></div></div><div class="wrap legal-line"><span>&copy; 2026 Ranked World</span><span>Not made by Another Axiom, and not an official Gorilla Tag service.</span></div></footer>
</template>
<style src="~/assets/css/footer.css">
</style>
