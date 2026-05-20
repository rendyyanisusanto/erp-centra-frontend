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
          <option value="">Semua Status</option><option>DRAFT</option><option>APPROVED</option><option>CANCELLED</option>
        </select>
      </div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Request #</th><th>Tanggal</th><th>Status</th><th>Process</th><th>Keterangan</th><th v-if="auth.can('purchase.approve') || auth.can('purchase.create')">Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 6" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">📝</div><h3>No purchase requests found</h3><p>Create your first purchase request.</p><button class="btn btn-primary" v-if="auth.can('purchase.create')" @click="openCreate">Create Request</button></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id" @click="openDetail(item)" style="cursor:pointer">
            <td class="fw-600">{{ item.request_number }}</td><td>{{ item.date }}</td>
            <td><StatusBadge :status="item.status" /></td>
            <td><span class="badge" :class="processBadgeClass(item.process_status)">{{ processStatusLabel(item.process_status) }}</span></td>
            <td class="text-muted">{{ item.description||'-' }}</td>
            <td v-if="auth.can('purchase.approve') || auth.can('purchase.create')"><div class="action-btns" @click.stop>
              <button class="btn btn-sm btn-primary" v-if="item.status==='DRAFT'" @click="updateStatus(item.id,'APPROVED')">✅ Setujui</button>
              <button class="btn btn-sm btn-secondary" v-if="item.status==='APPROVED' && item.process_status!=='CONVERTED' && auth.can('purchase.create')" @click="openConvert(item)">{{ item.process_status==='PARTIAL' ? 'Buat Sisa PO' : 'Buat PO' }}</button>
              <button class="btn btn-sm btn-success" v-if="item.process_status==='CONVERTED'">PO Sudah Dibuat</button>
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
        <table class="detail-table" style="table-layout:fixed;width:100%"><thead><tr><th style="width:26%">Bahan Baku</th><th style="width:90px">Qty</th><th style="width:23%">Satuan</th><th style="width:110px">Base Qty</th><th style="width:28%">Note</th><th style="width:48px"></th></tr></thead>
          <tbody>
            <tr v-for="(d,i) in form.details" :key="i">
              <td><RawMaterialSearchSelect v-model="d.raw_material_id" /></td>
              <td><input class="form-control" type="number" v-model="d.qty" min="0.01" step="0.01" /></td>
              <td><ItemUnitSelect item-type="RAW_MATERIAL" :item-id="d.raw_material_id" v-model="d.unit_id" @conversion-change="(c)=>onConversionChange(d,c)" /></td>
              <td>{{ Number((Number(d.qty||0) * Number(d.conversion_qty||1)) || 0).toLocaleString('id-ID') }}</td>
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
        <div class="detail-info-item"><label>Process Status</label><p><span class="badge" :class="processBadgeClass(selectedItem.process_status)">{{ processStatusLabel(selectedItem.process_status) }}</span></p></div>
        <div class="detail-info-item"><label>Tanggal</label><p>{{ selectedItem.date }}</p></div>
        <div class="detail-info-item"><label>Dibuat Oleh</label><p>{{ selectedItem.creator?.name }}</p></div>
        <div class="detail-info-item"><label>Keterangan</label><p>{{ selectedItem.description||'-' }}</p></div>
      </div>
      <table class="detail-table"><thead><tr><th>Bahan Baku</th><th>Qty Request</th><th>Qty Sudah Dibuat PO</th><th>Sisa Qty</th><th>Base Qty</th><th>Note</th></tr></thead>
        <tbody><tr v-for="d in selectedItem.details" :key="d.id"><td>{{ d.rawMaterial?.name||d.raw_material_id }}</td><td>{{ d.qty }} {{ d.unit?.name || '' }}</td><td>{{ Number(d.po_qty||0) }} {{ d.unit?.name || '' }}</td><td>{{ Number(d.qty||0)-Number(d.po_qty||0) }} {{ d.unit?.name || '' }}</td><td>{{ d.base_qty || d.qty }}</td><td>{{ d.note||'-' }}</td></tr></tbody>
      </table>
      <template #footer>
        <button class="btn btn-secondary" @click="showDetail=false">Tutup</button>
        <button class="btn btn-primary" v-if="selectedItem.status==='APPROVED' && selectedItem.process_status!=='CONVERTED' && auth.can('purchase.create')" @click="openConvert(selectedItem)">{{ selectedItem.process_status==='PARTIAL' ? 'Buat Sisa PO' : 'Buat PO' }}</button>
      </template>
    </BaseModal>

    <BaseModal v-if="showConvertForm" :title="`Convert Request: ${convertTarget?.request_number || ''}`" size="xl" @close="showConvertForm=false">
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Supplier</label><SupplierSearchSelect v-model="convertForm.supplier_id" /></div>
        <div class="form-group"><label class="form-label required">Tanggal PO</label><input class="form-control" type="date" v-model="convertForm.date" /></div>
      </div>
      <div class="form-group"><label class="form-label">Keterangan</label><input class="form-control" v-model="convertForm.description" /></div>
      <table class="detail-table"><thead><tr><th style="width:28px"></th><th>Bahan Baku</th><th>Qty Request</th><th>Qty Sudah PO</th><th>Sisa</th><th>Qty PO</th><th>Harga</th></tr></thead>
        <tbody>
          <tr v-for="d in convertForm.items" :key="d.purchase_request_detail_id">
            <td><input type="checkbox" v-model="d.selected" /></td>
            <td>{{ d.raw_material_name }}</td>
            <td>{{ d.qty }} {{ d.unit_name }}</td>
            <td>{{ d.po_qty }} {{ d.unit_name }}</td>
            <td>{{ d.remaining_qty }} {{ d.unit_name }}</td>
            <td><input class="form-control" type="number" min="0" :max="d.remaining_qty" step="0.01" v-model="d.convert_qty" :disabled="!d.selected" /></td>
            <td><input class="form-control" type="number" min="0" step="0.01" v-model="d.price" :disabled="!d.selected" /></td>
          </tr>
        </tbody>
      </table>
      <template #footer>
        <button class="btn btn-secondary" @click="showConvertForm=false">Batal</button>
        <button class="btn btn-primary" :disabled="converting" @click="submitConvert"><span v-if="converting" class="spinner"></span><span v-else>Buat PO</span></button>
      </template>
    </BaseModal>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'; import StatusBadge from '@/components/StatusBadge.vue'
