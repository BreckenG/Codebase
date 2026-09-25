<script setup>
const route = useRoute(), { me } = useMe(), { signIn, loginPending } = useDesktop();
const { unread } = useNotifications();
const { admin } = useAdmin();
const { data } = useApiFetch('/api/me/player', { key: 'launcher-player', default: () => ({ player: null }) });
const rank = computed(() => data.value?.player?.linked ? data.value.player.ranked?.tier?.name : '');
const busy = ref(false), error = ref('');
const groups = [
  [{ to: '/', label: 'Home', icon: 'grid' }, { to: '/play', label: 'Play', icon: 'swords' }, { to: '/replays', label: 'Replays', icon: 'play' }, { to: '/history', label: 'History', icon: 'clock' }],
  [{ to: '/notifications', label: 'Notifications', icon: 'bell' }],
  [{ to: '/subscribe', label: 'Membership', icon: 'crown' }, { to: '/launcher', label: 'Game settings', icon: 'settings' }, { to: '/settings', label: 'Account', icon: 'user' }],
];
const selected = to => to === '/' ? route.path === '/' || route.path === '/me' : route.path === to || route.path.startsWith(to + '/');
async function signOut() { busy.value = true; try { await apiFetch('/auth/logout', { method: 'POST' }); window.location.assign('/'); } catch { error.value = 'Could not sign out.'; busy.value = false; } }
</script>
<template>
<aside class="launcher-nav">
  <NuxtLink class="launcher-brand" to="/" aria-label="Ranked World home"><img src="/img/planet.png" alt="" /><span>Ranked World</span></NuxtLink>
  <nav aria-label="Launcher navigation">
    <div v-for="(group, g) in groups" :key="g" class="launcher-nav__group">
      <NuxtLink v-for="link in group" :key="link.to" :to="link.to" :class="{ selected: selected(link.to) }" :aria-current="selected(link.to) ? 'page' : undefined"><AppIcon :name="link.icon" /><span>{{ link.label }}</span><span v-if="link.to === '/notifications' && unread" class="launcher-nav__count">{{ unread > 99 ? '99+' : unread }}</span></NuxtLink>
      <NuxtLink v-if="g === 2 && admin" to="/admin" :class="{ selected: selected('/admin') }"><AppIcon name="shield" /><span>Admin</span></NuxtLink>
    </div>
  </nav>
  <div class="launcher-account">
    <template v-if="me.user">
      <div class="launcher-me">
        <NuxtLink to="/me" class="launcher-me__who"><PlayerAvatar :name="me.user.username" :src="me.user.avatar" :discord-id="me.user.id" :size="34" /><span><strong>{{ me.user.username }}</strong><small>{{ rank || 'Not connected' }}</small></span></NuxtLink>
        <button class="launcher-me__out" :disabled="busy" aria-label="Sign out" title="Sign out" @click="signOut"><AppIcon name="logOut" /></button>
      </div>
      <p v-if="error" role="alert" class="meta bad">{{ error }}</p>
    </template>
    <button v-else class="btn btn--brand launcher-signin" :disabled="loginPending" @click="signIn"><AppIcon name="discord" />Sign in</button>
    <div class="launcher-links"><a href="https://discord.gg/gorillatagcomp" target="_blank" rel="noopener"><AppIcon name="discord" />Discord</a><NuxtLink to="/legal/privacy">Privacy</NuxtLink></div>
  </div>
</aside>
</template>
<style src="~/assets/css/desktop.css"></style>
