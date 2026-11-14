export function useAdmin(){
const admin=useState('admin-access',()=>false);
const areas=useState('admin-areas',()=>[]);
const{me}=useMe();
async function check(){
if(!me.value.user){admin.value=false;areas.value=[];return;}
try{const result=await apiFetch('/api/admin/access');admin.value=result.admin===true;areas.value=result.areas||[];}catch(e){if([401,403].includes(Number(e?.statusCode||e?.status||e?.data?.statusCode))){admin.value=false;areas.value=[];}}
}
return{admin,areas,check};
}
