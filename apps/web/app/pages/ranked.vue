<script setup>
const BADGES = ['bronze_1', 'silver_1', 'gold_1', 'platinum_1', 'ruby_1', 'sapphire'];
const video = ref(null);
const started = ref(false);

function play() {
  started.value = true;
  video.value.play();
}

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
    <div class="wrap">
      <section class="section">
        <div class="section-head"><h2>How the Ranked system works</h2></div>
        <div class="rk__player">
          <video
            ref="video"
            class="rk__video"
            src="/video/ranked-system.mp4"
            :controls="started"
            playsinline
            preload="metadata"
          />
          <button v-if="!started" class="rk__cover" aria-label="Play the ranked system video" @click="play">
            <span class="rk__badges" aria-hidden="true">
              <img
                v-for="(b, i) in BADGES"
                :key="b"
                :src="`/img/badges/${b}.png`"
                alt=""
                width="72"
                height="72"
                :style="{ '--i': i }"
              />
            </span>
            <span class="rk__play"><AppIcon name="play" /></span>
            <span class="rk__meta">Watch the breakdown <b>2:24</b></span>
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
main .rk__head {
  padding-top: calc(var(--nav) + 56px);
}
.rk__head .page-head {
  margin-bottom: 0;
}
.rk__player {
  position: relative;
  overflow: hidden;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: #000;
}
.rk__video {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
}
.rk__cover {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 28px;
  border: 0;
  background: radial-gradient(60% 70% at 50% 45%, rgba(238, 134, 42, 0.22), transparent 70%),
    radial-gradient(120% 90% at 50% 120%, rgba(111, 155, 255, 0.12), transparent 60%), #0b0b0d;
  color: var(--ink);
}
.rk__badges {
  display: flex;
  gap: clamp(8px, 2vw, 24px);
}
.rk__badges img {
  width: clamp(36px, 6vw, 72px);
  height: auto;
  image-rendering: pixelated;
  animation: bob 3s ease-in-out infinite;
  animation-delay: calc(var(--i) * -0.5s);
}
@keyframes bob {
  50% {
    transform: translateY(-8px);
  }
}
.rk__play {
  display: grid;
  place-items: center;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: var(--brand);
  color: var(--brand-ink);
  box-shadow:
    0 0 0 10px rgba(238, 134, 42, 0.16),
    0 20px 50px rgba(238, 134, 42, 0.35);
  transition: transform 0.3s var(--ease);
}
.rk__play svg {
  width: 36px;
  height: 36px;
  margin-left: 6px;
}
.rk__cover:hover .rk__play {
  transform: scale(1.08);
}
.rk__meta {
  color: var(--text);
  font-size: 15px;
}
.rk__meta b {
  margin-left: 6px;
  color: var(--ink);
}
@media (prefers-reduced-motion: reduce) {
  .rk__badges img {
    animation: none;
  }
}
@media (max-width: 860px) {
  main .rk__head {
    padding-top: calc(var(--nav) + 32px);
  }
}
</style>
