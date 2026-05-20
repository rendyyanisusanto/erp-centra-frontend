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
        <thead><tr><th>No. Penerimaan</th><th>Pembelian</th><th>Supplier</th><th>Tanggal</th><th>Status</th><th>No. Polisi</th><th>Total</th><th>Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 8" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">📥</div><h3>No goods receipts found</h3></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id">
            <td class="fw-600">{{ item.receipt_number }}</td><td>PO #{{ item.purchase?.id }}</td><td>{{ item.purchase?.supplier?.name }}</td><td>{{ item.date }}</td><td><StatusBadge :status="item.status" /></td><td>{{ item.license_plate }}</td><td>{{ fmt(item.total_amount) }}</td>
            <td>
              <div class="action-btns">
                <button class="btn btn-sm btn-secondary" @click="openDetail(item)">👁 Detail</button>
                <button class="btn btn-sm btn-warning" v-if="item.status==='DRAFT' && auth.can('goods-receipt.create')" @click="openEdit(item)">Edit</button>
                <button class="btn btn-sm btn-danger" v-if="item.status==='DRAFT' && auth.can('goods-receipt.create')" @click="removeItemData(item)">Hapus</button>
                <button class="btn btn-sm btn-primary" v-if="item.status==='DRAFT' && auth.can('goods-receipt.create')" @click="approveItem(item)">Setujui</button>
                <button class="btn btn-sm btn-secondary" v-if="item.status==='APPROVED' && auth.can('goods-receipt.create')" @click="cancelItem(item)">Batalkan</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>

    <!-- Create Modal -->
    <BaseModal v-if="showForm" :title="editingId ? 'Edit Penerimaan Barang' : 'Terima Barang'" size="xl" @close="showForm=false">
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
          <thead><tr><th style="width:25%">Bahan Baku</th><th style="width:85px">Qty PO</th><th style="width:85px">Sudah</th><th style="width:85px">Sisa</th><th style="width:90px">Qty Diterima</th><th style="width:18%">Satuan</th><th style="width:100px">Base Qty</th><th style="width:120px">Harga</th><th style="width:48px"></th></tr></thead>
          <tbody>
            <tr v-for="(d,i) in form.details" :key="i">
              <td><RawMaterialSearchSelect v-model="d.raw_material_id" /></td>
              <td><input class="form-control" type="number" :value="d.qty_ordered" readonly style="background:#f8fafc;color:#64748b" /></td>
              <td><input class="form-control" type="number" :value="d.qty_already_received||0" readonly style="background:#f8fafc;color:#64748b" /></td>
              <td><input class="form-control" type="number" :value="d.qty_remaining||0" readonly style="background:#f8fafc;color:#64748b" /></td>
              <td><input class="form-control" type="number" v-model="d.qty_received" min="0.01" step="0.01" /></td>
              <td><ItemUnitSelect item-type="RAW_MATERIAL" :item-id="d.raw_material_id" v-model="d.unit_id" @conversion-change="(c)=>onConversionChange(d,c)" /></td>
              <td class="text-right">{{ Number((Number(d.qty_received||0)*Number(d.conversion_qty||1))||0).toLocaleString('id-ID') }}</td>
              <td><input class="form-control" type="number" v-model="d.price" min="0" /></td>
              <td><button type="button" class="btn btn-sm btn-danger" @click="removeItem(i)">✕</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>{{ editingId ? 'Update' : 'Simpan Draft' }}</span></button></template>
    </BaseModal>

    <!-- Detail Modal -->
    <BaseModal v-if="showDetail && selectedItem" :title="`GR: ${selectedItem.receipt_number}`" size="lg" @close="showDetail=false">
      <div class="detail-info-grid" style="margin-bottom:16px">
        <div class="detail-info-item"><label>Tanggal</label><p>{{ selectedItem.date }}</p></div>
        <div class="detail-info-item"><label>PO#</label><p>{{ selectedItem.purchase?.id }}</p></div>
        <div class="detail-info-item"><label>Supplier</label><p>{{ selectedItem.purchase?.supplier?.name }}</p></div>
        <div class="detail-info-item"><label>Status</label><p><StatusBadge :status="selectedItem.status" /></p></div>
        <div class="detail-info-item"><label>No. Polisi</label><p>{{ selectedItem.license_plate || '-' }}</p></div>
        <div class="detail-info-item"><label>Total</label><p class="fw-700">{{ fmt(selectedItem.total_amount) }}</p></div>
      </div>
      <table class="detail-table"><thead><tr><th>Bahan Baku</th><th>Qty Transaksi</th><th>Base Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
        <tbody><tr v-for="d in selectedItem.details" :key="d.id"><td>{{ d.rawMaterial?.name }}</td><td>{{ d.qty_received }} {{ d.unit?.name || '' }}</td><td>{{ d.base_qty_received || d.qty_received }}</td><td>{{ fmt(d.price) }}</td><td>{{ fmt(d.subtotal) }}</td></tr></tbody>
      </table>
      <template #footer>
        <button class="btn btn-secondary" @click="showDetail=false">Tutup</button>
        <button class="btn btn-warning" v-if="selectedItem?.status==='DRAFT' && auth.can('goods-receipt.create')" @click="openEdit(selectedItem)">Edit</button>
        <button class="btn btn-danger" v-if="selectedItem?.status==='DRAFT' && auth.can('goods-receipt.create')" @click="removeItemData(selectedItem)">Hapus</button>
        <button class="btn btn-primary" v-if="selectedItem?.status==='DRAFT' && auth.can('goods-receipt.create')" @click="approveItem(selectedItem)">Setujui</button>
        <button class="btn btn-secondary" v-if="selectedItem?.status==='APPROVED' && auth.can('goods-receipt.create')" @click="cancelItem(selectedItem)">Batalkan</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import POSearchSelect from '@/components/POSearchSelect.vue'
