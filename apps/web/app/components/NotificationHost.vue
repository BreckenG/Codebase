<script setup>
const {me}=useMe(),{enabled:desktop}=useDesktop(),{state,refresh,markRead}=useNotifications(),{toast}=useToast();
const banners=ref([]),busy=ref("");
let seen=new Set(),timer;
watch(()=>me.value.user?.id,()=>{seen=new Set();banners.value=[];if(import.meta.client)refresh()},{immediate:true});
function bannerKey(n){return n.kind==='code_preview'?`${n.id}:${n.createdAt}`:n.id}
watch(()=>state.value.items,items=>{
if(state.value.userId!==me.value.user?.id)return;
const active=new Map(items.filter(n=>!n.readAt&&["pending","info"].includes(n.status)).map(n=>[bannerKey(n),n]));
banners.value=banners.value.map(n=>active.get(bannerKey(n))).filter(Boolean);
for(const[key,n]of active){if(!seen.has(key)&&banners.value.length<3){seen.add(key);banners.value.push(n)}}
});
async function dismiss(n,open=false){busy.value=n.id;try{await markRead([n.id]);banners.value=banners.value.filter(i=>i.id!==n.id);if(open)await navigateTo(n.to)}catch(e){toast(e.message,"bad")}finally{busy.value=""}}
function visible(){if(!document.hidden&&me.value.user)refresh()}
onMounted(()=>{timer=setInterval(visible,8000);document.addEventListener("visibilitychange",visible);window.addEventListener("focus",visible);visible()});
onBeforeUnmount(()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visible);window.removeEventListener("focus",visible)});
</script>
<template>
<div class="notification-host" :class="{'notification-host--desktop':desktop}" aria-live="polite" aria-relevant="additions"><TransitionGroup name="notice"><section v-for="n in banners" :key="bannerKey(n)" class="notification-popup" :aria-label="n.title"><PlayerAvatar :contain="n.kind !== 'party_invite'" :name="n.actorName" :src="n.avatar" :size="38" /><div><strong>{{ n.title }}</strong><p>{{ n.body }}</p><button class="notification-open" :disabled="busy!==''" @click="dismiss(n,true)">{{ n.kind === "party_invite" ? "Open invitation" : "View details" }}<AppIcon name="arrowRight" /></button></div><button class="icon-btn" :disabled="busy!==''" :aria-label="`Dismiss ${n.title}`" @click="dismiss(n)"><AppIcon name="x" /></button></section></TransitionGroup></div>
</template>
<style scoped>
.notification-host{position:fixed;top:18px;right:20px;width:min(410px,calc(100vw - 32px));z-index:90;display:grid;gap:10px;pointer-events:none}.notification-host--desktop{top:54px}.notification-popup{pointer-events:auto;display:flex;align-items:flex-start;gap:12px;padding:16px;border:1px solid var(--color-divider);border-left:3px solid var(--color-brand);border-radius:12px;background:var(--surface-2);box-shadow:var(--shadow-floating)}.notification-popup>div{flex:1;min-width:0}.notification-popup strong{color:var(--color-text-primary);font-size:14px}.notification-popup p{font-size:13px;margin:5px 0 10px;overflow-wrap:anywhere}.notification-popup>.icon-btn{flex:none;width:28px;height:28px}.notification-open{display:inline-flex;gap:8px;align-items:center;color:var(--color-brand);font-size:13px;font-weight:600;background:none;border:0;padding:2px 0;cursor:pointer}.notification-open svg{width:15px;height:15px}.notice-enter-active,.notice-leave-active{transition:opacity .18s,transform .18s}.notice-enter-from,.notice-leave-to{opacity:0;transform:translateY(-8px)}@media(max-width:760px){.notification-host{top:70px;right:16px}.notification-host--desktop{top:48px}}@media(prefers-reduced-motion:reduce){.notice-enter-active,.notice-leave-active{transition:none}}
</style>
