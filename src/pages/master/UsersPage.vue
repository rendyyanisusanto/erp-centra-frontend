<template>
  <div>
    <div class="page-header"><div><div class="page-title">Users</div></div><button class="btn btn-primary" v-if="auth.can('user.create')" @click="openCreate">+ Tambah Pengguna</button></div>
    <div class="card">
      <div class="card-header"><div class="search-input-wrap"><span class="search-icon">🔍</span><input class="form-control" v-model="search" placeholder="Cari..." @input="debouncedFetch" /></div></div>
      <div class="table-wrapper"><table>
        <thead><tr><th>#</th><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th v-if="auth.can('user.create')">Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 5" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">👤</div><h3>No users found</h3></div></td></tr></template>
          <tr v-else v-for="(item,i) in items" :key="item.id">
            <td class="text-muted">{{ (page-1)*15+i+1 }}</td><td class="fw-600">{{ item.name }}</td><td>{{ item.email }}</td><td>{{ item.role?.name||'-' }}</td>
            <td><span class="badge" :class="item.is_active?'badge-success':'badge-gray'">{{ item.is_active?'Active':'Inactive' }}</span></td>
            <td v-if="auth.can('user.create')"><div class="action-btns"><button class="btn btn-sm btn-secondary" @click="openEdit(item)">✏️</button><button class="btn btn-sm btn-danger" @click="openDelete(item)">🗑️</button></div></td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>
    <BaseModal v-if="showForm" :title="editing?'Edit Pengguna':'Tambah Pengguna'" @close="showForm=false">
      <div class="form-group"><label class="form-label required">Nama</label><input class="form-control" v-model="form.name" required /></div>
      <div class="form-group"><label class="form-label required">Email</label><input class="form-control" type="email" v-model="form.email" required /></div>
      <div class="form-group"><label class="form-label" :class="editing?'':'required'">Password{{ editing?' (leave blank to keep)':'' }}</label><input class="form-control" type="password" v-model="form.password" :required="!editing" /></div>
      <div class="form-group"><label class="form-label">Role</label><select class="form-control" v-model="form.role_id"><option value="">-- No Role --</option><option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option></select></div>
      <div class="form-group" v-if="editing"><label class="form-label">Status</label><select class="form-control" v-model="form.is_active"><option :value="true">Active</option><option :value="false">Inactive</option></select></div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Simpan</span></button></template>
    </BaseModal>
    <ConfirmDialog v-if="showDeleteConfirm" :loading="deleting" @confirm="doDelete" @cancel="showDeleteConfirm=false" />
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'; import ConfirmDialog from '@/components/ConfirmDialog.vue'; import api from '@/services/api'
const auth=useAuthStore();const toast=useToastStore()
const items=ref([]);const total=ref(0);const page=ref(1);const search=ref('');const roles=ref([])
const loading=ref(false);const showForm=ref(false);const saving=ref(false);const editing=ref(null)
const form=ref({name:'',email:'',password:'',role_id:'',is_active:true});const showDeleteConfirm=ref(false);const deleteTarget=ref(null);const deleting=ref(false)
let dt;const debouncedFetch=()=>{clearTimeout(dt);dt=setTimeout(()=>{page.value=1;fetchItems()},300)}
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/master/users',{params:{page:page.value,limit:15,search:search.value}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}
const openCreate=()=>{editing.value=null;form.value={name:'',email:'',password:'',role_id:'',is_active:true};showForm.value=true}
const openEdit=item=>{editing.value=item;form.value={name:item.name,email:item.email,password:'',role_id:item.role_id||'',is_active:item.is_active};showForm.value=true}
const openDelete=item=>{deleteTarget.value=item;showDeleteConfirm.value=true}
const save=async()=>{saving.value=true;try{const payload={...form.value};if(!payload.password)delete payload.password;if(editing.value)await api.put(`/master/users/${editing.value.id}`,payload);else await api.post('/master/users',payload);toast.success('Data berhasil disimpan');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
const doDelete=async()=>{deleting.value=true;try{await api.delete(`/master/users/${deleteTarget.value.id}`);toast.success('Data berhasil dihapus');showDeleteConfirm.value=false;fetchItems()}catch(e){toast.error('Terjadi kesalahan')}finally{deleting.value=false}}
onMounted(async()=>{const r=await api.get('/master/roles',{params:{limit:100}});roles.value=r.data.data?.data||[];fetchItems()})
</script>
