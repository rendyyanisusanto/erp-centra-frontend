<template>
  <div>
    <div class="page-header">
      <div><div class="page-title">Daftar Pembelian</div><div class="page-subtitle">Kelola pembelian ke supplier</div></div>
      <button class="btn btn-primary" v-if="auth.can('purchase.create')" @click="openCreate">+ Tambah</button>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap"><span class="search-icon">🔍</span><input class="form-control" v-model="search" placeholder="Cari supplier..." @input="debouncedFetch" /></div>
        <select class="form-control" style="width:160px" v-model="statusFilter" @change="fetchItems"><option value="">Semua Status</option><option>DRAFT</option><option>APPROVED</option><option>CANCELLED</option></select>
        <input class="form-control" type="date" v-model="dateDari" @change="fetchItems" style="width:150px" />
        <input class="form-control" type="date" v-model="dateSampai" @change="fetchItems" style="width:150px" />
      </div>
      <div class="table-wrapper"><table>
        <thead><tr><th>No</th><th>Nomor PO</th><th>Supplier</th><th>Tanggal</th><th>Total</th><th>Status</th><th>Penerimaan</th><th>Pembayaran</th><th>Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 9" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">🛒</div><h3>Tidak ada data pembelian</h3><button class="btn btn-primary" v-if="auth.can('purchase.create')" @click="openCreate">Tambah Pembelian</button></div></td></tr></template>
          <tr v-else v-for="(item, idx) in items" :key="item.id" @click="openDetail(item)" style="cursor:pointer">
            <td>{{ ((page-1)*15) + idx + 1 }}</td>
            <td class="fw-600">PO-{{ String(item.id).padStart(6, '0') }}</td>
            <td class="fw-600">{{ item.supplier?.name }}</td>
            <td>{{ item.date }}</td>
            <td class="fw-600">{{ fmt(item.total_amount) }}</td>
            <td><StatusBadge :status="item.status" /></td>
            <td>
              <div><span class="badge" :class="receiptBadgeClass(item.receipt_summary?.status)">{{ receiptLabel(item.receipt_summary?.status) }}</span></div>
              <div class="text-muted" style="font-size:12px;margin-top:4px">{{ fmtQty(item.receipt_summary?.received_base_qty) }} / {{ fmtQty(item.receipt_summary?.ordered_base_qty) }}</div>
            </td>
            <td>
              <div><StatusBadge :status="item.payment_summary?.status || item.payment_status" /></div>
              <div class="text-muted" style="font-size:12px;margin-top:4px">{{ fmt(item.payment_summary?.paid_amount) }} / {{ fmt(item.payment_summary?.total_amount || item.total_amount) }}</div>
            </td>
            <td @click.stop>
              <details class="action-dropdown" @toggle="onActionToggle(item.id, $event)">
                <summary class="btn btn-sm btn-secondary">Aksi</summary>
                <div class="action-menu">
                  <button class="action-item" @click="openDetail(item)">Detail</button>

                  <template v-if="item.status==='DRAFT'">
                    <button class="action-item" v-if="auth.can('purchase.create')" @click="openEdit(item)">Edit</button>
                    <button class="action-item" v-if="auth.can('purchase.create')" @click="removeItem(item)">Hapus</button>
                    <button class="action-item" v-if="auth.can('purchase.approve')" @click="approveItem(item)">Setujui</button>
                  </template>

                  <template v-if="item.status==='APPROVED'">
                    <button class="action-item" v-if="auth.can('goods-receipt.create')" :disabled="item.receipt_summary?.status==='RECEIVED'" @click="goCreateReceipt(item)">Buat Penerimaan Barang</button>
                    <button class="action-item" v-if="auth.can('purchase-payment.create')" :disabled="item.payment_summary?.status==='PAID'" @click="goCreatePayment(item)">Buat Pembayaran</button>
                    <button class="action-item" @click="printPO(item)">Cetak PO</button>
                    <button class="action-item" v-if="auth.can('purchase.approve')" @click="cancelItem(item)">Batalkan</button>
                  </template>

                  <template v-if="item.status==='CANCELLED'">
                    <button class="action-item" @click="printPO(item)">Cetak PO</button>
                  </template>
                </div>
              </details>
            </td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>

    <BaseModal v-if="showForm" :title="editingId ? 'Edit Pembelian' : 'Tambah Pembelian'" size="xl" @close="showForm=false">
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Supplier</label><SupplierSearchSelect v-model="form.supplier_id" /></div>
        <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="date" v-model="form.date" required /></div>
      </div>
      <div class="form-group"><label class="form-label">Keterangan</label><input class="form-control" v-model="form.description" /></div>
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><label class="form-label" style="margin:0">Item</label><button type="button" class="btn btn-sm btn-secondary" @click="addItem">+ Tambah Item</button></div>
        <table class="detail-table" style="table-layout:fixed;width:100%"><thead><tr><th style="width:30%">Bahan Baku</th><th style="width:90px">Jumlah</th><th style="width:23%">Satuan</th><th style="width:110px">Base Qty</th><th style="width:130px">Harga</th><th style="width:110px">Subtotal</th><th style="width:48px"></th></tr></thead>
          <tbody>
            <tr v-for="(d,i) in form.details" :key="i">
              <td><RawMaterialSearchSelect v-model="d.item_id" /></td>
              <td><input class="form-control" type="number" v-model="d.qty" min="0.01" step="0.01" /></td>
              <td><ItemUnitSelect item-type="RAW_MATERIAL" :item-id="d.item_id" v-model="d.unit_id" @conversion-change="(c)=>onConversionChange(d,c)" /></td>
              <td class="text-right">{{ fmtQty((Number(d.qty||0)*Number(d.conversion_qty||1))||0) }}</td>
              <td><input class="form-control" type="number" v-model="d.price" min="0" /></td>
              <td class="text-right fw-600">{{ fmt(d.qty*d.price) }}</td>
              <td><button type="button" class="btn btn-sm btn-danger" @click="removeItemForm(i)">✕</button></td>
            </tr>
          </tbody>
        </table>
        <div class="text-right fw-700" style="margin-top:8px">Total: {{ fmt(orderTotal) }}</div>
      </div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>{{ editingId ? 'Update' : 'Simpan' }}</span></button></template>
    </BaseModal>

    <BaseModal v-if="showDetail && selectedItem" :title="`PO #${selectedItem.id} - ${selectedItem.supplier?.name}`" size="xl" @close="showDetail=false">
      <div class="detail-info-grid" style="margin-bottom:16px">
        <div class="detail-info-item"><label>Status</label><p><StatusBadge :status="selectedItem.status" /></p></div>
        <div class="detail-info-item"><label>Tanggal</label><p>{{ selectedItem.date }}</p></div>
        <div class="detail-info-item"><label>Total</label><p class="fw-700">{{ fmt(selectedItem.total_amount) }}</p></div>
        <div class="detail-info-item"><label>Penerimaan</label><p><span class="badge" :class="receiptBadgeClass(selectedItem.receipt_summary?.status)">{{ receiptLabel(selectedItem.receipt_summary?.status) }}</span></p></div>
        <div class="detail-info-item"><label>Pembayaran</label><p><StatusBadge :status="selectedItem.payment_summary?.status || selectedItem.payment_status" /></p></div>
        <div class="detail-info-item"><label>Referensi Request</label><p>{{ selectedItem.purchase_request_id ? ('PR #' + selectedItem.purchase_request_id) : '-' }}</p></div>
      </div>

      <div class="fw-600" style="margin-bottom:8px">Detail PO</div>
      <table class="detail-table"><thead><tr><th>Produk</th><th>Qty Transaksi</th><th>Qty Base</th><th>Diterima (Base)</th><th>Harga</th><th>Subtotal</th></tr></thead>
        <tbody><tr v-for="d in selectedItem.details" :key="d.id"><td>{{ d.rawMaterial?.name || d.product?.name || (d.item_type + ' #' + d.item_id) }}</td><td>{{ d.qty }} {{ d.unit?.name || '' }}</td><td>{{ fmtQty(d.base_qty || d.qty) }}</td><td>{{ fmtQty(d.qty_received || 0) }}</td><td>{{ fmt(d.price) }}</td><td>{{ fmt(d.subtotal) }}</td></tr></tbody>
      </table>

      <div style="margin-top:16px" class="fw-600">Penerimaan Barang</div>
      <div class="detail-info-grid" style="margin:8px 0 10px 0">
        <div class="detail-info-item"><label>Total Qty PO (Base)</label><p class="fw-700">{{ fmtQty(selectedItem.receipt_summary?.ordered_base_qty) }}</p></div>
        <div class="detail-info-item"><label>Total Qty Diterima (Base)</label><p class="fw-700">{{ fmtQty(selectedItem.receipt_summary?.received_base_qty) }}</p></div>
        <div class="detail-info-item"><label>Sisa Qty Diterima (Base)</label><p class="fw-700">{{ fmtQty(selectedItem.receipt_summary?.remaining_base_qty) }}</p></div>
      </div>
      <table class="detail-table"><thead><tr><th>No PB</th><th>Tanggal</th><th>Status</th><th>Total</th></tr></thead>
        <tbody>
          <tr v-if="!(selectedItem.receipts||[]).length"><td colspan="4" class="text-center text-muted">Belum ada penerimaan barang</td></tr>
          <tr v-for="r in selectedItem.receipts||[]" :key="r.id"><td>{{ r.receipt_number || ('GR-'+String(r.id).padStart(6,'0')) }}</td><td>{{ r.date }}</td><td><StatusBadge :status="r.status" /></td><td>{{ fmt(r.total_amount) }}</td></tr>
        </tbody>
      </table>

      <div style="margin-top:16px" class="fw-600">Pembayaran</div>
      <div class="detail-info-grid" style="margin:8px 0 10px 0">
        <div class="detail-info-item"><label>Total PO</label><p class="fw-700">{{ fmt(selectedItem.payment_summary?.total_amount || selectedItem.total_amount) }}</p></div>
        <div class="detail-info-item"><label>Sudah Dibayar</label><p class="fw-700">{{ fmt(selectedItem.payment_summary?.paid_amount || selectedItem.total_paid) }}</p></div>
        <div class="detail-info-item"><label>Sisa Utang</label><p class="fw-700">{{ fmt(selectedItem.payment_summary?.remaining_amount || selectedItem.remaining_amount) }}</p></div>
      </div>
      <table class="detail-table"><thead><tr><th>Tanggal</th><th>Status</th><th>Jumlah</th><th>Akun</th></tr></thead>
        <tbody>
          <tr v-if="!(selectedItem.payments||[]).length"><td colspan="4" class="text-center text-muted">Belum ada pembayaran</td></tr>
          <tr v-for="p in selectedItem.payments||[]" :key="p.id"><td>{{ p.date }}</td><td><StatusBadge :status="p.status" /></td><td>{{ fmt(p.amount) }}</td><td>{{ p.account?.name || '-' }}</td></tr>
        </tbody>
      </table>

      <template #footer>
        <button class="btn btn-danger" v-if="selectedItem?.status==='APPROVED' && auth.can('purchase.approve')" @click="cancelItem(selectedItem)">⛔ Batalkan</button>
        <button class="btn btn-warning" v-if="selectedItem?.status==='DRAFT' && auth.can('purchase.create')" @click="openEdit(selectedItem)">✏️ Edit</button>
        <button class="btn btn-primary" v-if="selectedItem?.status==='DRAFT' && auth.can('purchase.approve')" @click="approveItem(selectedItem)">✅ Setujui</button>
        <button class="btn btn-primary" v-if="selectedItem?.status==='APPROVED' && auth.can('goods-receipt.create')" :disabled="selectedItem?.receipt_summary?.status==='RECEIVED'" @click="goCreateReceipt(selectedItem)">📥 Buat Penerimaan Barang</button>
        <button class="btn btn-primary" v-if="selectedItem?.status==='APPROVED' && auth.can('purchase-payment.create')" :disabled="selectedItem?.payment_summary?.status==='PAID'" @click="goCreatePayment(selectedItem)">💳 Buat Pembayaran</button>
        <button class="btn btn-secondary" @click="showDetail=false">✖ Tutup</button>
      </template>
    </BaseModal>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'; import StatusBadge from '@/components/StatusBadge.vue'
