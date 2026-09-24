<script setup>
import { CATEGORY_RANGES, DIVISIONS } from "@ranked-world/ranks";
import { rankBadge } from "~/utils/badges";

const brackets = CATEGORY_RANGES.map((r, i) => ({ name: r.category, start: i ? CATEGORY_RANGES[i - 1].maxIndex + 1 : 0, end: r.maxIndex }));
const selected = ref('LOW');
const active = computed(() => brackets.find(b => b.name === selected.value));
const divisions = computed(() => DIVISIONS.map((name, index) => ({ name, index, badge: rankBadge(name) })).filter(d => d.index >= active.value.start && d.index <= active.value.end));
useSeo({ title: 'Gorilla Tag ranking: Elo and divisions', description: 'How Ranked World scores a Gorilla Tag round: points per tag, how that becomes an Elo change, 15 divisions across four brackets, and which rounds count.' });
</script>
<template>
<main id="main" class="wrap section"><div class="world-page-title"><h1>Ranked system</h1><NuxtLink class="btn" to="/leaderboard">Leaderboard<AppIcon name="arrowRight" /></NuxtLink></div><div class="world-rank-guide"><section><div class="world-section-head"><h2>Divisions</h2><span class="meta">{{ DIVISIONS.length }} divisions / 4 brackets</span></div><nav class="world-bracket-tabs" aria-label="Rank brackets"><button v-for="bracket in brackets" :key="bracket.name" :aria-pressed="selected === bracket.name" @click="selected = bracket.name">{{ bracket.name }}<small>{{ num(bracket.start * 100) }}{{ bracket.name === 'TOP' ? '+' : ' to ' + num((bracket.end + 1) * 100 - 1) }} Elo</small></button></nav><ol class="world-division-list" :start="active.start + 1"><li v-for="division in divisions" :key="division.name"><span class="meta">{{ String(division.index + 1).padStart(2, '0') }}</span><img :src="division.badge" alt="" width="64" height="64" /><h3>{{ division.name }}</h3><span>{{ num(division.index * 100) }}{{ division.index === DIVISIONS.length - 1 ? '+' : ' to ' + num((division.index + 1) * 100 - 1) }}<small>Elo</small></span></li></ol></section><aside class="world-rank-notes">
<section><h2>Round points</h2><p>Each tag starts at 30 points. The tagged player's Elo adds or subtracts up to 6 points per tag. You also earn 1 point for every second you remain uninfected.</p></section>
<section><h2>Your Elo</h2><p>Your Elo change compares your points with the performance expected against your opponents. The size of the score gap also matters. Consecutive wins that clearly exceed expectations earn a capped streak bonus.</p></section>
<section><h2>Eligible rounds</h2><p>A ranked round needs at least 4 eligible players. You need a connected Gorilla Tag account, the correct ranked code for your bracket and no rank ban. Bots never count toward this minimum.</p><p>Eligible players with fewer than 30 total points still count toward the minimum, but their Elo does not change. This also applies to players who leave early.</p></section>
<section><h2>Leaving a round</h2><p>With at least 30 total points, leaving after 30 seconds of the round or while you are the only infected player applies a leaving penalty. Below 30 total points, your Elo change stays at 0, including when you leave early.</p></section>
<section><h2>Divisions and brackets</h2><p>Your current Elo, division and rank ring carry over without a reset. Every division spans 100 Elo, and your division determines which ranked codes you can join.</p><NuxtLink to="/play">View your codes<AppIcon name="arrowRight" /></NuxtLink></section>
<section><h2>Scrims</h2><p>Scrims use a separate rating based on the team result. Scrim results do not change your ranked Elo.</p></section>
</aside></div></main>
</template>