import RawMaterialSearchSelect from '@/components/RawMaterialSearchSelect.vue'
import ItemUnitSelect from '@/components/ItemUnitSelect.vue'
import api from '@/services/api'

const auth=useAuthStore();const toast=useToastStore();const route=useRoute()
const items=ref([]);const total=ref(0);const page=ref(1);const search=ref('');const dateDari=ref('');const dateSampai=ref('')
const loading=ref(false);const showForm=ref(false);const saving=ref(false);const showDetail=ref(false);const selectedItem=ref(null)
const editingId=ref(null)
const selectedPOInfo=ref(null)
const form=ref({purchase_id:'',date:'',details:[{raw_material_id:'',qty_ordered:0,qty_received:1,unit_id:'',conversion_qty:1,price:0}]})
const fmt=n=>'Rp '+Number(n||0).toLocaleString('id-ID')
let dt;const debouncedFetch=()=>{clearTimeout(dt);dt=setTimeout(()=>{page.value=1;fetchItems()},300)}

const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/purchase/goods-receipts/list',{params:{page:page.value,limit:15,search:search.value,date_from:dateDari.value,date_to:dateSampai.value}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}

const openCreate=()=>{
  editingId.value=null
  selectedPOInfo.value=null
  form.value={purchase_id:'',date:new Date().toISOString().split('T')[0],license_plate:'',details:[{raw_material_id:'',qty_ordered:0,qty_received:1,unit_id:'',conversion_qty:1,price:0}]}
  showForm.value=true
}
const openEdit=async(item)=>{
  try{
    const r=await api.get(`/purchase/goods-receipts/${item.id}`)
    const data=r.data.data
    if(data.status!=='DRAFT'){toast.error('Hanya dokumen DRAFT yang dapat diedit');return}
    editingId.value=data.id
    form.value={
      purchase_id:data.purchase_id||'',
      date:data.date?.split('T')[0]||'',
      license_plate:data.license_plate||'',
      details:(data.details||[]).map(d=>({raw_material_id:d.raw_material_id,qty_ordered:Number(d.qty_received||0),qty_received:Number(d.qty_received||0),unit_id:d.unit_id||'',conversion_qty:Number(d.conversion_qty||1),price:Number(d.price||0)}))
    }
    if(!form.value.details.length) form.value.details=[{raw_material_id:'',qty_ordered:0,qty_received:1,unit_id:'',conversion_qty:1,price:0}]
    if(data.purchase_id){
      try{const po=await api.get(`/purchase/${data.purchase_id}`);selectedPOInfo.value=po.data.data}catch{selectedPOInfo.value=null}
    }
    showForm.value=true
  }catch(e){toast.error(e.response?.data?.message||'Gagal memuat data penerimaan')}
}

