<script setup>
const route = useRoute();
const { me } = useMe();
const { admin } = useAdmin();
const { unread } = useNotifications();
const { data } = useApiFetch('/api/me/player', { key: 'nav-player', lazy: true, immediate: Boolean(me.value.user), default: () => ({ player: null }) });
const tier = computed(() => data.value?.player?.linked ? data.value.player.ranked?.tier : null);
const active = computed(() => primaryDestination(route.path));
const links = [{ key: 'play', label: 'Play', href: '/play' }, { key: 'leaderboard', label: 'Leaderboard', href: '/leaderboard' }, { key: 'history', label: 'Matches', href: '/history' }, { key: 'replays', label: 'Replays', href: '/replays' }, { key: 'ranked', label: 'How ranked works', href: '/ranked' }, { key: 'launcher', label: 'Launcher', href: '/launcher' }];
const mobile = [{ key: 'home', label: 'Overview', href: '/', icon: 'grid' }, { key: 'play', label: 'Play', href: '/play', icon: 'play' }, { key: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: 'trophy' }, { key: 'you', label: 'You', href: '/settings', icon: 'user' }];
const on = item => active.value === item.key || route.path === item.href;
const open = ref(false);
const signingOut = ref(false);
const failure = ref('');
watch(() => route.fullPath, () => { open.value = false; });
async function signOut() { signingOut.value = true; try { await apiFetch('/auth/logout', { method: 'POST' }); window.location.assign('/'); } catch { failure.value = 'Could not sign out. Try again.'; signingOut.value = false; } }
</script>
<template>
<header class="site-bar">
  <div class="site-bar__in">
    <NuxtLink class="site-brand" to="/" aria-label="Ranked World home"><img src="/img/planet.png" width="34" height="28" alt="" /><span>Ranked World</span></NuxtLink>
    <nav aria-label="Main navigation" class="site-links">
      <NuxtLink v-for="item in links" :key="item.key" :to="item.href" :aria-current="on(item) ? 'page' : undefined" :class="{ selected: on(item) }">{{ item.label }}</NuxtLink>
      <NuxtLink v-if="admin" to="/admin" class="site-links__admin" :aria-current="route.path === '/admin' ? 'page' : undefined" :class="{ selected: route.path === '/admin' }"><AppIcon name="shield" />Admin</NuxtLink>
    </nav>
    <div class="site-side">
      <NuxtLink class="site-plan" to="/subscribe"><AppIcon name="crown" />Membership</NuxtLink>
      <template v-if="me.user">
        <NuxtLink to="/notifications" class="site-bell" :class="{ selected: route.path === '/notifications' }" :aria-label="unread ? `Notifications, ${unread} unread` : 'Notifications'"><AppIcon name="bell" /><span v-if="unread">{{ unread > 99 ? '99+' : unread }}</span></NuxtLink>
        <div class="site-me" @keydown.esc="open = false">
          <button class="site-me__btn" :aria-expanded="open" aria-haspopup="menu" @click="open = !open"><PlayerAvatar :name="me.user.username" :src="me.user.avatar" :discord-id="me.user.id" :size="32" /><span><strong>{{ me.user.username }}</strong><small :style="tier ? { color: `var(--tier-${tier.tier.toLowerCase()})` } : null">{{ tier ? `${tier.name} / ${tier.elo} MMR` : 'Not connected' }}</small></span><AppIcon name="chevron" /></button>
          <div v-if="open" class="site-me__shade" @click="open = false" />
          <div v-if="open" class="site-menu" role="menu">
            <NuxtLink to="/me" role="menuitem"><AppIcon name="user" />Your profile</NuxtLink>
            <NuxtLink to="/settings" role="menuitem"><AppIcon name="settings" />Settings</NuxtLink>
            <a href="https://discord.gg/gorillatagcomp" role="menuitem"><AppIcon name="discord" />Discord server</a>
            <button role="menuitem" :disabled="signingOut" @click="signOut"><AppIcon name="logOut" />Sign out</button>
            <p v-if="failure" role="alert" class="meta bad">{{ failure }}</p>
          </div>
        </div>
      </template>
      <a v-else class="btn btn--brand" href="/sign-in"><AppIcon name="discord" />Sign in with Discord</a>
    </div>
  </div>
</header>
<header class="world-mobile-head"><NuxtLink to="/" class="world-brand"><img src="/img/planet.png" width="25" height="25" alt="" />Ranked World</NuxtLink><NuxtLink v-if="admin" to="/admin" class="icon-btn" aria-label="Admin"><AppIcon name="shield" /></NuxtLink><NuxtLink to="/notifications" class="icon-btn mobile-notifications" :aria-label="unread ? `Notifications, ${unread} unread` : 'Notifications'"><AppIcon name="bell" /><span v-if="unread" class="notification-dot" /></NuxtLink><NuxtLink to="/settings" class="icon-btn" aria-label="Account settings"><AppIcon name="user" /></NuxtLink></header>
<nav class="world-mobile-nav" aria-label="Mobile navigation"><NuxtLink v-for="item in mobile" :key="item.key" :to="item.href" :class="{ selected: active === item.key }" :aria-current="active === item.key ? 'page' : undefined"><AppIcon :name="item.icon" /><span>{{ item.label }}</span></NuxtLink></nav>
</template>
<style scoped>
.mobile-notifications{margin-left:auto;position:relative}.notification-dot{position:absolute;top:5px;right:5px;width:6px;height:6px;border-radius:50%;background:var(--color-brand)}
</style>
