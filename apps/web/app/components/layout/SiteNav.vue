<script setup>
const route = useRoute();
const { me } = useMe();
const { admin } = useAdmin();
const { unread } = useNotifications();
const { data } = useApiFetch('/api/me/player', {
  key: 'nav-player',
  lazy: true,
  immediate: Boolean(me.value.user),
  default: () => ({ player: null }),
});
const tier = computed(() => (data.value?.player?.linked ? data.value.player.ranked?.tier : null));
const LINKS = [
  { label: 'Play', href: '/play' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Matches', href: '/history' },
  { label: 'Ranked', href: '/ranked' },
  { label: 'Launcher', href: '/launcher' },
];
const TABS = [
  { label: 'Home', href: '/', icon: 'grid' },
  { label: 'Play', href: '/play', icon: 'play' },
  { label: 'Ladder', href: '/leaderboard', icon: 'trophy' },
  { label: 'Matches', href: '/history', icon: 'swords' },
  { label: 'You', href: '/settings', icon: 'user' },
];
const on = (href) => (href === '/' ? route.path === '/' : route.path === href || route.path.startsWith(`${href}/`));
const solid = ref(false);
const menu = ref(false);
const failure = ref('');
const leaving = ref(false);
const onScroll = () => {
  solid.value = window.scrollY > 24;
};
watch(
  () => route.fullPath,
  () => {
    menu.value = false;
  },
);
onMounted(() => {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));
async function signOut() {
  leaving.value = true;
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
    window.location.assign('/');
  } catch {
    failure.value = 'Could not sign out. Try again.';
    leaving.value = false;
  }
}
</script>

