<template>
  <div>
    <div class="page-header">
      <div><div class="page-title">Customers</div></div>
      <button class="btn btn-primary" v-if="auth.can('customer.create')" @click="openCreate">+ Tambah Pelanggan</button>
    </div>
    <div class="card">
      <div class="card-header"><div class="search-input-wrap"><span class="search-icon">🔍</span><input class="form-control" v-model="search" placeholder="Cari..." @input="debouncedFetch" /></div></div>
      <div class="table-wrapper"><table>
        <thead><tr><th>#</th><th>Nama</th><th>No. HP</th><th>Alamat</th><th v-if="auth.can('customer.create')">Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 4" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">👥</div><h3>No customers found</h3></div></td></tr></template>
          <tr v-else v-for="(item,i) in items" :key="item.id">
            <td class="text-muted">{{ (page-1)*15+i+1 }}</td><td class="fw-600">{{ item.name }}</td><td>{{ item.phone||'-' }}</td><td class="text-muted">{{ item.address||'-' }}</td>
            <td v-if="auth.can('customer.create')"><div class="action-btns"><button class="btn btn-sm btn-secondary" @click="openEdit(item)">✏️</button><button class="btn btn-sm btn-danger" @click="openDelete(item)">🗑️</button></div></td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>
    <BaseModal v-if="showForm" :title="editing?'Edit Pelanggan':'Tambah Pelanggan'" @close="showForm=false">
      <div class="form-group"><label class="form-label required">Nama</label><input class="form-control" v-model="form.name" required /></div>
      <div class="form-group"><label class="form-label">No. HP</label><input class="form-control" v-model="form.phone" /></div>
      <div class="form-group"><label class="form-label">Alamat</label><textarea class="form-control" v-model="form.address"></textarea></div>
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
const items=ref([]);const total=ref(0);const page=ref(1);const search=ref('')
const loading=ref(false);const showForm=ref(false);const saving=ref(false);const editing=ref(null)
const form=ref({name:'',phone:'',address:''});const showDeleteConfirm=ref(false);const deleteTarget=ref(null);const deleting=ref(false)
let dt;const debouncedFetch=()=>{clearTimeout(dt);dt=setTimeout(()=>{page.value=1;fetchItems()},300)}
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/master/customers',{params:{page:page.value,limit:15,search:search.value}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}
const openCreate=()=>{editing.value=null;form.value={name:'',phone:'',address:''};showForm.value=true}
const openEdit=item=>{editing.value=item;form.value={name:item.name,phone:item.phone||'',address:item.address||''};showForm.value=true}
const openDelete=item=>{deleteTarget.value=item;showDeleteConfirm.value=true}
const save=async()=>{saving.value=true;try{if(editing.value)await api.put(`/master/customers/${editing.value.id}`,form.value);else await api.post('/master/customers',form.value);toast.success('Data berhasil disimpan');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
const doDelete=async()=>{deleting.value=true;try{await api.delete(`/master/customers/${deleteTarget.value.id}`);toast.success('Data berhasil dihapus');showDeleteConfirm.value=false;fetchItems()}catch(e){toast.error('Terjadi kesalahan')}finally{deleting.value=false}}
onMounted(fetchItems)
</script>
