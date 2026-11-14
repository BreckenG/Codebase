const emptyNotifications=()=>({userId:null,items:[],unread:0,loaded:false,loading:false,error:""});
export function useNotifications(){
const state=useState("notifications",emptyNotifications),{me}=useMe(),nuxt=useNuxtApp();
async function refresh(){
const userId=me.value.user?.id;
if(!userId){state.value=emptyNotifications();return}
if(state.value.userId!==userId)state.value={...emptyNotifications(),userId};
if(nuxt._notificationsRequest?.userId===userId)return nuxt._notificationsRequest.promise;
const seq=nuxt._notificationSeq=(nuxt._notificationSeq||0)+1;
state.value.loading=true;
const promise=(async()=>{try{const data=await apiGet("/api/me/notifications");if(me.value.user?.id===userId&&nuxt._notificationSeq===seq)state.value={userId,items:data.items||[],unread:data.unread||0,loaded:true,loading:false,error:""}}catch(e){if(me.value.user?.id===userId&&nuxt._notificationSeq===seq){state.value.loading=false;state.value.error=e?.data?.statusMessage||"Could not load notifications."}}finally{if(nuxt._notificationsRequest?.seq===seq)nuxt._notificationsRequest=null}})();
nuxt._notificationsRequest={userId,promise,seq};
return promise;
}
async function markRead(ids){await apiPost("/api/me/notifications",ids?{ids}:{all:true});nuxt._notificationsRequest=null;await refresh()}
const unread=computed(()=>state.value.userId===me.value.user?.id?state.value.unread:0);
return{state,unread,refresh,markRead};
}