import RawMaterialSearchSelect from '@/components/RawMaterialSearchSelect.vue'
import SupplierSearchSelect from '@/components/SupplierSearchSelect.vue'
import ItemUnitSelect from '@/components/ItemUnitSelect.vue'
import api from '@/services/api'
const auth=useAuthStore();const toast=useToastStore()
const items=ref([]);const total=ref(0);const page=ref(1);const search=ref('');const statusFilter=ref('')
const loading=ref(false);const showForm=ref(false);const saving=ref(false);const showDetail=ref(false);const selectedItem=ref(null)
const showConvertForm=ref(false);const converting=ref(false);const convertTarget=ref(null)
const convertForm=ref({supplier_id:'',date:'',description:'',items:[]})

const form=ref({date:'',description:'',details:[{raw_material_id:'',qty:1,unit_id:'',conversion_qty:1,note:''}]})
let dt;const debouncedFetch=()=>{clearTimeout(dt);dt=setTimeout(()=>{page.value=1;fetchItems()},300)}
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/purchase/requests',{params:{page:page.value,limit:15,search:search.value,status:statusFilter.value}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}
const openCreate=()=>{form.value={date:new Date().toISOString().split('T')[0],description:'',details:[{raw_material_id:'',qty:1,unit_id:'',conversion_qty:1,note:''}]};showForm.value=true}
const openDetail=async item=>{try{const r=await api.get(`/purchase/requests/${item.id}`);selectedItem.value=r.data.data;showDetail.value=true}catch(e){toast.error('Terjadi kesalahan')}}
const processStatusLabel=s=>({PENDING:'Belum Dibuat PO',PARTIAL:'Sebagian Dibuat PO',CONVERTED:'Sudah Dibuat PO'}[s]||s||'-')
const processBadgeClass=s=>({PENDING:'badge-warning',PARTIAL:'badge-info',CONVERTED:'badge-success'}[s]||'badge-gray')
const onConversionChange=(row, c)=>{ row.conversion_qty = Number(c?.conversion_qty || 1) }
const addItem=()=>form.value.details.push({raw_material_id:'',qty:1,unit_id:'',conversion_qty:1,note:''})
const removeItem=i=>form.value.details.splice(i,1)
const save=async()=>{if(!form.value.details.length)return toast.warning('Tambahkan minimal satu item');saving.value=true;try{await api.post('/purchase/requests',form.value);toast.success('Permintaan berhasil ditambahkan');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
const updateStatus=async(id,status)=>{try{await api.patch(`/purchase/requests/${id}/status`,{status});toast.success(`Request ${status}`);fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}}
const openConvert=async(item)=>{try{const r=await api.get(`/purchase/requests/${item.id}`);const data=r.data.data;convertTarget.value=data;convertForm.value={supplier_id:'',date:new Date().toISOString().split('T')[0],description:`Convert dari ${data.request_number}`,items:(data.details||[]).map(d=>{const qty=Number(d.qty||0);const poQty=Number(d.po_qty||0);const remaining=Math.max(qty-poQty,0);return{purchase_request_detail_id:d.id,raw_material_name:d.rawMaterial?.name||`#${d.raw_material_id}`,qty,po_qty:poQty,remaining_qty:remaining,unit_name:d.unit?.name||'',convert_qty:remaining,price:0,selected:remaining>0}}).filter(d=>d.remaining_qty>0)};showConvertForm.value=true}catch(e){toast.error(e.response?.data?.message||'Gagal memuat request')}}
const submitConvert=async()=>{const selected=convertForm.value.items.filter(i=>i.selected);if(!convertForm.value.supplier_id)return toast.warning('Supplier wajib dipilih');if(!selected.length)return toast.warning('Pilih minimal 1 item');for(const i of selected){if(!(Number(i.convert_qty)>0))return toast.warning(`Qty PO item ${i.raw_material_name} harus > 0`);if(Number(i.convert_qty)>Number(i.remaining_qty))return toast.warning(`Qty PO item ${i.raw_material_name} melebihi sisa qty`) } converting.value=true;try{await api.post(`/purchase/requests/${convertTarget.value.id}/convert-to-purchase`,{supplier_id:convertForm.value.supplier_id,date:convertForm.value.date,description:convertForm.value.description,selected_items:selected.map(i=>({purchase_request_detail_id:i.purchase_request_detail_id,qty:Number(i.convert_qty),price:Number(i.price||0)}))});toast.success('PO berhasil dibuat dari purchase request');showConvertForm.value=false;showDetail.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Gagal convert ke PO')}finally{converting.value=false}}
onMounted(()=>{fetchItems()})
</script>
