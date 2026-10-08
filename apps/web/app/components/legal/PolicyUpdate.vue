<script setup>
import { POLICY_VERSION, POLICY_DATE, POLICY_CHANGES } from '~/utils/legal'
const { me, load } = useMe()
const route = useRoute()
const saving = ref(false), failure = ref(''), box = ref(null)
const open = computed(() => Boolean(me.value.user && me.value.policy && !me.value.policy.agreed && !route.path.startsWith('/legal')))
async function agree() {
  if (saving.value) return
  saving.value = true; failure.value = ''
  try { await apiFetch('/api/me/policy', { method: 'POST', body: { accepted: true, policyVersion: POLICY_VERSION } }); me.value = { ...me.value, policy: { version: POLICY_VERSION, agreed: true } } }
  catch (e) { failure.value = e?.data?.statusMessage || 'Could not save that. Try again.' }
  finally { saving.value = false }
}
async function leave() { await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {}); window.location.assign('/') }
onMounted(() => load())
watch(open, value => { if (import.meta.client) { document.documentElement.classList.toggle('modal-open', value); if (value) nextTick(() => box.value?.focus()) } }, { immediate: true })
onBeforeUnmount(() => document.documentElement.classList.remove('modal-open'))
</script>

<template>
<div v-if="open" class="modal" role="dialog" aria-modal="true" aria-labelledby="policy-title"><div ref="box" class="modal__box policy-update" tabindex="-1"><div class="modal__head"><h2 id="policy-title">We updated our terms</h2></div><div class="modal__body"><p>Our terms and privacy policy changed on {{ POLICY_DATE }}. Here is what is new:</p><ul class="policy-update__list"><li v-for="line in POLICY_CHANGES" :key="line">{{ line }}</li></ul><p class="meta">Read the full <NuxtLink to="/legal/terms">Terms</NuxtLink>, <NuxtLink to="/legal/privacy">Privacy policy</NuxtLink> and <NuxtLink to="/legal/cookies">Cookie policy</NuxtLink>. You need to agree to keep using your account.</p><p v-if="failure" class="world-error" role="alert">{{ failure }}</p><div class="modal__foot"><button type="button" class="btn btn--ghost" :disabled="saving" @click="leave">Sign out</button><button type="button" class="btn btn--brand" :disabled="saving" @click="agree">{{ saving ? 'Saving...' : 'I agree' }}</button></div></div></div></div>
</template>

<style scoped>
.policy-update{width:min(560px,100%)}
.policy-update p{font-size:14px;line-height:1.7}
.policy-update__list{display:grid;gap:10px;margin:0;padding-left:18px;font-size:14px;line-height:1.6}
.policy-update .meta{font-size:12px}
.policy-update .meta a{color:var(--color-brand)}
.policy-update .modal__foot{justify-content:flex-end}
</style>
