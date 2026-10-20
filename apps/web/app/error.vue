<script setup>
const props = defineProps({ error: { type: Object, default: null } });
const code = computed(() => Number(props.error?.statusCode) || 500);
const digits = computed(() => String(code.value).split(''));
const TITLES = {
  400: 'Invalid request',
  401: 'Sign in required',
  403: 'Access denied',
  404: 'Page not found',
  408: 'Request timed out',
  410: 'Page no longer available',
  429: 'Too many requests',
  500: 'Something went wrong',
  502: 'Server unavailable',
  503: 'Service unavailable',
  504: 'Request timed out',
};
const title = computed(() => TITLES[code.value] || 'Could not open this page');

function back() {
  const previous = window.history.state?.back;
  const safe = typeof previous === 'string' && previous.startsWith('/') && !previous.startsWith('//');
  return clearError({ redirect: safe ? previous : '/' });
}

useHead(() => ({ title: `${title.value} | Ranked World` }));
</script>

<template>
  <div class="site">
    <main id="main" class="er">
      <ClientOnly><GorillaFigure class="er__fig" pose="shrug" :color="[0.93, 0.45, 0.1]" /></ClientOnly>
      <div class="er__code" role="img" :aria-label="`Error ${code}`">
        <span v-for="(digit, i) in digits" :key="i" :style="{ '--i': i }" aria-hidden="true">
          <img v-if="digit === '0'" src="/img/planet-grey.png" alt="" />
          <template v-else>{{ digit }}</template>
        </span>
      </div>
      <h1>{{ title }}</h1>
      <div class="go-row">
        <button class="btn btn--brand" @click="back"><AppIcon name="arrowLeft" />Back</button>
        <a class="btn btn--ghost" href="/">Home</a>
      </div>
    </main>
  </div>
</template>

<style src="~/assets/css/site.css"></style>
<style scoped>
.er {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 18px;
  min-height: 100vh;
  padding: 40px 16px;
  text-align: center;
}
.er__fig {
  width: min(420px, 90vw);
  height: 340px;
  margin-bottom: -40px;
}
.er__code {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: clamp(88px, 16vw, 160px);
  font-weight: 800;
  line-height: 1;
}
.er__code span {
  display: grid;
  place-items: center;
  animation: up 0.8s var(--ease) both;
  animation-delay: calc(var(--i) * 90ms);
}
.er__code img {
  width: 1.3em;
  height: 0.8em;
  margin: 0 0.04em;
  object-fit: contain;
}
.er h1 {
  font-size: clamp(28px, 4vw, 44px);
}
</style>
