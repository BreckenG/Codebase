<script setup>
const INVITE = 'https://discord.gg/gorillatagcomp';
const {
  data,
  refresh,
  error: billingError,
} = await useApiFetch('/api/billing/config', {
  key: 'billing-config-settings',
  default: () => null,
});
const { data: mine, refresh: refreshMine } = await useApiFetch('/api/me/player', {
  key: 'settings-player',
  default: () => ({ player: null }),
});
const { me, load } = useMe();
const { toast } = useToast();
const config = computed(() => data.value);
const signedIn = computed(() => Boolean(me.value.user));
const tiers = computed(() => config.value?.catalog?.tiers || []);
const plan = computed(() => config.value?.plan?.plan || 'free');
const planName = computed(() => {
  if (plan.value === 'free') return 'Free';
  return `Ranked World ${plan.value[0].toUpperCase()}${plan.value.slice(1)}`;
});
const linked = computed(() => mine.value?.player || null);
const unlinking = ref(false);
const confirmUnlink = ref(false);
const signingOut = ref(false);
const signingOutAll = ref(false);
const confirmAll = ref(false);
const unlinkLabel = computed(() => {
  if (unlinking.value) return 'Disconnecting...';
  return confirmUnlink.value ? 'Confirm disconnect' : 'Disconnect';
});
const allLabel = computed(() => {
  if (signingOutAll.value) return 'Signing out...';
  return confirmAll.value ? 'Confirm sign out everywhere' : 'Sign out everywhere';
});
const SECTIONS = computed(() => [
  { href: '#identity', label: 'Connected accounts' },
  { href: '#membership', label: 'Membership' },
  ...(signedIn.value ? [{ href: '#replay-permission', label: 'Replay permission' }] : []),
  { href: '#privacy', label: 'Privacy requests' },
  { href: '#support', label: 'Help and community' },
]);
const PAGES = [
  { to: '/me', label: 'Your player profile' },
  { to: '/history', label: 'Match history' },
  { to: '/leaderboard?sort=friends', label: 'Friends leaderboard' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/launcher', label: 'Launcher' },
  { to: '/ranked', label: 'How ranking works' },
];
const ELSEWHERE = [
  { icon: 'bell', label: 'Notification preferences', hint: 'Bot commands, for now', href: INVITE },
  { icon: 'book', label: 'Rules and conduct', hint: 'What gets you rank banned', href: INVITE },
  { icon: 'shield', label: 'Appeal a ban', hint: 'Open a ticket in the server', href: INVITE },
  { icon: 'inbox', label: 'Support', hint: 'Anything else, ask in Discord', href: INVITE },
];

function arm(flag) {
  flag.value = true;
  setTimeout(() => {
    flag.value = false;
  }, 5000);
}

async function unlink() {
  if (!confirmUnlink.value) return arm(confirmUnlink);
  confirmUnlink.value = false;
  unlinking.value = true;
  try {
    await apiFetch('/api/me/link', { method: 'DELETE' });
    await refreshMine();
    toast('Gorilla Tag account disconnected.');
  } catch (e) {
    toast(e?.data?.statusMessage || e?.message || 'That did not go through.');
  } finally {
    unlinking.value = false;
  }
}

async function signOutEverywhere() {
  if (!confirmAll.value) return arm(confirmAll);
  confirmAll.value = false;
  signingOutAll.value = true;
  try {
    await apiFetch('/api/me/sessions', { method: 'POST', body: { action: 'logout-everywhere' } });
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/');
  } catch {
    toast('Could not sign out everywhere. Try again.');
    signingOutAll.value = false;
  }
}

async function signOut() {
  signingOut.value = true;
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
    window.location.assign('/');
  } catch {
    toast('Could not sign out. Try again.');
    signingOut.value = false;
  }
}

onMounted(() => load());
useHead({ title: 'Settings | Ranked World' });
</script>

