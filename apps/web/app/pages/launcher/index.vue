<script setup>
import launcher from '../../../../desktop/package.json';

const { enabled: desktop } = useDesktop();
const DOES = [
  { icon: 'play', title: 'Joins your code', body: 'Join with 1 click.' },
  { icon: 'trophy', title: 'In-game notifications', body: 'MMR and placement notifications.' },
  { icon: 'clock', title: 'Session review', body: 'Rounds, wins and MMR when you close the game.' },
  { icon: 'users', title: 'Friends and scrims', body: 'See who is on. Queue from the home screen.' },
];
const shot = ref(null);

function tilt(e) {
  const r = shot.value.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  shot.value.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
  shot.value.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
}

function untilt() {
  shot.value.style.setProperty('--rx', '4deg');
  shot.value.style.setProperty('--ry', '-6deg');
}

useSeo({
  title: 'Windows launcher',
  description:
    'Download the Ranked World launcher for Windows. See your rank and recent rounds, join Gorilla Tag ranked codes from your PC, and manage your account.',
});
</script>

<template>
  <DesktopSettings v-if="desktop" />
  <main v-else id="main" class="page">
    <div class="wrap">
      <section class="ln__hero">
        <div class="ln__copy">
          <h1 class="reveal-up">The launcher</h1>
          <p class="lead reveal-up" style="--i: 1">Easily hop in any match with a click of a button.</p>
          <div class="reveal-up" style="--i: 2">
            <a
              class="btn btn--brand btn--large"
              :href="`/downloads/launcher/${launcher.version}/RankedWorld-Setup.exe`"
              download
            >
              <AppIcon name="download" />Download for Windows
            </a>
          </div>
          <p class="meta reveal-up" style="--i: 3">
            Version {{ launcher.version }}. Windows 10 or later, 64 bit. Steam version of Gorilla Tag.
          </p>
        </div>
        <div class="ln__stage" @pointermove="tilt" @pointerleave="untilt">
          <img
            ref="shot"
            class="ln__shot"
            src="/img/launcher-home.jpg?v=2"
            alt="The launcher home screen with sample data"
            width="1280"
            height="820"
          />
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>What it does</h2></div>
        <div class="ln__grid">
          <article v-for="d in DOES" :key="d.title" v-reveal class="panel ln__item">
            <AppIcon :name="d.icon" />
            <h3>{{ d.title }}</h3>
            <p>{{ d.body }}</p>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.ln__hero {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 48px;
  align-items: center;
  min-height: calc(100vh - var(--nav) - 160px);
}
.ln__copy {
  display: grid;
  justify-items: start;
  gap: 22px;
}
.ln__copy .lead {
  max-width: 24ch;
  color: var(--text);
  font-size: 22px;
}
.ln__stage {
  perspective: 1400px;
}
.ln__shot {
  --rx: 4deg;
  --ry: -6deg;
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--r-lg);
  border: 1px solid var(--line-2);
  box-shadow:
    0 40px 80px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(238, 134, 42, 0.08),
    0 0 120px rgba(238, 134, 42, 0.12);
  transform: rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform 0.6s var(--ease);
  animation: rise 1s var(--ease) both;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(40px) rotateX(18deg) rotateY(-6deg);
  }
}
.ln__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.ln__item {
  display: grid;
  align-content: start;
  gap: 10px;
}
.ln__item svg {
  width: 26px;
  height: 26px;
  color: var(--brand);
}
.ln__item h3 {
  font-size: 22px;
}
@media (max-width: 960px) {
  .ln__hero {
    grid-template-columns: 1fr;
    min-height: 0;
  }
  .ln__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (prefers-reduced-motion: reduce) {
  .ln__shot {
    animation: none;
    transition: none;
  }
}
</style>
