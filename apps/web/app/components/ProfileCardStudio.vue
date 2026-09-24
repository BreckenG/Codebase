<script setup>
import { CARD_OPTIONS, clampCard } from '~/utils/profile-card.js';
import { invoke, isTauri } from '@tauri-apps/api/core';
const props = defineProps({ position: { type: Number, default: null } });
const loaded=ref(false),busy=ref(''),failure=ref(''),notice=ref(''),level=ref(0),profile=ref({}),saved=ref('');
const selected=ref(clampCard({}));
const renderer=ref(null);
const active=ref('background');
const labels={background:'Themes',pattern:'Backgrounds',font:'Fonts',accent:'Accents',layout:'Layout'};
const changed=computed(()=>JSON.stringify(selected.value)!==saved.value);
const required=computed(()=>Math.max(...Object.entries(CARD_OPTIONS).map(([key,options])=>options.find(option=>option.id===selected.value[key])?.level||0)));
const locked=computed(()=>required.value>level.value);
const cardProfile=computed(()=>({...profile.value,position:props.position}));
async function load(){
  failure.value='';
  try{
    const result=await apiGet('/api/me/profile-card');
    profile.value=result.profile;level.value=result.level;selected.value=result.card;saved.value=JSON.stringify(result.card);loaded.value=true;
  }catch{failure.value='Your card could not load. Try again.';}
}
async function save(){
  busy.value='save';failure.value='';notice.value='';
  try{
    const result=await apiFetch('/api/me/profile-card',{method:'POST',body:selected.value});
    level.value=result.level;selected.value=result.card;saved.value=JSON.stringify(result.card);notice.value='Saved to your profile.';
  }catch(error){failure.value=error?.data?.statusMessage||'Your card could not save. Try again.';}
  finally{busy.value='';}
}
async function download(){
  busy.value='download';failure.value='';
  try{
    const blob=await renderer.value.png();
    if(isTauri()){
      const path=await invoke('save_profile_card',{png:Array.from(new Uint8Array(await blob.arrayBuffer()))});
      notice.value='Saved to '+path;return;
    }
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download='ranked-world-card.png';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice.value='Your card is ready to share.';
  }catch{failure.value='Could not download your card. Check that the artwork loaded and try again.';}
  finally{busy.value='';}
}
onMounted(load);
</script>
<template>
<section class="card-studio" aria-labelledby="card-studio-heading" :aria-busy="!!busy">
  <div class="world-section-head"><h2 id="card-studio-heading">Your player card</h2><span class="chip">{{ ['Free','Plus','Pro'][level] }}</span></div>
  <p v-if="failure" role="alert" class="bad">{{ failure }}</p>
  <button v-if="failure && !loaded" class="btn" @click="load">Try again</button>
  <p v-if="!loaded && !failure" role="status" class="meta">Loading your card...</p>
  <template v-if="loaded">
    <div class="card-studio__preview"><ProfileCard ref="renderer" :profile="cardProfile" :card="selected" :level="2" /><span v-if="locked" class="card-studio__preview-label">{{ required===2?'Pro':'Plus' }} preview</span></div>
    <div class="card-studio__editor">
      <div class="card-studio__navigation" aria-label="Card customization"><button v-for="(label,key) in labels" :key="key" type="button" :aria-pressed="active===key" @click="active=key">{{ label }}</button></div>
      <fieldset :key="active"><legend class="sr-only">{{ labels[active] }}</legend><div class="card-studio__choices" :class="'card-studio__choices--'+active">
        <button v-for="option in CARD_OPTIONS[active]" :key="option.id" type="button" :disabled="!!busy" :aria-pressed="selected[active]===option.id" @click="selected[active]=option.id;notice=''">
          <span v-if="option.colors" class="card-studio__theme" :style="{background:`linear-gradient(125deg,${option.colors.join(',')})`}"><span /></span>
          <span v-else-if="option.color" class="card-studio__swatch" :style="{background:option.color}" />
          <span v-else-if="active==='pattern'" class="card-studio__pattern" :class="'card-studio__pattern--'+option.id" />
          <span v-else-if="active==='font'" class="card-studio__font" :class="'card-studio__font--'+option.id" :style="{fontFamily:option.file?'':option.family}">Aa</span>
          <span class="card-studio__option-name">{{ option.label }}<small v-if="option.level>level">{{ option.level===2?'Pro':'Plus' }}</small></span>
        </button>
      </div></fieldset>
      <div class="card-studio__footer"><div><p v-if="locked" class="meta">Unlock this style with {{ required===2?'Pro':'Plus' }}.</p><p v-else class="meta" role="status" aria-live="polite">{{ notice || (changed?'Unsaved style':'Your card appears on your public profile.') }}</p></div><div class="card-studio__actions"><NuxtLink v-if="locked" to="/subscribe" class="btn btn--brand">View membership</NuxtLink><button v-else class="btn btn--brand" :disabled="!!busy || !changed" @click="save">{{ busy==='save'?'Saving...':'Save style' }}</button><button class="btn" :disabled="!!busy || locked" @click="download">{{ busy==='download'?'Exporting...':'Download PNG' }}</button></div></div>
    </div>
  </template>
