<script setup>
const props = defineProps({ contain: { type: Boolean, default: false }, name: { type: String, default: "" }, size: { type: Number, default: 40 }, src: { type: String, default: "" }, discordId: { type: String, default: "" } });
const loaded = ref(false);
const failed = ref(false);
const image = ref(null);
const pic = computed(() => privateAvatarSource(props.src || defaultDiscordAvatar(props.discordId)));
watch(pic, () => { loaded.value = false; failed.value = false; });
onMounted(() => { if (image.value?.complete) { loaded.value = image.value.naturalWidth > 0; failed.value = !loaded.value; } });
</script>
<template>
<span class="avatar" :class="{ 'avatar--contain': contain }" :style="{ '--avatar-size': size + 'px' }" :aria-label="failed || !pic ? 'Profile picture unavailable' : undefined" :aria-hidden="failed || !pic ? undefined : 'true'"><img v-if="pic && !loaded && !failed" class="avatar__img avatar__placeholder" src="/img/avatar-placeholder.png" alt="" /><img ref="image" v-if="pic && !failed" :key="pic" class="avatar__img" :class="{ 'avatar__img--loading': !loaded }" :src="pic" alt="" @load="loaded = true" @error="failed = true" /><AppIcon v-if="failed || !pic" name="user" /></span>
</template>
<style>
.avatar{position:relative;display:grid;place-items:center;flex:none;width:var(--avatar-size);height:var(--avatar-size);border-radius:var(--radius-md);background:var(--surface-4);color:var(--color-text-secondary);line-height:1;user-select:none;overflow:hidden}
.avatar__img{width:100%;height:100%;object-fit:cover;display:block}.avatar--contain .avatar__img{object-fit:contain;padding:5px;box-sizing:border-box}.avatar__placeholder{position:absolute;inset:0}.avatar__img--loading{opacity:0}.avatar>svg{width:55%;height:55%}
</style>
