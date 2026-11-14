<script setup lang="ts">
const { status, available, busy, pendingJoin, requestLaunch, action } = useDesktop();
const path = ref('');
watch(
  () => status.value?.gamePath,
  (value) => {
    if (value) path.value = value;
  },
  { immediate: true },
);
const gameLine = computed(() => {
  if (status.value?.gameRunning) return 'Gorilla Tag is running.';
  return status.value?.gameInstalled ? 'Your Steam installation is ready.' : 'Find your Steam installation.';
});
</script>

<template>
  <main id="main" class="page">
    <div class="wrap gs">
      <header class="page-head">
        <h1 class="reveal-up">Game settings</h1>
        <span class="chip">Windows / Steam</span>
      </header>

      <section class="panel gs__game">
        <span class="gs__dot" :class="{ ready: status?.gameInstalled, running: status?.gameRunning }" />
        <div>
          <h2>Gorilla Tag</h2>
          <p class="meta">{{ gameLine }}</p>
        </div>
        <button
          class="btn btn--brand btn--large"
          :disabled="!available || busy || !status?.gameInstalled || status?.gameRunning || pendingJoin"
          @click="requestLaunch()"
        >
          <AppIcon name="play" />Launch game
        </button>
      </section>

      <section class="panel gs__block">
        <div class="section-head">
          <h2>Installation</h2>
          <button class="btn btn--small" :disabled="!available || busy || pendingJoin" @click="action('detect_game')">
            Find with Steam
          </button>
        </div>
        <form class="gs__path" @submit.prevent="action('set_game_path', { path })">
          <label for="game-folder" class="meta">Gorilla Tag folder</label>
          <div>
            <input
              id="game-folder"
              v-model="path"
              type="text"
              spellcheck="false"
              autocomplete="off"
              placeholder="C:\Program Files (x86)\Steam\steamapps\common\Gorilla Tag"
              required
            />
            <button class="btn" :disabled="!available || busy || pendingJoin || !path.trim()" type="submit">
              Save folder
            </button>
          </div>
        </form>
      </section>

      <section class="panel gs__block">
        <div class="section-head">
          <h2>Ranked helper</h2>
          <span class="chip" :class="{ 'chip--live': status?.helperInstalled }">
            {{ status?.helperInstalled ? 'Installed' : 'Not installed' }}
          </span>
        </div>
        <p>
          The helper joins a code you select after Gorilla Tag is ready. It does not change your movement or game rules.
        </p>
        <p v-if="!status?.bepInExInstalled" class="meta">
          BepInEx must already be installed in your Gorilla Tag folder.
        </p>
        <div class="go-row">
          <button
            class="btn"
            :disabled="
              !available || busy || !status?.bepInExInstalled || status?.gameRunning || status?.helperInstalled
            "
            @click="action('install_join_helper')"
          >
            {{ status?.helperInstalled ? 'Helper up to date' : 'Install Ranked helper' }}
          </button>
          <NuxtLink class="btn btn--ghost" to="/play">Choose a ranked code</NuxtLink>
        </div>
        <p v-if="status?.gameRunning" class="meta">Close Gorilla Tag before changing the helper.</p>
      </section>

      <section class="panel gs__block">
        <h2>Joining rooms</h2>
        <p>
          Connect your PC VR headset, choose a room in Play, then select Join in VR. The launcher starts the Steam
          version and waits for the game to confirm the room.
        </p>
        <p class="meta">
          This launcher does not start the standalone Quest version. Cancelling stops pending requests; it cannot undo a
          connection the game has already started.
        </p>
      </section>
      <p class="meta">Ranked World {{ status?.version || '0.1.0' }}</p>
    </div>
  </main>
</template>

<style scoped>
.gs {
  display: grid;
  gap: 16px;
  max-width: 900px;
}
.gs .page-head {
  margin-bottom: 16px;
}
.gs__game {
  display: flex;
  align-items: center;
  gap: 18px;
}
.gs__game div {
  flex: 1;
}
.gs__game h2,
.gs__block h2 {
  font-size: 26px;
}
.gs__dot {
  width: 14px;
  height: 14px;
  flex: none;
  border-radius: 50%;
  background: var(--dim);
}
.gs__dot.ready {
  background: var(--good);
  box-shadow: 0 0 0 5px rgba(58, 208, 125, 0.16);
}
.gs__dot.running {
  background: var(--brand);
  box-shadow: 0 0 0 5px rgba(238, 134, 42, 0.18);
}
.gs__block {
  display: grid;
  gap: 14px;
}
.gs__block .section-head {
  margin: 0;
}
.gs__path {
  display: grid;
  gap: 8px;
}
.gs__path div {
  display: flex;
  gap: 10px;
}
.gs__path input {
  flex: 1;
  min-width: 0;
  min-height: 46px;
  padding: 0 14px;
  border-radius: var(--r);
  border: 1px solid var(--line-2);
  background: var(--raise);
  color: var(--ink);
  font: inherit;
  font-size: 14px;
  outline: 0;
}
.gs__path input:focus {
  border-color: var(--brand);
}
</style>
