<script setup>
import launcher from "../../../../desktop/package.json";
const { enabled: desktop } = useDesktop();
useSeo({ title: 'Windows launcher', description: 'Download the Ranked World launcher for Windows. See your rank and recent rounds, join Gorilla Tag ranked codes from your PC, and manage your account.' });
</script>
<template>
<DesktopSettings v-if="desktop" /><main v-else id="main" class="wrap section"><section class="lpage-hero"><div><h1>The launcher</h1><p class="lpage-lead">Press Play and you land in your ranked room.</p><a class="btn btn--brand btn--large" :href="`/downloads/launcher/${launcher.version}/RankedWorld-Setup.exe`" download>Download for Windows</a><p class="meta">Version {{ launcher.version }}. Windows 10 or later, 64 bit. Steam version of Gorilla Tag.</p></div><img src="/img/launcher-home.jpg" alt="The launcher home screen with sample data" width="1280" height="820" /></section><section class="lpage-rows"><h2>What it does</h2><dl><div><dt>Joins your code</dt><dd>One click. No typing at the computer.</dd></div><div><dt>Results inside VR</dt><dd>MMR change and placement pop up after every round.</dd></div><div><dt>Last session</dt><dd>Rounds, wins and MMR when you close the game.</dd></div><div><dt>Friends and scrims</dt><dd>See who is on. Queue from the home screen.</dd></div><div><dt>Updates itself</dt><dd>Signed releases.</dd></div></dl></section><section class="lpage-rows"><h2>What you need</h2><dl><div><dt>Steam and BepInEx</dt><dd>Steam Gorilla Tag with BepInEx. The launcher asks before it installs its helper (JoinHelper.dll).</dd></div><div><dt>On Quest</dt><dd>Not supported. Enter codes in game.</dd></div></dl></section></main>
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
