<template>
  <div>
    <div class="page-header">
      <div><div class="page-title">Purchase Requests</div><div class="page-subtitle">Optional step before Pembelian</div></div>
      <button class="btn btn-primary" v-if="auth.can('purchase.create')" @click="openCreate">+ New Request</button>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap"><span class="search-icon">🔍</span><input class="form-control" v-model="search" placeholder="Search number..." @input="debouncedFetch" /></div>
        <select class="form-control" style="width:160px" v-model="statusFilter" @change="fetchItems">
          <option value="">Semua Status</option><option>DRAFT</option><option>APPROVED</option><option>REJECTED</option>
        </select>
      </div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Request #</th><th>Tanggal</th><th>Status</th><th>Keterangan</th><th v-if="auth.can('purchase.approve')">Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 4" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📝</div><h3>No purchase requests found</h3><p>Create your first purchase request.</p><button class="btn btn-primary" v-if="auth.can('purchase.create')" @click="openCreate">Create Request</button></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id" @click="openDetail(item)" style="cursor:pointer">
            <td class="fw-600">{{ item.request_number }}</td><td>{{ item.date }}</td>
            <td><StatusBadge :status="item.status" /></td>
            <td class="text-muted">{{ item.description||'-' }}</td>
            <td v-if="auth.can('purchase.approve')"><div class="action-btns" @click.stop>
              <button class="btn btn-sm btn-primary" v-if="item.status==='DRAFT'" @click="updateStatus(item.id,'APPROVED')">✅ Setujui</button>
              <button class="btn btn-sm btn-danger" v-if="item.status==='DRAFT'" @click="updateStatus(item.id,'REJECTED')">❌ Reject</button>
            </div></td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>

    <!-- Create Form -->
    <BaseModal v-if="showForm" title="Tambah Permintaan Pembelian" size="lg" @close="showForm=false">
      <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="date" v-model="form.date" required /></div>
      <div class="form-group"><label class="form-label">Keterangan</label><textarea class="form-control" v-model="form.description"></textarea></div>
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><label class="form-label" style="margin:0">Item</label><button type="button" class="btn btn-sm btn-secondary" @click="addItem">+ Tambah Item</button></div>
        <table class="detail-table" style="table-layout:fixed;width:100%"><thead><tr><th style="width:45%">Bahan Baku</th><th style="width:90px">Qty</th><th>Note</th><th style="width:48px"></th></tr></thead>
          <tbody>
            <tr v-for="(d,i) in form.details" :key="i">
              <td><RawMaterialSearchSelect v-model="d.raw_material_id" /></td>
              <td><input class="form-control" type="number" v-model="d.qty" min="0.01" step="0.01" /></td>
              <td><input class="form-control" v-model="d.note" /></td>
              <td><button type="button" class="btn btn-sm btn-danger" @click="removeItem(i)">✕</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Submit</span></button></template>
    </BaseModal>

    <!-- Detail Modal -->
    <BaseModal v-if="showDetail && selectedItem" :title="`Request: ${selectedItem.request_number}`" size="lg" @close="showDetail=false">
      <div class="detail-info-grid" style="margin-bottom:16px">
        <div class="detail-info-item"><label>Status</label><p><StatusBadge :status="selectedItem.status" /></p></div>
        <div class="detail-info-item"><label>Tanggal</label><p>{{ selectedItem.date }}</p></div>
        <div class="detail-info-item"><label>Dibuat Oleh</label><p>{{ selectedItem.creator?.name }}</p></div>
        <div class="detail-info-item"><label>Keterangan</label><p>{{ selectedItem.description||'-' }}</p></div>
      </div>
      <table class="detail-table"><thead><tr><th>Bahan Baku</th><th>Qty</th><th>Note</th></tr></thead>
        <tbody><tr v-for="d in selectedItem.details" :key="d.id"><td>{{ d.rawMaterial?.name||d.raw_material_id }}</td><td>{{ d.qty }}</td><td>{{ d.note||'-' }}</td></tr></tbody>
      </table>
    </BaseModal>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'; import StatusBadge from '@/components/StatusBadge.vue'
import RawMaterialSearchSelect from '@/components/RawMaterialSearchSelect.vue'
import api from '@/services/api'
const auth=useAuthStore();const toast=useToastStore()
const items=ref([]);const total=ref(0);const page=ref(1);const search=ref('');const statusFilter=ref('')
const loading=ref(false);const showForm=ref(false);const saving=ref(false);const showDetail=ref(false);const selectedItem=ref(null)

const form=ref({date:'',description:'',details:[{raw_material_id:'',qty:1,note:''}]})
let dt;const debouncedFetch=()=>{clearTimeout(dt);dt=setTimeout(()=>{page.value=1;fetchItems()},300)}
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/purchase/requests',{params:{page:page.value,limit:15,search:search.value,status:statusFilter.value}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}
const openCreate=()=>{form.value={date:new Date().toISOString().split('T')[0],description:'',details:[{raw_material_id:'',qty:1,note:''}]};showForm.value=true}
const openDetail=async item=>{try{const r=await api.get(`/purchase/requests/${item.id}`);selectedItem.value=r.data.data;showDetail.value=true}catch(e){toast.error('Terjadi kesalahan')}}
const addItem=()=>form.value.details.push({raw_material_id:'',qty:1,note:''})
const removeItem=i=>form.value.details.splice(i,1)
const save=async()=>{if(!form.value.details.length)return toast.warning('Tambahkan minimal satu item');saving.value=true;try{await api.post('/purchase/requests',form.value);toast.success('Permintaan berhasil ditambahkan');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
const updateStatus=async(id,status)=>{try{await api.patch(`/purchase/requests/${id}/status`,{status});toast.success(`Request ${status}`);fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}}
onMounted(()=>{fetchItems()})
</script>
