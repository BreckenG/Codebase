<script setup>
const route = useRoute(), { me } = useMe(), { signIn, loginPending } = useDesktop();
const {unread}=useNotifications();
const { admin } = useAdmin();
const busy = ref(false), error = ref('');
const links = [{ to: '/', label: 'My stats', icon: 'grid' }, { to: '/play', label: 'Play', icon: 'play' }, { to: '/history', label: 'History', icon: 'clock' }, { to: '/notifications', label: 'Notifications', icon: 'bell' }, { to: '/replays', label: 'Replays', icon: 'play' }, { to: '/settings', label: 'Manage account', icon: 'user' }, { to: '/subscribe', label: 'Subscription', icon: 'creditCard' }, { to: '/launcher', label: 'Game settings', icon: 'settings' }];
const selected = to => to === '/' ? route.path === '/' || route.path === '/me' : route.path === to;
async function signOut() { busy.value = true; try { await apiFetch('/auth/logout', { method: 'POST' }); window.location.assign('/'); } catch { error.value = 'Could not sign out. Try again.'; busy.value = false; } }
</script>
<template>
<aside class="launcher-nav"><NuxtLink class="launcher-brand" to="/" aria-label="Ranked World home"><img src="/img/planet.png" alt="" /><span>Ranked World<small>Launcher</small></span></NuxtLink><nav aria-label="Launcher navigation"><NuxtLink v-for="link in links" :key="link.to" :to="link.to" :class="{ selected: selected(link.to) }" :aria-current="selected(link.to) ? 'page' : undefined"><AppIcon :name="link.icon" />{{ link.label }}<span v-if="link.to==='/notifications' && unread" class="notification-count">{{ unread>99 ? '99+' : unread }}</span></NuxtLink><NuxtLink v-if="admin" to="/admin" :class="{selected: selected('/admin')}"><AppIcon name="shield" />Admin</NuxtLink></nav><div class="launcher-account"><template v-if="me.user"><NuxtLink to="/settings" class="launcher-profile"><PlayerAvatar :name="me.user.username" :src="me.user.avatar" :discord-id="me.user.id" :size="32" /><span>{{ me.user.username }}<small>Account settings</small></span></NuxtLink><button class="launcher-signout" :disabled="busy" @click="signOut"><AppIcon name="logOut" />Sign out</button><p v-if="error" role="alert" class="meta bad">{{ error }}</p></template><button v-else class="btn btn--brand" :disabled="loginPending" @click="signIn"><AppIcon name="user" />Sign in</button><NuxtLink class="launcher-privacy" to="/legal/privacy">Privacy and data</NuxtLink></div></aside>
</template>
<style src="~/assets/css/desktop.css"></style>

<style scoped>
.notification-count{margin-left:auto;padding:2px 5px;border-radius:5px;background:var(--color-brand);color:var(--color-brand-inverted);font-size:11px;line-height:1.2}
</style>
