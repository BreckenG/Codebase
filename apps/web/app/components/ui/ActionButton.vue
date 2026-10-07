<script setup>
const props = defineProps({ action: { type: Function, default: null }, label: { type: String, default: "" }, doneLabel: { type: String, default: "Done" }, failLabel: { type: String, default: "Try again" }, icon: { type: String, default: "" }, trailing: { type: Boolean, default: false }, hold: { type: Number, default: 1600 }, disabled: { type: Boolean, default: false }, variant: { type: String, default: "brand" }, wide: { type: Boolean, default: false }, small: { type: Boolean, default: false } });
const emit = defineEmits(["ok", "fail"]);
const VARIANTS = { brand: "btn--brand", plus: "btn--plus", outline: "btn--outline", ghost: "btn--ghost", danger: "btn--danger", plain: "" };
const state = ref("idle");
let timer;
const cls = computed(() => ["btn", "act", VARIANTS[props.variant] ?? "", props.small ? "" : "btn--large", props.wide ? "act--wide" : ""]);
async function go() { if (state.value === "busy" || props.disabled) return; clearTimeout(timer); state.value = "busy"; try { const out = props.action ? await props.action() : null; state.value = "done"; emit("ok", out); } catch (e) { state.value = "fail"; emit("fail", e); } timer = setTimeout(() => state.value = "idle", props.hold); }
onBeforeUnmount(() => clearTimeout(timer));
</script>
<template>
<button :class="cls" :data-state="state" :disabled="disabled || state === 'busy'" :aria-busy="state === 'busy' ? 'true' : undefined" @click="go" ><span class="act__face"><span class="act__slot" :data-on="state === 'idle' || undefined"><AppIcon v-if="icon && !trailing" :name="icon" /><slot>{{ label }}</slot><AppIcon v-if="icon && trailing" :name="icon" /></span><span class="act__slot" :data-on="state === 'busy' || undefined"><span class="spin" /></span><span class="act__slot" :data-on="state === 'done' || undefined"><svg v-if="state === 'done'" class="act__tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ><path d="M20 6 9 17l-5-5" /></svg>
        {{ doneLabel }}
      </span><span class="act__slot" :data-on="state === 'fail' || undefined"><AppIcon name="info" />{{ failLabel }}
      </span></span></button>
</template>