</section>
</template>
<style scoped>
.card-studio .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.card-studio{padding:28px 0;border-top:1px solid var(--color-divider,#ffffff16);margin-top:32px}.card-studio__preview{position:relative;margin:24px auto;max-width:980px}.card-studio__preview-label{position:absolute;right:16px;bottom:16px;background:#171a22ee;border:1px solid #ffffff30;padding:5px 10px;border-radius:8px;font-size:12px}.card-studio__editor{border:1px solid #ffffff16;border-radius:16px;background:var(--surface-2,#17191e);overflow:hidden}.card-studio__navigation{display:flex;gap:8px;padding:14px 20px;border-bottom:1px solid #ffffff12;overflow-x:auto}.card-studio__navigation button{background:none;border:0;white-space:nowrap;color:var(--color-text-secondary);padding:10px 14px;border-radius:8px;font:inherit;font-size:13px;cursor:pointer}.card-studio__navigation button[aria-pressed=true]{background:#f4af8315;color:var(--color-brand,#f4af83)}.card-studio fieldset{border:0;padding:20px;margin:0;min-width:0}.card-studio__choices{display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:10px}.card-studio__choices button{display:flex;flex-direction:column;gap:10px;padding:10px;border:1px solid #ffffff16;border-radius:10px;background:#111419;color:#eee;font:inherit;font-size:12px;text-align:left;cursor:pointer;transition:border-color .15s,background .15s}.card-studio__choices button:hover{border-color:#ffffff50}.card-studio__choices button[aria-pressed=true]{border-color:var(--color-brand,#f4af83);background:#f4af830b;box-shadow:inset 0 0 0 1px #f4af8340}.card-studio__choices button:disabled{opacity:.6;cursor:wait}.card-studio button:focus-visible{outline:2px solid var(--color-brand);outline-offset:2px}.card-studio__theme,.card-studio__pattern{height:48px;width:100%;border-radius:5px;position:relative;overflow:hidden}.card-studio__theme span{position:absolute;width:75px;height:75px;border:1px solid #ffffff25;border-radius:50%;right:-5px;top:12px}.card-studio__option-name{display:flex;align-items:center;justify-content:space-between;width:100%;gap:5px}.card-studio__option-name small{font-size:9px;color:#b5bbc4;border:1px solid #ffffff20;border-radius:4px;padding:1px 4px}.card-studio__swatch{height:28px;width:28px;border-radius:50%;border:1px solid #fff3}.card-studio__font{font-size:27px;height:40px}.card-studio__font--pixel{font-family:CardPixel,monospace}.card-studio__font--space{font-family:CardSpace,sans-serif}.card-studio__font--display{font-family:CardDisplay,sans-serif}.card-studio__font--sora{font-family:Sora,sans-serif}.card-studio__font--archivo{font-family:Archivo,sans-serif}.card-studio__pattern{background-color:#232a35}.card-studio__pattern--orbit{background-image:repeating-radial-gradient(ellipse at 80% 65%,transparent 0 10px,#f4af8335 11px 12px,transparent 13px 20px)}.card-studio__pattern--grid{background-image:linear-gradient(#ffffff18 1px,transparent 1px),linear-gradient(90deg,#ffffff18 1px,transparent 1px);background-size:12px 12px}.card-studio__pattern--contour{background-image:repeating-radial-gradient(ellipse at 100% 150%,transparent 0 7px,#f4af8345 8px 9px,transparent 10px 14px)}.card-studio__pattern--waves{background-image:repeating-radial-gradient(ellipse at 0 100%,transparent 0 5px,#9cdaee45 6px 7px,transparent 8px 13px)}.card-studio__pattern--prism{background-image:repeating-linear-gradient(125deg,transparent 0 25px,#d5b9fa30 26px 40px)}.card-studio__pattern--forest{background-image:conic-gradient(from 150deg at 50% 0,#b1ecc930 60deg,transparent 0);background-size:30px 40px}.card-studio__pattern--stars{background-image:radial-gradient(#d5b9fa 1px,transparent 2px);background-size:22px 19px}.card-studio__footer{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 20px;border-top:1px solid #ffffff12}.card-studio__footer p{margin:0;font-size:12px}.card-studio__actions{display:flex;gap:8px;flex-shrink:0}@media(max-width:600px){.card-studio__navigation{padding:10px;gap:0}.card-studio__navigation button{padding:9px 10px}.card-studio fieldset{padding:14px}.card-studio__choices{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.card-studio__choices button{padding:8px;font-size:11px}.card-studio__option-name{flex-wrap:wrap}.card-studio__footer{flex-direction:column;align-items:stretch;padding:14px}.card-studio__actions>.btn{flex:1}.card-studio__preview-label{font-size:10px;bottom:8px;right:8px}.card-studio__preview{margin:18px auto}}@media(prefers-reduced-motion:reduce){.card-studio__choices button{transition:none}}
</style>
