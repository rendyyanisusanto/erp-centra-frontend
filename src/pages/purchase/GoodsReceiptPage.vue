<template>
  <div>
    <div class="page-header"><div><div class="page-title">Penerimaan Barang</div><div class="page-subtitle">Terima barang dan perbarui persediaan</div></div><button class="btn btn-primary" v-if="auth.can('goods-receipt.create')" @click="openCreate">+ Terima Barang</button></div>
    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap"><span class="search-icon">🔍</span><input class="form-control" v-model="search" placeholder="Cari nomor penerimaan, pembelian, atau supplier..." @input="debouncedFetch" /></div>
        <input class="form-control" type="date" v-model="dateDari" @change="fetchItems" style="width:150px" />
        <input class="form-control" type="date" v-model="dateSampai" @change="fetchItems" style="width:150px" />
      </div>
      <div class="table-wrapper"><table>
        <thead><tr><th>No. Penerimaan</th><th>Pembelian</th><th>Supplier</th><th>Tanggal</th><th>No. Polisi</th><th>Total</th><th>Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 6" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">📥</div><h3>No goods receipts found</h3></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id">
            <td class="fw-600">{{ item.receipt_number }}</td><td>PO #{{ item.purchase?.id }}</td><td>{{ item.purchase?.supplier?.name }}</td><td>{{ item.date }}</td><td>{{ item.license_plate }}</td><td>{{ fmt(item.total_amount) }}</td>
            <td><button class="btn btn-sm btn-secondary" @click="openDetail(item)">👁 Detail</button></td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>

    <!-- Create Modal -->
    <BaseModal v-if="showForm" title="Terima Barang" size="xl" @close="showForm=false">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label required">Pembelian</label>
          <POSearchSelect v-model="form.purchase_id" @po-selected="onPOSelected" />
        </div>
        <div class="form-group">
          <div style="display:flex;gap:12px;">
            <div style="flex:1"><label class="form-label required">Tanggal</label><input class="form-control" type="date" v-model="form.date" required /></div>
            <div style="flex:1"><label class="form-label">No. Polisi</label><input class="form-control" type="text" v-model="form.license_plate" placeholder="e.g. B 1234 ABC" /></div>
          </div>
        </div>
      </div>

      <!-- PO summary info -->
      <div v-if="selectedPOInfo" class="po-info-bar">
        <span>🏭 <strong>{{ selectedPOInfo.supplier?.name }}</strong></span>
        <span>📅 {{ selectedPOInfo.date }}</span>
        <span>📦 {{ selectedPOInfo.details?.length || 0 }} item(s)</span>
        <span class="po-info-total">Total PO: {{ fmt(selectedPOInfo.total_amount) }}</span>
      </div>

      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label class="form-label" style="margin:0">Item Diterima</label>
          <button type="button" class="btn btn-sm btn-secondary" @click="addItem">+ Tambah Item</button>
        </div>
        <table class="detail-table" style="table-layout:fixed;width:100%">
          <thead><tr><th style="width:40%">Bahan Baku</th><th style="width:100px">Qty Ordered</th><th style="width:100px">Qty Diterima</th><th style="width:130px">Harga</th><th style="width:48px"></th></tr></thead>
          <tbody>
            <tr v-for="(d,i) in form.details" :key="i">
              <td><RawMaterialSearchSelect v-model="d.raw_material_id" /></td>
              <td><input class="form-control" type="number" :value="d.qty_ordered" readonly style="background:#f8fafc;color:#64748b" /></td>
              <td><input class="form-control" type="number" v-model="d.qty_received" min="0.01" step="0.01" /></td>
              <td><input class="form-control" type="number" v-model="d.price" min="0" /></td>
              <td><button type="button" class="btn btn-sm btn-danger" @click="removeItem(i)">✕</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Simpan</span></button></template>
    </BaseModal>

    <!-- Detail Modal -->
    <BaseModal v-if="showDetail && selectedItem" :title="`GR: ${selectedItem.receipt_number}`" size="lg" @close="showDetail=false">
      <div class="detail-info-grid" style="margin-bottom:16px">
        <div class="detail-info-item"><label>Tanggal</label><p>{{ selectedItem.date }}</p></div>
        <div class="detail-info-item"><label>PO#</label><p>{{ selectedItem.purchase?.id }}</p></div>
        <div class="detail-info-item"><label>Supplier</label><p>{{ selectedItem.purchase?.supplier?.name }}</p></div>
        <div class="detail-info-item"><label>No. Polisi</label><p>{{ selectedItem.license_plate || '-' }}</p></div>
        <div class="detail-info-item"><label>Total</label><p class="fw-700">{{ fmt(selectedItem.total_amount) }}</p></div>
      </div>
      <table class="detail-table"><thead><tr><th>Bahan Baku</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
        <tbody><tr v-for="d in selectedItem.details" :key="d.id"><td>{{ d.rawMaterial?.name }}</td><td>{{ d.qty_received }}</td><td>{{ fmt(d.price) }}</td><td>{{ fmt(d.subtotal) }}</td></tr></tbody>
      </table>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'
import POSearchSelect from '@/components/POSearchSelect.vue'
import RawMaterialSearchSelect from '@/components/RawMaterialSearchSelect.vue'
import api from '@/services/api'

const auth=useAuthStore();const toast=useToastStore()
const items=ref([]);const total=ref(0);const page=ref(1);const search=ref('');const dateDari=ref('');const dateSampai=ref('')
const loading=ref(false);const showForm=ref(false);const saving=ref(false);const showDetail=ref(false);const selectedItem=ref(null)
const selectedPOInfo=ref(null)
const form=ref({purchase_id:'',date:'',details:[{raw_material_id:'',qty_ordered:0,qty_received:1,price:0}]})
const fmt=n=>'Rp '+Number(n||0).toLocaleString('id-ID')
let dt;const debouncedFetch=()=>{clearTimeout(dt);dt=setTimeout(()=>{page.value=1;fetchItems()},300)}

const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/purchase/goods-receipts/list',{params:{page:page.value,limit:15,search:search.value,date_from:dateDari.value,date_to:dateSampai.value}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}

const openCreate=()=>{
  selectedPOInfo.value=null
  form.value={purchase_id:'',date:new Date().toISOString().split('T')[0],license_plate:'',details:[{raw_material_id:'',qty_ordered:0,qty_received:1,price:0}]}
  showForm.value=true
}

// Auto-fill items when PO is selected
const onPOSelected=(po)=>{
  selectedPOInfo.value=po
  if(po.details && po.details.length){
    form.value.details=po.details.map(d=>({
      raw_material_id: d.item_id,
      qty_ordered: Number(d.qty)||0,
      qty_received: Number(d.qty)||0,
      price: Number(d.price)||0,
    }))
  }
}

const openDetail=async item=>{try{const r=await api.get(`/purchase/goods-receipts/${item.id}`);selectedItem.value=r.data.data;showDetail.value=true}catch(e){toast.error('Terjadi kesalahan')}}
const addItem=()=>form.value.details.push({raw_material_id:'',qty_ordered:0,qty_received:1,price:0})
const removeItem=i=>form.value.details.splice(i,1)
const save=async()=>{saving.value=true;try{await api.post('/purchase/goods-receipts',form.value);toast.success('Penerimaan barang berhasil disimpan. Stok diperbarui.');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
onMounted(()=>{fetchItems()})
</script>

<style>
.po-info-bar {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;
  padding: 8px 14px; margin-bottom: 12px; font-size: 13px; color: #0369a1;
}
.po-info-total { margin-left: auto; font-weight: 700; color: #1e293b; }
</style>