<template>
  <main id="main" class="page">
    <div class="wrap">
      <header class="page-head">
        <h1 class="reveal-up">Settings</h1>
      </header>
      <div class="st">
        <nav class="st__nav" aria-label="Account sections">
          <a v-for="s in SECTIONS" :key="s.href" :href="s.href">{{ s.label }}</a>
          <span class="st__rule" />
          <NuxtLink v-for="p in PAGES" :key="p.to" :to="p.to">{{ p.label }}</NuxtLink>
        </nav>

        <div class="st__main">
          <section id="identity" class="st__block">
            <h2>Connected accounts</h2>
            <div class="rows panel st__rows">
              <div class="row">
                <span class="st__icon"><AppIcon name="discord" /></span>
                <div class="st__text">
                  <strong>Discord</strong>
                  <span class="meta">{{ me.user?.username || 'Sign in to manage your account.' }}</span>
                </div>
                <span v-if="signedIn" class="chip chip--live">Connected</span>
                <a v-else class="btn btn--brand btn--small" href="/sign-in">Sign in</a>
              </div>
              <div class="row">
                <span class="st__icon"><AppIcon name="link" /></span>
                <div class="st__text">
                  <strong>Gorilla Tag</strong>
                  <span class="meta">{{ linked?.linked ? linked.name : 'Not connected' }}</span>
                  <PhotonId v-if="linked?.photonId" :id="linked.photonId" />
                </div>
                <button
                  v-if="linked?.linked"
                  class="btn btn--small"
                  :class="{ 'btn--danger': confirmUnlink }"
                  :disabled="unlinking"
                  @click="unlink"
                >
                  {{ unlinkLabel }}
                </button>
                <NuxtLink v-else class="btn btn--small" to="/play">Connect</NuxtLink>
              </div>
            </div>
            <p v-if="confirmUnlink" class="meta" role="status">
              Disconnecting removes your account connection. It does not delete stored records or cancel billing. Press
              Confirm disconnect to continue.
            </p>
          </section>

          <section id="membership" class="st__block">
            <h2>Membership</h2>
            <div v-if="billingError" class="alert" role="alert">
              <p>Could not load your membership.</p>
              <button class="btn btn--small" @click="refresh">Try again</button>
            </div>
            <template v-else>
              <div class="rows panel st__rows">
                <div class="row">
                  <span class="st__icon"><AppIcon name="crown" /></span>
                  <div class="st__text">
                    <strong>{{ planName }}</strong>
                  </div>
                  <NuxtLink class="btn btn--small" to="/subscribe">
                    {{ plan === 'free' ? 'Explore plans' : 'View plans' }}
                  </NuxtLink>
                </div>
              </div>
              <PlusManageSubscription
                v-if="signedIn && plan !== 'free'"
                :plan="config?.plan"
                :tiers="tiers"
                @changed="refresh()"
              />
            </template>
          </section>

          <section v-if="signedIn" id="replay-permission" class="st__block">
            <ReplayConsentGate settings />
          </section>

          <section id="privacy" class="st__block">
            <h2>Privacy requests</h2>
            <p>
              Request a copy, correction, or deletion of your data by email. Disconnecting does not erase stored
              records.
            </p>
            <div class="go-row">
              <a class="btn" href="mailto:contact@rankedworld.com?subject=Privacy%20request">Email a privacy request</a>
              <NuxtLink class="btn btn--ghost" to="/legal/privacy">Read Privacy policy</NuxtLink>
            </div>
          </section>

          <section id="support" class="st__block">
            <h2>Help and community</h2>
            <div class="rows panel st__rows">
              <a v-for="e in ELSEWHERE" :key="e.label" class="row" :href="e.href">
                <span class="st__icon"><AppIcon :name="e.icon" /></span>
                <div class="st__text">
                  <strong>{{ e.label }}</strong>
                  <span class="meta">{{ e.hint }}</span>
                </div>
                <AppIcon name="external" />
              </a>
            </div>
          </section>

          <section v-if="signedIn" class="st__block">
            <div class="go-row">
              <button class="btn" :disabled="signingOut" @click="signOut">
                <AppIcon name="logOut" />{{ signingOut ? 'Signing out...' : 'Sign out' }}
              </button>
              <button
                class="btn"
                :class="{ 'btn--danger': confirmAll }"
                :disabled="signingOutAll"
                @click="signOutEverywhere"
              >
                <AppIcon name="shield" />{{ allLabel }}
              </button>
            </div>
            <p v-if="confirmAll" class="meta" role="status">
              This signs out every browser and every installed launcher on your account. Press Confirm to continue.
            </p>
          </section>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.st {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 56px;
  align-items: start;
}
.st__nav {
  position: sticky;
  top: calc(var(--nav) + 24px);
  display: grid;
  gap: 2px;
}
.st__nav a {
  padding: 8px 12px;
  border-radius: var(--r-sm);
  color: var(--dim);
  font-size: 14px;
  font-weight: 600;
  transition:
    color 0.2s,
    background 0.2s;
}
.st__nav a:hover {
  color: var(--ink);
  background: var(--raise);
}
.st__rule {
  height: 1px;
  margin: 10px 12px;
  background: var(--line);
}
.st__main {
  display: grid;
  gap: 56px;
  max-width: 820px;
}
.st__block {
  display: grid;
  gap: 16px;
  scroll-margin-top: calc(var(--nav) + 24px);
}
.st__block h2 {
  font-size: 32px;
}
.st__rows {
  padding: 0;
}
.st__rows .row {
  padding: 18px 22px;
}
.st__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: var(--r);
  background: var(--raise);
  color: var(--ink);
}
.st__icon svg {
  width: 20px;
  height: 20px;
}
.st__text {
  display: grid;
  flex: 1;
  min-width: 0;
  justify-items: start;
  gap: 2px;
}
.st__text strong {
  color: var(--ink);
}
.row > svg {
  width: 16px;
  height: 16px;
  color: var(--dim);
}
@media (max-width: 860px) {
  .st {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .st__nav {
    position: static;
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .st__nav a {
    white-space: nowrap;
  }
  .st__rule {
    display: none;
  }
}
</style>
