<template>
  <div>
    <div class="page-header"><div><div class="page-title">Units of Measure</div></div><button class="btn btn-primary" v-if="auth.can('unit.create')" @click="openCreate">+ Tambah Satuan</button></div>
    <div class="card">
      <div class="table-wrapper"><table>
        <thead><tr><th>#</th><th>Nama</th><th v-if="auth.can('unit.create')">Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 2" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="3"><div class="empty-state"><div class="empty-state-icon">📏</div><h3>No units found</h3></div></td></tr></template>
          <tr v-else v-for="(item,i) in items" :key="item.id"><td class="text-muted">{{ i+1 }}</td><td class="fw-600">{{ item.name }}</td><td v-if="auth.can('unit.create')"><div class="action-btns"><button class="btn btn-sm btn-secondary" @click="openEdit(item)">✏️</button><button class="btn btn-sm btn-danger" @click="openDelete(item)">🗑️</button></div></td></tr>
        </tbody>
      </table></div>
    </div>
    <BaseModal v-if="showForm" :title="editing?'Edit Satuan':'Tambah Satuan'" @close="showForm=false">
      <div class="form-group"><label class="form-label required">Nama</label><input class="form-control" v-model="form.name" required /></div>
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
const items=ref([]);const loading=ref(false);const showForm=ref(false);const saving=ref(false);const editing=ref(null)
const form=ref({name:''});const showDeleteConfirm=ref(false);const deleteTarget=ref(null);const deleting=ref(false)
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/master/units',{params:{limit:200}});items.value=r.data.data.data}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const openCreate=()=>{editing.value=null;form.value={name:''};showForm.value=true}
const openEdit=item=>{editing.value=item;form.value={name:item.name};showForm.value=true}
const openDelete=item=>{deleteTarget.value=item;showDeleteConfirm.value=true}
const save=async()=>{saving.value=true;try{if(editing.value)await api.put(`/master/units/${editing.value.id}`,form.value);else await api.post('/master/units',form.value);toast.success('Data berhasil disimpan');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
const doDelete=async()=>{deleting.value=true;try{await api.delete(`/master/units/${deleteTarget.value.id}`);toast.success('Data berhasil dihapus');showDeleteConfirm.value=false;fetchItems()}catch(e){toast.error('Terjadi kesalahan')}finally{deleting.value=false}}
onMounted(fetchItems)
</script>
