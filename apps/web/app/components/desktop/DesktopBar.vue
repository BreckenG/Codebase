<script setup lang="ts">
const {
  update,
  showUpdate,
  enabled,
  available,
  status,
  busy,
  pendingJoin,
  requestLaunch,
  failure,
  login,
  loginPending,
  action,
  cancelSignIn,
} = useDesktop();
const state = computed(() => {
  if (status.value?.gameRunning) return 'Running';
  return status.value?.gameInstalled ? 'Ready to launch' : 'Set up your game';
});
</script>

<template>
  <div
    v-if="enabled"
    class="desktop-bar"
    :class="{ 'is-running': status?.gameRunning, 'is-ready': status?.gameInstalled && !status?.gameRunning }"
  >
    <div class="desktop-bar__game">
      <i aria-hidden="true" />
      <div>
        <strong>Gorilla Tag</strong>
        <span>{{ state }}</span>
      </div>
    </div>
    <div class="desktop-bar__actions">
      <button
        v-if="update.available"
        class="btn btn--small desktop-update-badge"
        :disabled="busy"
        @click="showUpdate()"
      >
        <AppIcon name="download" />Update available
      </button>
      <NuxtLink class="icon-btn" to="/launcher" aria-label="Game settings"><AppIcon name="settings" /></NuxtLink>
      <button
        class="btn btn--brand"
        :disabled="!available || busy || !status?.gameInstalled || status?.gameRunning || pendingJoin"
        @click="requestLaunch()"
      >
        <AppIcon name="play" />{{ status?.gameRunning ? 'Game running' : 'Launch Gorilla Tag' }}
      </button>
    </div>
    <div v-if="status?.join" class="desktop-bar__notice" role="status">
      <span>{{ status.join.code ? `${status.join.code}: ` : '' }}{{ status.join.message }}</span>
      <button v-if="pendingJoin" class="btn btn--ghost btn--small" :disabled="busy" @click="action('cancel_join')">
        Cancel join
      </button>
    </div>
    <div v-if="loginPending && login" class="desktop-bar__notice" role="status">
      <span
        >Approve code <strong>{{ login.userCode }}</strong> in your browser to sign in.</span
      >
      <button class="btn btn--ghost btn--small" @click="cancelSignIn">Cancel sign-in</button>
    </div>
    <div v-if="failure" class="desktop-bar__notice bad" role="alert">
      <span>{{ failure }}</span>
      <button class="btn btn--ghost btn--small" aria-label="Dismiss launcher error" @click="failure = ''">
        Dismiss
      </button>
    </div>
  </div>
</template>
