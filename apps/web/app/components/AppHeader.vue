<script setup>
const { me } = useMe();
const route = useRoute();
const discoverOpen = ref(false);
const accountOpen = ref(false);
const menuOpen = ref(false);
const here = computed(() => route.path.replace(/\/$/, "") || "/");
const inDiscover = computed(() => DISCOVER.some(d => here.value === d.href || here.value.startsWith(d.href + "/")) || here.value.startsWith("/player"));
const on = path => here.value === path || here.value.startsWith(path + "/");
const plan = computed(() => me.value.plan?.plan || "free");
const planLabel = computed(() => plan.value === "free" ? "Free plan" : "Ranked World " + plan.value[0].toUpperCase() + plan.value.slice(1));
const stuck = ref(false);
let queued = false;
function onScroll() { if (queued) return; queued = true; requestAnimationFrame(() => { stuck.value = window.scrollY > 6; queued = false; }); }
function closeAll() { discoverOpen.value = false; accountOpen.value = false; menuOpen.value = false; }
function onKey(e) { if (e.key !== "Escape") return; const panel = document.activeElement?.closest("#browse-links, #account-links, #mobilenav"); if (panel) document.querySelector(`[aria-controls="${panel.id}"]`)?.focus(); closeAll(); }
watch(() => route.fullPath, closeAll);
async function signOut() { await apiFetch("/auth/logout", { method: "POST" }); window.location.reload(); }
onMounted(() => { onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); document.addEventListener("click", closeAll); document.addEventListener("keydown", onKey); });
onBeforeUnmount(() => { window.removeEventListener("scroll", onScroll); document.removeEventListener("click", closeAll); document.removeEventListener("keydown", onKey); });
</script>
<template>
<header class="header" :data-stuck="stuck ? '' : undefined"><div class="wrap header-in"><NuxtLink class="brand" to="/"><img class="brand-mark" src="/img/planet.png" alt="" width="26" height="26" />
        Ranked World
      </NuxtLink><nav class="nav"><div class="anchor"><button class="nav-item" :class="{ 'is-selected': inDiscover }" aria-controls="browse-links" :aria-expanded="String(discoverOpen)" @click.stop="discoverOpen = !discoverOpen; accountOpen = false" ><AppIcon name="compass" />Browse<AppIcon name="chevron" /></button><div id="browse-links" class="popover" :data-closed="discoverOpen ? undefined : ''"><NuxtLink v-for="d in DISCOVER" :key="d.key" class="nav-item" :to="d.href"><AppIcon :name="d.icon" />{{ d.label }}
            </NuxtLink></div></div><NuxtLink class="nav-item" :class="{ 'is-selected': on('/subscribe') }" to="/subscribe" ><AppIcon name="sparkles" />Subscribe
        </NuxtLink><NuxtLink class="nav-item" :class="{ 'is-selected': on('/launcher') }" to="/launcher"><AppIcon name="download" />Launcher
        </NuxtLink></nav><span class="header-end"><button class="icon-btn menu-btn" aria-label="Menu" aria-controls="mobilenav" :aria-expanded="String(menuOpen)" @click.stop="menuOpen = !menuOpen; discoverOpen = false; accountOpen = false" ><AppIcon :name="menuOpen ? 'x' : 'menu'" /></button><a v-if="!me.user" class="btn btn--brand" href="/sign-in">Sign in</a><div v-else class="anchor"><button class="btn btn--ghost avatar-btn" aria-controls="account-links" :aria-expanded="String(accountOpen)" aria-label="Account menu" @click.stop="accountOpen = !accountOpen; discoverOpen = false" ><PlayerAvatar :name="me.user.username" :src="me.user.avatar" :discord-id="me.user.id" :size="26" /><AppIcon name="chevron" /></button><div id="account-links" class="popover popover--menu" :data-closed="accountOpen ? undefined : ''"><div class="popover__id"><div class="popover__name">{{ me.user.username }}</div><div class="meta">{{ planLabel }}</div></div><div class="popover__sep" /><NuxtLink class="nav-item" to="/me"><AppIcon name="user" />Profile</NuxtLink><NuxtLink class="nav-item" to="/history"><AppIcon name="swords" />Match history</NuxtLink><NuxtLink class="nav-item" to="/leaderboard?sort=friends"><AppIcon name="users" />Friends</NuxtLink><NuxtLink class="nav-item" to="/notifications"><AppIcon name="bell" />Notifications</NuxtLink><div class="popover__sep" /><NuxtLink class="nav-item nav-item--accent" to="/subscribe"><AppIcon :name="plan === 'free' ? 'sparkles' : 'crown'" />
              {{ plan === "free" ? "Get Plus" : "Manage subscription" }}
            </NuxtLink><NuxtLink class="nav-item" to="/settings"><AppIcon name="settings" />Settings</NuxtLink><div class="popover__sep" /><button class="nav-item nav-item--danger" @click="signOut"><AppIcon name="logOut" />Sign out
            </button></div></div></span></div><div id="mobilenav" class="sheet" :data-closed="menuOpen ? undefined : ''" @click.stop><nav class="wrap sheet__in"><p class="sheet__head">Browse</p><NuxtLink v-for="d in DISCOVER" :key="d.key" class="nav-item" :to="d.href"><AppIcon :name="d.icon" />{{ d.label }}
        </NuxtLink><div class="popover__sep" /><NuxtLink class="nav-item" to="/subscribe"><AppIcon name="sparkles" />Subscribe</NuxtLink><NuxtLink class="nav-item" to="/launcher"><AppIcon name="download" />Launcher</NuxtLink></nav></div></header>
</template>
<style src="~/assets/css/header.css">
</style>
