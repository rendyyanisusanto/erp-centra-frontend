<template>
  <div>
    <div class="page-header">
      <div><div class="page-title">Daftar Pembelian</div><div class="page-subtitle">Kelola pembelian ke supplier</div></div>
      <button class="btn btn-primary" v-if="auth.can('purchase.create')" @click="openCreate">+ Tambah</button>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap"><span class="search-icon">🔍</span><input class="form-control" v-model="search" placeholder="Cari supplier..." @input="debouncedFetch" /></div>
        <select class="form-control" style="width:140px" v-model="statusFilter" @change="fetchItems"><option value="">Semua Status</option><option>OPEN</option><option>PARTIAL</option><option>PAID</option></select>
        <input class="form-control" type="date" v-model="dateDari" @change="fetchItems" style="width:150px" />
        <input class="form-control" type="date" v-model="dateSampai" @change="fetchItems" style="width:150px" />
      </div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Supplier</th><th>Tanggal</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 5" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">🛒</div><h3>Tidak ada data pembelian</h3><button class="btn btn-primary" v-if="auth.can('purchase.create')" @click="openCreate">Tambah Pembelian</button></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id" @click="openDetail(item)" style="cursor:pointer">
            <td class="fw-600">{{ item.supplier?.name }}</td><td>{{ item.date }}</td>
            <td class="fw-600">{{ fmt(item.total_amount) }}</td>
            <td><StatusBadge :status="item.status" /></td>
            <td @click.stop><div class="action-btns"><button class="btn btn-sm btn-secondary" @click="openDetail(item)">👁 Detail</button></div></td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>

    <!-- Create Modal -->
    <BaseModal v-if="showForm" title="Tambah Pembelian" size="xl" @close="showForm=false">
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Supplier</label><SupplierSearchSelect v-model="form.supplier_id" /></div>
        <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="date" v-model="form.date" required /></div>
      </div>
      <div class="form-group"><label class="form-label">Keterangan</label><input class="form-control" v-model="form.description" /></div>
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><label class="form-label" style="margin:0">Item</label><button type="button" class="btn btn-sm btn-secondary" @click="addItem">+ Tambah Item</button></div>
        <table class="detail-table" style="table-layout:fixed;width:100%"><thead><tr><th style="width:40%">Bahan Baku</th><th style="width:90px">Jumlah</th><th style="width:130px">Harga</th><th style="width:110px">Subtotal</th><th style="width:48px"></th></tr></thead>
          <tbody>
            <tr v-for="(d,i) in form.details" :key="i">
              <td><RawMaterialSearchSelect v-model="d.item_id" /></td>
              <td><input class="form-control" type="number" v-model="d.qty" min="0.01" step="0.01" /></td>
              <td><input class="form-control" type="number" v-model="d.price" min="0" /></td>
              <td class="text-right fw-600">{{ fmt(d.qty*d.price) }}</td>
              <td><button type="button" class="btn btn-sm btn-danger" @click="removeItem(i)">✕</button></td>
            </tr>
          </tbody>
        </table>
        <div class="text-right fw-700" style="margin-top:8px">Total: {{ fmt(orderTotal) }}</div>
      </div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Simpan</span></button></template>
    </BaseModal>

    <!-- Detail Modal -->
    <BaseModal v-if="showDetail && selectedItem" :title="`PO #${selectedItem.id} - ${selectedItem.supplier?.name}`" size="lg" @close="showDetail=false">
      <div class="detail-info-grid" style="margin-bottom:16px">
        <div class="detail-info-item"><label>Status</label><p><StatusBadge :status="selectedItem.status" /></p></div>
        <div class="detail-info-item"><label>Tanggal</label><p>{{ selectedItem.date }}</p></div>
        <div class="detail-info-item"><label>Total</label><p class="fw-700">{{ fmt(selectedItem.total_amount) }}</p></div>
        <div class="detail-info-item"><label>Dibuat Oleh</label><p>{{ selectedItem.creator?.name }}</p></div>
      </div>
      <table class="detail-table"><thead><tr><th>Produk</th><th>Jumlah</th><th>Diterima</th><th>Harga</th><th>Subtotal</th></tr></thead>
        <tbody><tr v-for="d in selectedItem.details" :key="d.id"><td>{{ d.rawMaterial?.name || d.product?.name || (d.item_type + ' #' + d.item_id) }}</td><td>{{ d.qty }} {{ d.rawMaterial?.unit?.name || d.product?.unit?.name || '' }}</td><td>{{ d.qty_received || 0 }} {{ d.rawMaterial?.unit?.name || d.product?.unit?.name || '' }}</td><td>{{ fmt(d.price) }}</td><td>{{ fmt(d.subtotal) }}</td></tr></tbody>
      </table>
      <div v-if="selectedItem.payments?.length" style="margin-top:16px">
        <div class="fw-600" style="margin-bottom:8px">Pembayaran</div>
        <table class="detail-table"><thead><tr><th>Tanggal</th><th>Jumlah</th><th>Akun</th></tr></thead>
          <tbody><tr v-for="p in selectedItem.payments" :key="p.id"><td>{{ p.date }}</td><td>{{ fmt(p.amount) }}</td><td>{{ p.account?.name }}</td></tr></tbody>
        </table>
      </div>
    </BaseModal>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'; import StatusBadge from '@/components/StatusBadge.vue'
import RawMaterialSearchSelect from '@/components/RawMaterialSearchSelect.vue'
import SupplierSearchSelect from '@/components/SupplierSearchSelect.vue'
import api from '@/services/api'
const auth=useAuthStore();const toast=useToastStore()
const items=ref([]);const total=ref(0);const page=ref(1);const search=ref('');const statusFilter=ref('');const dateDari=ref('');const dateSampai=ref('')
const loading=ref(false);const showForm=ref(false);const saving=ref(false);const showDetail=ref(false);const selectedItem=ref(null)

const form=ref({supplier_id:'',date:'',description:'',details:[{item_type:'raw_material',item_id:'',qty:1,price:0}]})
const orderTotal=computed(()=>form.value.details.reduce((s,d)=>s+Number(d.qty||0)*Number(d.price||0),0))
const fmt=n=>'Rp '+Number(n||0).toLocaleString('id-ID')
let dt;const debouncedFetch=()=>{clearTimeout(dt);dt=setTimeout(()=>{page.value=1;fetchItems()},300)}
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/purchase',{params:{page:page.value,limit:15,search:search.value,status:statusFilter.value,date_from:dateDari.value,date_to:dateSampai.value}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}
const openCreate=()=>{form.value={supplier_id:'',date:new Date().toISOString().split('T')[0],description:'',details:[{item_type:'raw_material',item_id:'',qty:1,price:0}]};showForm.value=true}
const openDetail=async item=>{try{const r=await api.get(`/purchase/${item.id}`);selectedItem.value=r.data.data;showDetail.value=true}catch(e){toast.error('Terjadi kesalahan')}}
const addItem=()=>form.value.details.push({item_type:'raw_material',item_id:'',qty:1,price:0})
const removeItem=i=>form.value.details.splice(i,1)
const save=async()=>{saving.value=true;try{await api.post('/purchase',form.value);toast.success('Data pembelian berhasil ditambahkan');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
onMounted(()=>{fetchItems()})
</script>
