<script setup>
defineProps({ steps: { type: Array, required: true }, at: { type: Number, default: 0 }, label: { type: String, default: "Progress" } });
</script>
<template>
<ol class="rail" :aria-label="label"><li v-for="(name, i) in steps" :key="name" :class="i === at ? 'is-here' : i < at ? 'is-done' : ''" :aria-current="i === at ? 'step' : undefined" ><span class="rail__dot"><Transition name="swap" mode="out-in"><AppIcon v-if="i < at" key="on" name="check" /><span v-else key="off">{{ i + 1 }}</span></Transition></span><span class="rail__label">{{ name }}</span></li></ol>
</template>