import RawMaterialSearchSelect from '@/components/RawMaterialSearchSelect.vue'
import SupplierSearchSelect from '@/components/SupplierSearchSelect.vue'
import ItemUnitSelect from '@/components/ItemUnitSelect.vue'
import api from '@/services/api'
const auth=useAuthStore();const toast=useToastStore();const router=useRouter()
const items=ref([]);const total=ref(0);const page=ref(1);const search=ref('');const statusFilter=ref('');const dateDari=ref('');const dateSampai=ref('')
const loading=ref(false);const showForm=ref(false);const saving=ref(false);const showDetail=ref(false);const selectedItem=ref(null)
const editingId=ref(null)

const form=ref({supplier_id:'',date:'',description:'',details:[{item_type:'raw_material',item_id:'',qty:1,unit_id:'',conversion_qty:1,price:0}]})
const orderTotal=computed(()=>form.value.details.reduce((s,d)=>s+Number(d.qty||0)*Number(d.price||0),0))
const fmt=n=>'Rp '+Number(n||0).toLocaleString('id-ID')
const fmtQty=n=>Number(n||0).toLocaleString('id-ID')
const receiptLabel=s=>({NOT_RECEIVED:'Belum Diterima',PARTIAL:'Sebagian Diterima',RECEIVED:'Sudah Diterima'}[s]||'Belum Diterima')
const receiptBadgeClass=s=>({NOT_RECEIVED:'badge-gray',PARTIAL:'badge-warning',RECEIVED:'badge-success'}[s]||'badge-gray')
let dt;const debouncedFetch=()=>{clearTimeout(dt);dt=setTimeout(()=>{page.value=1;fetchItems()},300)}
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/purchase',{params:{page:page.value,limit:15,search:search.value,status:statusFilter.value,date_from:dateDari.value,date_to:dateSampai.value}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}
const openCreate=()=>{editingId.value=null;form.value={supplier_id:'',date:new Date().toISOString().split('T')[0],description:'',details:[{item_type:'raw_material',item_id:'',qty:1,unit_id:'',conversion_qty:1,price:0}]};showForm.value=true}
const openEdit=async(item)=>{
  try{
    const r=await api.get(`/purchase/${item.id}`)
    const data=r.data.data
    if(data.status!=='DRAFT'){toast.error('Hanya dokumen DRAFT yang dapat diedit');return}
    editingId.value=data.id
    form.value={
      supplier_id:data.supplier_id||'',
      date:data.date?.split('T')[0]||'',
      description:data.description||'',
      details:(data.details||[]).map(d=>({item_type:d.item_type||'raw_material',item_id:d.item_id,qty:Number(d.qty||0),unit_id:d.unit_id||'',conversion_qty:Number(d.conversion_qty||1),price:Number(d.price||0)}))
    }
    if(!form.value.details.length) form.value.details=[{item_type:'raw_material',item_id:'',qty:1,unit_id:'',conversion_qty:1,price:0}]
    showForm.value=true
  }catch(e){toast.error(e.response?.data?.message||'Gagal memuat data pembelian')}
}
const openDetail=async item=>{try{const r=await api.get(`/purchase/${item.id}`);selectedItem.value=r.data.data;showDetail.value=true}catch(e){toast.error('Terjadi kesalahan')}}
const approveItem=async(item)=>{if(!confirm('Setujui transaksi pembelian ini?'))return;try{await api.post(`/purchase/${item.id}/approve`);toast.success('Pembelian disetujui');if(showDetail.value&&selectedItem.value?.id===item.id)await openDetail(item);fetchItems()}catch(e){toast.error(e.response?.data?.message||'Gagal menyetujui pembelian')}}
const cancelItem=async(item)=>{const cancel_reason=prompt('Alasan pembatalan:');if(cancel_reason===null)return;try{await api.post(`/purchase/${item.id}/cancel`,{cancel_reason});toast.success('Pembelian dibatalkan');if(showDetail.value&&selectedItem.value?.id===item.id)await openDetail(item);fetchItems()}catch(e){toast.error(e.response?.data?.message||'Gagal membatalkan pembelian')}}
const removeItem=async(item)=>{if(!confirm('Hapus draft pembelian ini?'))return;try{await api.delete(`/purchase/${item.id}`);toast.success('Draft pembelian dihapus');if(showDetail.value&&selectedItem.value?.id===item.id)showDetail.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Gagal menghapus pembelian')}}
const goCreateReceipt=(item)=>{if(item.status!=='APPROVED')return;router.push({name:'GoodsReceipts',query:{purchase_id:item.id,from_po:'1'}})}
const goCreatePayment=(item)=>{if(item.status!=='APPROVED')return;router.push({name:'PurchasePayments',query:{purchase_id:item.id,supplier_id:item.supplier_id,from_po:'1'}})}
const printPO=(item)=>{openDetail(item);setTimeout(()=>window.print(),200)}
const onConversionChange=(row,c)=>{ row.conversion_qty=Number(c?.conversion_qty||1) }
const addItem=()=>form.value.details.push({item_type:'raw_material',item_id:'',qty:1,unit_id:'',conversion_qty:1,price:0})
const removeItemForm=i=>form.value.details.splice(i,1)
const save=async()=>{saving.value=true;try{if(editingId.value){await api.put(`/purchase/${editingId.value}`,form.value);toast.success('Data pembelian berhasil diperbarui')}else{await api.post('/purchase',form.value);toast.success('Data pembelian berhasil ditambahkan')}showForm.value=false;if(showDetail.value&&selectedItem.value?.id===editingId.value)await openDetail(selectedItem.value);fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
const onActionToggle=(id,ev)=>{
  if(!ev.target.open) return
  document.querySelectorAll('.action-dropdown').forEach(el=>{ if(el!==ev.target) el.open=false })
}
onMounted(()=>{fetchItems()})
</script>

<style scoped>
.action-dropdown { position: relative; display: inline-block; }
.action-dropdown > summary { list-style: none; }
.action-dropdown > summary::-webkit-details-marker { display: none; }
.action-menu {
  position: absolute; right: 0; top: calc(100% + 4px); z-index: 20;
  min-width: 190px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.15); padding: 6px;
}
.action-item {
  width: 100%; text-align: left; border: none; background: transparent; cursor: pointer;
  padding: 8px 10px; border-radius: 6px; font-size: 13px; color: #1e293b;
}
.action-item:hover { background: #f8fafc; }
.action-item:disabled { color: #94a3b8; cursor: not-allowed; }
</style>
