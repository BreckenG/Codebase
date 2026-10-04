<script setup>
import launcher from "../../../../desktop/package.json";
const { enabled: desktop } = useDesktop();
useSeo({ title: 'Windows launcher', description: 'Download the Ranked World launcher for Windows. See your rank and recent rounds, join Gorilla Tag ranked codes from your PC, and manage your account.' });
</script>
<template>
<DesktopSettings v-if="desktop" /><main v-else id="main" class="wrap section"><section class="lpage-hero"><div><h1>The launcher</h1><p class="lpage-lead">Press Play and it opens Gorilla Tag in your ranked room. Round results, rank ups and scrim calls show up inside VR.</p><a class="btn btn--brand btn--large" :href="`/downloads/launcher/${launcher.version}/RankedWorld-Setup.exe`" download>Download for Windows</a><p class="meta">Version {{ launcher.version }}. Windows 10 or later, 64 bit. Steam version of Gorilla Tag.</p></div><img src="/img/launcher-home.jpg" alt="The launcher home screen with sample data: rank, last session, live codes, scrim queue and friends" width="1280" height="900" /></section><section class="lpage-rows"><h2>What it does</h2><dl><div><dt>Joins your code</dt><dd>Pick a live code and the launcher starts Gorilla Tag through Steam and puts you in that room. No typing at the computer.</dd></div><div><dt>Results inside VR</dt><dd>When a round is scored you see your MMR change, where you finished and how far the next division is, without taking the headset off.</dd></div><div><dt>Last session</dt><dd>Close the game and you get the recap: rounds, wins, best finish and total MMR for that sitting.</dd></div><div><dt>Friends and scrims</dt><dd>See which friends are in a room right now, and queue for a scrim from the home screen.</dd></div><div><dt>Updates itself</dt><dd>Every release is signed. The launcher checks the signature before it installs anything.</dd></div></dl></section><section class="lpage-rows"><h2>What you need</h2><dl><div><dt>Steam and BepInEx</dt><dd>You need the Steam version of Gorilla Tag and BepInEx. The launcher asks before installing the Ranked helper (JoinHelper.dll) into BepInEx/plugins/RankedDeps. Close the game for installation.</dd></div><div><dt>On Quest</dt><dd>Standalone Quest players enter codes inside Gorilla Tag the normal way. Everything else on the site works the same.</dd></div></dl></section></main>
</template>
<style scoped>
.lpage-hero{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:40px;align-items:center;margin-bottom:64px}
.lpage-hero h1{font-size:clamp(2.4rem,5vw,3.6rem);line-height:1}
.lpage-lead{margin:var(--gap-16) 0 var(--gap-24);max-width:44ch;font-size:var(--text-18)}
.lpage-hero .meta{margin-top:var(--gap-12)}
.lpage-hero img{width:100%;height:auto;border:1px solid var(--surface-4);border-radius:var(--radius-lg)}
.lpage-rows{margin-bottom:64px}
.lpage-rows dl{margin:var(--gap-16) 0 0}
.lpage-rows dl>div{display:grid;grid-template-columns:200px minmax(0,1fr);gap:var(--gap-24);padding:var(--gap-16) 0;border-top:1px solid var(--surface-4)}
.lpage-rows dt{color:var(--color-text-primary);font-weight:700}
.lpage-rows dd{margin:0;max-width:64ch}
@media (max-width:900px){.lpage-hero{grid-template-columns:1fr}.lpage-rows dl>div{grid-template-columns:1fr;gap:var(--gap-4)}}
</style>
