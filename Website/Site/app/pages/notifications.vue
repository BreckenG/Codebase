<script setup>
useHead({ title: 'Notifications | Ranked World' });
const { me } = useMe();
const { state, unread, refresh, markRead } = useNotifications();
const { enabled: desktop, signIn, loginPending } = useDesktop();
const { toast } = useToast();
const busy = ref(false);
const STATUS = { accepted: 'Accepted', declined: 'Declined', unavailable: 'No longer available' };

async function read(ids) {
  busy.value = true;
  try {
    await markRead(ids);
  } catch (e) {
    toast(e.message, 'bad');
  } finally {
    busy.value = false;
  }
}

async function open(n) {
  if (!n.readAt) await read([n.id]);
  await navigateTo(n.to);
}

const date = (value) =>
  new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
onMounted(refresh);
</script>

<template>
  <main id="main" class="page">
    <div class="wrap nt">
      <header class="page-head">
        <div>
          <h1 class="reveal-up">Notifications</h1>
          <p v-if="unread" class="reveal-up" style="--i: 1">{{ unread }} unread</p>
        </div>
        <button v-if="unread" class="btn" :disabled="busy" @click="read()">
          <AppIcon name="check" />Mark all as read
        </button>
      </header>
      <div v-if="!me.user" class="empty">
        <h2>Sign in to see your notifications</h2>
        <p>Party invites, scrim results and account news land here.</p>
        <button v-if="desktop" class="btn btn--brand" :disabled="loginPending" @click="signIn">Sign in</button>
        <NuxtLink v-else class="btn btn--brand" to="/sign-in"><AppIcon name="discord" />Sign in</NuxtLink>
      </div>
      <div v-else-if="state.error" class="alert" role="alert">
        <p>{{ state.error }}</p>
        <button class="btn btn--small" @click="refresh">Try again</button>
      </div>
      <div v-else-if="!state.loaded" class="skeleton" role="status" aria-label="Loading notifications" />
      <div v-else-if="!state.items.length" class="empty">
        <h2>No notifications yet</h2>
        <p>Party invites, scrim results and account news land here.</p>
      </div>
      <div v-else class="nt__list">
        <article
          v-for="(n, i) in state.items"
          :key="n.id"
          class="nt__item reveal-up"
          :class="{ unread: !n.readAt }"
          :style="{ '--i': Math.min(i, 10) }"
        >
          <PlayerAvatar :contain="n.kind !== 'party_invite'" :name="n.actorName" :src="n.avatar" :size="44" />
          <div class="nt__copy">
            <div class="nt__title">
              <h2>{{ n.title }}</h2>
              <span v-if="!n.readAt" class="nt__dot" aria-label="Unread" />
            </div>
            <p>{{ n.body }}</p>
            <div class="nt__meta">
              <time class="meta" :datetime="n.createdAt">{{ date(n.createdAt) }}</time>
              <span v-if="STATUS[n.status]" class="chip">{{ STATUS[n.status] }}</span>
            </div>
            <div class="go-row nt__actions">
              <button v-if="n.to" class="btn btn--brand btn--small" :disabled="busy" @click="open(n)">
                {{ n.kind === 'party_invite' ? 'Open invitation' : 'View details' }}
              </button>
              <button v-if="!n.readAt" class="btn btn--ghost btn--small" :disabled="busy" @click="read([n.id])">
                Mark as read
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </main>
</template>

<style scoped>
.nt__list {
  display: grid;
  gap: 10px;
  max-width: 860px;
}
.nt__item {
  display: flex;
  gap: 18px;
  padding: 22px;
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--panel);
}
.nt__item.unread {
  box-shadow: inset 3px 0 0 var(--brand);
}
.nt__copy {
  flex: 1;
  min-width: 0;
}
.nt__title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nt__title h2 {
  font-size: 19px;
}
.nt__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand);
}
.nt__copy p {
  margin: 6px 0 10px;
  overflow-wrap: anywhere;
}
.nt__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.nt__meta time {
  font-size: 12px;
}
.nt__actions {
  margin-top: 14px;
}
@media (max-width: 600px) {
  .nt__item {
    gap: 12px;
    padding: 16px;
  }
}
</style>