// Auto-fill items when PO is selected
const onPOSelected=(po)=>{
  selectedPOInfo.value=po
  if(po.details && po.details.length){
    form.value.details=po.details.map(d=>({
      raw_material_id: d.item_id,
      qty_ordered: Number(d.qty)||0,
      qty_already_received: Number(d.qty_received||0),
      qty_remaining: Math.max(Number(d.qty||0)-Number(d.qty_received||0),0),
      qty_received: Math.max(Number(d.qty||0)-Number(d.qty_received||0),0),
      unit_id: d.unit_id || '',
      conversion_qty: Number(d.conversion_qty || 1),
      price: Number(d.price)||0,
    }))
  }
}

const openDetail=async item=>{try{const r=await api.get(`/purchase/goods-receipts/${item.id}`);selectedItem.value=r.data.data;showDetail.value=true}catch(e){toast.error('Terjadi kesalahan')}}
const onConversionChange=(row,c)=>{ row.conversion_qty = Number(c?.conversion_qty || 1) }
const addItem=()=>form.value.details.push({raw_material_id:'',qty_ordered:0,qty_already_received:0,qty_remaining:0,qty_received:1,unit_id:'',conversion_qty:1,price:0})
const removeItem=i=>form.value.details.splice(i,1)
const removeItemData=async(item)=>{if(!confirm('Hapus draft penerimaan barang ini?'))return;try{await api.delete(`/purchase/goods-receipts/${item.id}`);toast.success('Draft penerimaan barang dihapus');if(showDetail.value&&selectedItem.value?.id===item.id)showDetail.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Gagal menghapus data')}}
const approveItem=async(item)=>{if(!confirm('Setujui penerimaan barang ini? Stok dan jurnal akan diposting.'))return;try{await api.post(`/purchase/goods-receipts/${item.id}/approve`);toast.success('Penerimaan barang disetujui');if(showDetail.value&&selectedItem.value?.id===item.id)await openDetail(item);fetchItems()}catch(e){toast.error(e.response?.data?.message||'Gagal menyetujui penerimaan')}}
const cancelItem=async(item)=>{const cancel_reason=prompt('Alasan pembatalan:');if(cancel_reason===null)return;try{await api.post(`/purchase/goods-receipts/${item.id}/cancel`,{cancel_reason});toast.success('Penerimaan barang dibatalkan');if(showDetail.value&&selectedItem.value?.id===item.id)await openDetail(item);fetchItems()}catch(e){toast.error(e.response?.data?.message||'Gagal membatalkan penerimaan')}}
const save=async()=>{saving.value=true;try{if(editingId.value){await api.put(`/purchase/goods-receipts/${editingId.value}`,form.value);toast.success('Penerimaan barang berhasil diperbarui')}else{await api.post('/purchase/goods-receipts',form.value);toast.success('Draft penerimaan barang berhasil disimpan')}showForm.value=false;if(showDetail.value&&selectedItem.value?.id===editingId.value)await openDetail(selectedItem.value);fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
onMounted(async()=>{
  await fetchItems()
  const prefillPurchaseId = Number(route.query.purchase_id || 0)
  if (prefillPurchaseId && auth.can('goods-receipt.create')) {
    openCreate()
    form.value.purchase_id = prefillPurchaseId
    try {
      const po = await api.get(`/purchase/${prefillPurchaseId}`)
      onPOSelected(po.data.data)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal memuat data PO')
    }
  }
})
</script>

<style>
.po-info-bar {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;
  padding: 8px 14px; margin-bottom: 12px; font-size: 13px; color: #0369a1;
}
.po-info-total { margin-left: auto; font-weight: 700; color: #1e293b; }
</style>