<template>
  <header class="nav" :class="{ solid: solid || menu }">
    <div class="wrap nav__in">
      <NuxtLink class="nav__brand" to="/" aria-label="Ranked World home">
        <img src="/img/planet.png" width="30" height="30" alt="" /><span>Ranked World</span>
      </NuxtLink>
      <nav class="nav__links" aria-label="Main">
        <NuxtLink v-for="l in LINKS" :key="l.href" :to="l.href" :class="{ on: on(l.href) }">{{ l.label }}</NuxtLink>
      </nav>
      <div class="nav__end">
        <ClientOnly>
          <NuxtLink v-if="admin" class="icon-btn" to="/special" aria-label="Special"
            ><AppIcon name="shield"
          /></NuxtLink>
        </ClientOnly>
        <NuxtLink v-if="me.plan?.plan !== 'pro'" class="nav__plan" to="/subscribe">
          <AppIcon name="crown" /><span>{{ me.plan?.plan === 'plus' ? 'Go Pro' : 'Membership' }}</span>
        </NuxtLink>
        <template v-if="me.user">
          <NuxtLink
            class="icon-btn nav__bell"
            to="/notifications"
            :aria-label="unread ? `Notifications, ${unread} unread` : 'Notifications'"
          >
            <AppIcon name="bell" /><span v-if="unread">{{ unread > 99 ? '99+' : unread }}</span>
          </NuxtLink>
          <div class="nav__me" @keydown.esc="menu = false">
            <button class="nav__who" :aria-expanded="String(menu)" aria-haspopup="menu" @click="menu = !menu">
              <PlayerAvatar :name="me.user.username" :src="me.user.avatar" :discord-id="me.user.id" :size="32" />
              <span>
                <strong>{{ me.user.username }}</strong>
                <small :class="tier ? `t-${tier.tier.toLowerCase()}` : ''">{{
                  tier ? `${tier.name} / ${num(tier.elo)}` : 'Not connected'
                }}</small>
              </span>
            </button>
            <div v-if="menu" class="nav__shade" @click="menu = false" />
            <div v-if="menu" class="nav__menu" role="menu">
              <NuxtLink to="/me" role="menuitem"><AppIcon name="user" />Your profile</NuxtLink>
              <NuxtLink to="/subscribe" role="menuitem"><AppIcon name="crown" />Membership</NuxtLink>
              <NuxtLink to="/settings" role="menuitem"><AppIcon name="settings" />Settings</NuxtLink>
              <a href="https://discord.gg/gorillatagcomp" role="menuitem"><AppIcon name="discord" />Discord server</a>
              <button role="menuitem" :disabled="leaving" @click="signOut"><AppIcon name="logOut" />Sign out</button>
              <p v-if="failure" role="alert" class="bad">{{ failure }}</p>
            </div>
          </div>
        </template>
        <template v-else>
          <a class="btn btn--brand btn--small" href="/sign-in"><AppIcon name="discord" />Sign in</a>
        </template>
      </div>
    </div>
  </header>
  <nav class="tabs" aria-label="Main">
    <NuxtLink
      v-for="t in TABS"
      :key="t.href"
      :to="t.href"
      :class="{ on: on(t.href) }"
      :aria-current="on(t.href) ? 'page' : undefined"
    >
      <AppIcon :name="t.icon" /><span>{{ t.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  inset: 0 0 auto;
  z-index: 60;
  height: var(--nav);
  border-bottom: 1px solid transparent;
  transition:
    background 0.3s,
    border-color 0.3s;
}
.nav.solid {
  background: rgba(11, 11, 13, 0.74);
  border-color: var(--line);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
}
.nav__in {
  display: flex;
  align-items: center;
  gap: 28px;
  height: 100%;
}
.nav__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.nav__brand img {
  object-fit: contain;
}
.nav__links {
  display: flex;
  gap: 4px;
}
.nav__links a {
  padding: 8px 12px;
  border-radius: var(--r-sm);
  color: var(--dim);
  font-size: 14px;
  font-weight: 600;
  transition:
    color 0.2s,
    background 0.2s;
}
.nav__links a:hover {
  color: var(--ink);
}
.nav__links a.on {
  color: var(--ink);
  background: var(--raise);
}
.nav__plan {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(238, 134, 42, 0.1);
  border: 1px solid rgba(238, 134, 42, 0.45);
  box-shadow: 0 0 24px rgba(238, 134, 42, 0.18);
  color: #ffd9b0;
  font-size: 13px;
  font-weight: 700;
  transition:
    box-shadow 0.3s,
    transform 0.3s var(--ease);
}
.nav__plan svg {
  width: 15px;
  height: 15px;
  color: var(--brand);
}
.nav__plan::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgba(255, 226, 190, 0.28) 50%, transparent 70%);
  transform: translateX(-120%);
  animation: sheen 4.5s var(--ease) infinite 1.5s;
}
.nav__plan:hover {
  transform: translateY(-1px);
  border-color: var(--brand);
  box-shadow: 0 0 32px rgba(238, 134, 42, 0.35);
}
@keyframes sheen {
  0%,
  70% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(120%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .nav__plan::after {
    animation: none;
  }
}
.nav__end {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.nav__bell {
  position: relative;
}
.nav__bell span {
  position: absolute;
  top: 4px;
  right: 3px;
  min-width: 17px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--brand);
  color: var(--brand-ink);
  font-size: 10px;
  font-weight: 700;
  line-height: 17px;
  text-align: center;
}
.nav__me {
  position: relative;
}
.nav__who {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 10px 0 6px;
  border: 0;
  border-radius: var(--r);
  background: none;
  color: var(--ink);
  text-align: left;
}
.nav__who:hover,
.nav__who[aria-expanded='true'] {
  background: var(--raise);
}
.nav__who strong {
  display: block;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}
.nav__who small {
  display: block;
  color: var(--tier, var(--dim));
  font-size: 11px;
  font-weight: 600;
}
.nav__shade {
  position: fixed;
  inset: 0;
  z-index: 1;
}
.nav__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 2;
  display: grid;
  min-width: 220px;
  padding: 6px;
  border-radius: var(--r);
  background: #141418;
  border: 1px solid var(--line-2);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
  animation: drop 0.18s var(--ease);
}
@keyframes drop {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}
.nav__menu a,
.nav__menu button {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--r-sm);
  background: none;
  color: var(--text);
  font-size: 14px;
  text-align: left;
}
.nav__menu a:hover,
.nav__menu button:hover {
  background: var(--raise);
  color: var(--ink);
}
.nav__menu svg {
  width: 16px;
  height: 16px;
  color: var(--dim);
}
.nav__menu button {
  color: var(--bad);
}
.nav__menu button svg {
  color: currentColor;
}
.nav__menu p {
  padding: 6px 12px;
  font-size: 13px;
}
.tabs {
  display: none;
}
@media (max-width: 1080px) {
  .nav__links a:nth-child(n + 5) {
    display: none;
  }
}
@media (max-width: 860px) {
  .nav .nav__links,
  .nav .nav__plan,
  .nav .nav__who span {
    display: none;
  }
  .nav__brand {
    font-size: 16px;
  }
  .nav__in {
    gap: 12px;
  }
  .tabs {
    position: fixed;
    inset: auto 0 0;
    z-index: 60;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    background: rgba(11, 11, 13, 0.86);
    border-top: 1px solid var(--line);
    backdrop-filter: blur(16px) saturate(140%);
    -webkit-backdrop-filter: blur(16px) saturate(140%);
  }
  .tabs a {
    display: grid;
    justify-items: center;
    gap: 3px;
    padding: 6px 0;
    color: var(--dim);
    font-size: 11px;
    font-weight: 600;
  }
  .tabs a svg {
    width: 20px;
    height: 20px;
  }
  .tabs a.on {
    color: var(--brand);
  }
}
</style>
