<script setup>
const props = defineProps({ modelValue: { type: [String, Number], default: '' }, options: { type: Array, default: () => [] }, label: { type: String, required: true }, disabled: Boolean });
const emit = defineEmits(['update:modelValue']);
const id = useId();
const root = ref(null), trigger = ref(null), list = ref(null), opened = ref(false), active = ref(0);
const choices = computed(() => props.options.map(option => typeof option === 'object' ? { value: option.value ?? option.key ?? option.id, label: String(option.label ?? option.value ?? option.key ?? option.id) } : { value: option, label: String(option) }));
const selected = computed(() => choices.value.findIndex(option => option.value === props.modelValue));
const text = computed(() => choices.value[selected.value]?.label || 'None');
let typed = '', timer;
function reveal(index = selected.value) { if (props.disabled || !choices.value.length) return; opened.value = true; active.value = Math.max(0, index); nextTick(() => { list.value?.focus(); scrollActive(); }); }
function close(focus = false) { opened.value = false; typed = ''; clearTimeout(timer); if (focus) nextTick(() => trigger.value?.focus()); }
function scrollActive() { list.value?.children[active.value]?.scrollIntoView({ block: 'nearest' }); }
function choose(index) { if (!choices.value[index]) return; emit('update:modelValue', choices.value[index].value); close(true); }
function onKey(event) {
  const last = choices.value.length - 1;
  if (event.key === 'Tab') { close(); return; }
  if (event.key === 'Escape' && opened.value) { event.preventDefault(); event.stopPropagation(); close(true); return; }
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    if (!opened.value) { reveal(event.key === 'End' ? last : event.key === 'Home' ? 0 : selected.value); return; }
    active.value = event.key === 'Home' ? 0 : event.key === 'End' ? last : (active.value + (event.key === 'ArrowDown' ? 1 : -1) + choices.value.length) % choices.value.length;
    nextTick(scrollActive);
  } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); opened.value ? choose(active.value) : reveal(); }
  else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault(); typed += event.key.toLowerCase(); clearTimeout(timer); timer = setTimeout(() => typed = '', 600);
    const found = choices.value.findIndex(option => option.label.toLowerCase().startsWith(typed));
    if (found >= 0) { if (!opened.value) reveal(found); else { active.value = found; nextTick(scrollActive); } }
  }
}
function outside(event) { if (!root.value?.contains(event.target)) close(); }
onMounted(() => document.addEventListener('pointerdown', outside));
onBeforeUnmount(() => { clearTimeout(timer); document.removeEventListener('pointerdown', outside); });
watch(() => props.disabled, value => { if (value) close(); });
</script>
<template>
<div ref="root" class="themed-select" @focusout="!$event.currentTarget.contains($event.relatedTarget) && close()"><span :id="id + '-label'" class="themed-select__label">{{ label }}</span><button :id="id + '-trigger'" ref="trigger" type="button" class="themed-select__trigger" :disabled="disabled || !choices.length" aria-haspopup="listbox" :aria-expanded="opened" :aria-controls="id + '-list'" :aria-labelledby="id + '-label ' + id + '-value'" @click="opened ? close() : reveal()" @keydown="onKey"><span :id="id + '-value'">{{ text }}</span><AppIcon name="chevron" /></button><ul v-if="opened" :id="id + '-list'" ref="list" class="themed-select__list" role="listbox" tabindex="-1" :aria-labelledby="id + '-label'" :aria-activedescendant="id + '-option-' + active" @keydown="onKey"><li v-for="(option, index) in choices" :id="id + '-option-' + index" :key="option.value" role="option" :aria-selected="selected === index" :class="{ 'is-active': active === index }" @pointermove="active = index" @mousedown.prevent @click="choose(index)"><span>{{ option.label }}</span><AppIcon v-if="selected === index" name="check" /></li></ul></div>
</template>
<style scoped>
.themed-select{position:relative;display:grid;gap:7px;min-width:100px;color:var(--color-text-secondary);font-size:12px}.themed-select__label{font-size:11px}.themed-select__trigger{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--color-divider);border-radius:var(--radius-md);background:var(--surface-2);color:var(--color-text);font:inherit;text-align:left;cursor:pointer}.themed-select__trigger:hover,.themed-select__trigger[aria-expanded=true]{border-color:var(--color-brand)}.themed-select__trigger:disabled{opacity:.6;cursor:default}.themed-select__trigger>svg,.themed-select__list svg{width:15px;height:15px;flex:none}.themed-select__list{position:absolute;top:100%;left:0;z-index:90;min-width:100%;width:max-content;max-width:min(300px,80vw);max-height:280px;overflow:auto;list-style:none;margin:6px 0 0;padding:5px;background:var(--surface-2);border:1px solid var(--color-divider-dark);border-radius:var(--radius-md);box-shadow:var(--shadow-floating)}.themed-select__list li{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:44px;padding:10px;border-radius:var(--radius-sm);cursor:pointer}.themed-select__list li.is-active{background:var(--surface-4);color:var(--color-text-primary)}.themed-select__list li[aria-selected=true]{color:var(--color-brand)}.themed-select--inline{display:flex;align-items:center;gap:10px}.themed-select--inline .themed-select__label{white-space:nowrap}.themed-select--inline .themed-select__list{left:auto;right:0}@media(max-width:760px){.themed-select{flex:1;min-width:80px}.themed-select--inline{flex:0;min-width:140px}}
</style>
