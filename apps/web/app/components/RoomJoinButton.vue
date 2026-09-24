<script setup lang="ts">
const props = defineProps<{ code: string; }>();
const { enabled, available, status, busy, pendingJoin, requestLaunch } = useDesktop();
</script>
<template>
<div v-if="enabled && code" class="desktop-room-action"><button class="btn btn--brand world-room-join" :disabled="!available || busy || pendingJoin" :aria-label="`Join ${code} ${status?.gameRunning ? 'directly' : 'in VR'}`" @click="requestLaunch(props.code)"><AppIcon name="play" />{{ status?.gameRunning ? 'Join code directly' : 'Join in VR' }}</button><small v-if="status?.gameRunning">Send this code to your running game.</small></div>
</template>
