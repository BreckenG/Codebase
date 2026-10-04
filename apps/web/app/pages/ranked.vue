<script setup>
import { CATEGORY_RANGES, DIVISIONS } from "@ranked-world/ranks";
import { rankBadge } from "~/utils/badges";

const brackets = CATEGORY_RANGES.map((r, i) => ({ name: r.category, start: i ? CATEGORY_RANGES[i - 1].maxIndex + 1 : 0, end: r.maxIndex }));
const selected = ref('LOW');
const active = computed(() => brackets.find(b => b.name === selected.value));
const divisions = computed(() => DIVISIONS.map((name, index) => ({ name, index, badge: rankBadge(name) })).filter(d => d.index >= active.value.start && d.index <= active.value.end));
useSeo({ title: 'Gorilla Tag ranking: MMR and divisions', description: 'How Ranked World scores a Gorilla Tag round: points per tag, how that becomes an MMR change, 15 divisions across four brackets, and which rounds count.' });
</script>
<template>
<main id="main" class="wrap section"><div class="world-page-title"><h1>Ranked system</h1><NuxtLink class="btn" to="/leaderboard">Leaderboard<AppIcon name="arrowRight" /></NuxtLink></div><div class="world-rank-guide"><section><div class="world-section-head"><h2>Divisions</h2><span class="meta">{{ DIVISIONS.length }} divisions / 4 brackets</span></div><nav class="world-bracket-tabs" aria-label="Rank brackets"><button v-for="bracket in brackets" :key="bracket.name" :aria-pressed="selected === bracket.name" @click="selected = bracket.name">{{ bracket.name }}<small>{{ num(bracket.start * 100) }}{{ bracket.name === 'TOP' ? '+' : ' to ' + num((bracket.end + 1) * 100 - 1) }} MMR</small></button></nav><ol class="world-division-list" :start="active.start + 1"><li v-for="division in divisions" :key="division.name"><span class="meta">{{ String(division.index + 1).padStart(2, '0') }}</span><img :src="division.badge" alt="" width="64" height="64" /><h3>{{ division.name }}</h3><span>{{ num(division.index * 100) }}{{ division.index === DIVISIONS.length - 1 ? '+' : ' to ' + num((division.index + 1) * 100 - 1) }}<small>MMR</small></span></li></ol></section><aside class="world-rank-notes">
<section><h2>Round points</h2><p>Each tag starts at 30 points. The tagged player's MMR adds or subtracts up to 6 points per tag. You also earn 1 point for every second you remain uninfected.</p></section>
<section><h2>Your MMR</h2><p>Your MMR comes straight from an OpenSkill rating. After each round, players are ordered by points, and your rating moves based on where you finished compared with what was expected of you in that lobby. Beating stronger players moves you more.</p><p>New players move quickly. As the system becomes sure of your level, changes get smaller. Consecutive rounds above expectations earn a capped streak bonus.</p></section>
<section><h2>Eligible rounds</h2><p>A ranked round needs at least 3 eligible players. You need a connected Gorilla Tag account, the correct ranked code for your bracket and no rank ban. Bots never count toward this minimum.</p><p>Eligible players with fewer than 30 total points still count toward the minimum, but their MMR does not change. This also applies to players who leave early.</p></section>
<section><h2>Leaving a round</h2><p>With at least 30 total points, leaving after 30 seconds of the round or while you are the only infected player applies a leaving penalty. Below 30 total points, your MMR change stays at 0, including when you leave early.</p></section>
<section><h2>Divisions and brackets</h2><p>Your current MMR, division and rank ring carry over without a reset. Every division spans 100 MMR, and your division determines which ranked codes you can join.</p><NuxtLink to="/play">View your codes<AppIcon name="arrowRight" /></NuxtLink></section>
<section><h2>Scrims</h2><p>Scrims use a separate rating based on the team result. Scrim results do not change your ranked MMR.</p></section>
</aside></div><AdSlot place="ranked" /></main>
</template>
