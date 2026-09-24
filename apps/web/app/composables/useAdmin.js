export function useAdmin(){
const admin=useState('admin-access',()=>false);
const{me}=useMe();
async function check(){
if(!me.value.user){admin.value=false;return;}
try{const result=await apiFetch('/api/admin/access');admin.value=result.admin===true;}catch{admin.value=false;}
}
return{admin,check};
}
