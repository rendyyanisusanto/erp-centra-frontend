<template>
  <div>
    <div class="page-header"><div><div class="page-title">Penjualan</div></div><button class="btn btn-primary" v-if="auth.can('sales.create')" @click="openCreate">+ Tambah Penjualan</button></div>
    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap"><span class="search-icon">🔍</span><input class="form-control" v-model="search" placeholder="Cari..." @input="debouncedFetch" /></div>
        <select class="form-control" style="width:140px" v-model="statusFilter" @change="fetchItems"><option value="">Semua Status</option><option>UNPAID</option><option>PARTIAL</option><option>PAID</option></select>
        <input class="form-control" type="date" v-model="dateDari" @change="fetchItems" style="width:150px" />
        <input class="form-control" type="date" v-model="dateSampai" @change="fetchItems" style="width:150px" />
      </div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Pelanggan</th><th>Sales</th><th>Tanggal</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 6" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">💰</div><h3>Tidak ada data penjualan</h3><button class="btn btn-primary" v-if="auth.can('sales.create')" @click="openCreate">Tambah Penjualan</button></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id">
            <td class="fw-600">{{ item.customer?.name }}</td>
            <td>{{ item.salesman ? `${item.salesman.code} - ${item.salesman.name}` : '-' }}</td>
            <td>{{ item.date }}</td>
            <td class="fw-600">{{ fmt(item.total_amount) }}</td>
            <td><StatusBadge :status="item.status" /></td>
            <td><button class="btn btn-sm btn-secondary" @click="openDetail(item)">👁 Detail</button></td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>

    <!-- Tambah Penjualan Modal -->
    <BaseModal v-if="showForm" title="Tambah Penjualan" size="xl" @close="showForm=false">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label required">Pelanggan</label>
          <CustomerSearchSelect v-model="form.customer_id" />
        </div>
        <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="date" v-model="form.date" required /></div>
      </div>
      <div class="form-group">
        <label class="form-label">Sales (Opsional)</label>
        <SalesmanSearchSelect v-model="form.salesman_id" />
      </div>
      <div class="form-group"><label class="form-label">Keterangan</label><input class="form-control" v-model="form.description" /></div>
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><label class="form-label" style="margin:0">Item</label><button type="button" class="btn btn-sm btn-secondary" @click="addItem">+ Tambah</button></div>
        <table class="detail-table"><thead><tr><th>Produk</th><th>Jumlah</th><th>Harga</th><th>Subtotal</th><th></th></tr></thead>
          <tbody><tr v-for="(d,i) in form.details" :key="i">
            <td style="min-width:200px"><ProductSearchSelect v-model="d.product_id" /></td>
            <td><input class="form-control" type="number" v-model="d.qty" min="0.01" step="0.01" /></td>
            <td><input class="form-control" type="number" v-model="d.price" min="0" /></td>
            <td class="fw-600">{{ fmt(d.qty*d.price) }}</td>
            <td><button type="button" class="btn btn-sm btn-danger" @click="removeItem(i)">✕</button></td>
          </tr></tbody>
        </table>
        <div class="text-right fw-700" style="margin-top:8px">Total: {{ fmt(saleTotal) }}</div>
      </div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Tambah Penjualan</span></button></template>
    </BaseModal>

    <!-- Detail Modal -->
    <BaseModal v-if="showDetail && selectedItem" :title="`SO #${selectedItem.id} - ${selectedItem.customer?.name}`" size="lg" @close="showDetail=false">
      <div class="detail-info-grid" style="margin-bottom:16px">
        <div class="detail-info-item"><label>Status</label><p><StatusBadge :status="selectedItem.status" /></p></div>
        <div class="detail-info-item"><label>Tanggal</label><p>{{ selectedItem.date }}</p></div>
        <div class="detail-info-item"><label>Sales</label><p>{{ selectedItem.salesman ? `${selectedItem.salesman.code} - ${selectedItem.salesman.name}` : '-' }}</p></div>
        <div class="detail-info-item"><label>Total</label><p class="fw-700">{{ fmt(selectedItem.total_amount) }}</p></div>
      </div>
      <table class="detail-table"><thead><tr><th>Produk</th><th>Jumlah</th><th>Harga</th><th>Subtotal</th></tr></thead>
        <tbody><tr v-for="d in selectedItem.details" :key="d.id"><td>{{ d.product?.name }}</td><td>{{ d.qty }}</td><td>{{ fmt(d.price) }}</td><td>{{ fmt(d.subtotal) }}</td></tr></tbody>
      </table>
      <template #footer>
        <button class="btn btn-secondary" @click="showDetail=false">Tutup</button>
        <button class="btn btn-primary" v-if="selectedItem?.details?.length" @click="openSalesInvoicePrint(selectedItem.id)">Cetak Nota</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import CustomerSearchSelect from '@/components/CustomerSearchSelect.vue'
import ProductSearchSelect from '@/components/ProductSearchSelect.vue'
import SalesmanSearchSelect from '@/components/SalesmanSearchSelect.vue'
import api from '@/services/api'

const auth = useAuthStore()
const toast = useToastStore()

const items = ref([])
const total = ref(0)
const page = ref(1)
const search = ref('')
const statusFilter = ref('')
const dateDari = ref('')
const dateSampai = ref('')
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const showDetail = ref(false)
const selectedItem = ref(null)

const form = ref({ customer_id: '', salesman_id: null, date: '', description: '', details: [{ product_id: '', qty: 1, price: 0 }] })
const saleTotal = computed(() => form.value.details.reduce((s, d) => s + Number(d.qty || 0) * Number(d.price || 0), 0))
const fmt = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

let dt
const debouncedFetch = () => { clearTimeout(dt); dt = setTimeout(() => { page.value = 1; fetchItems() }, 300) }

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/sales', { params: { page: page.value, limit: 15, search: search.value, status: statusFilter.value, date_from: dateDari.value, date_to: dateSampai.value } })
    items.value = r.data.data.data
    total.value = r.data.data.total
  } catch (e) {
    toast.error('Terjadi kesalahan')
  } finally {
    loading.value = false
  }
}

const changePage = p => { page.value = p; fetchItems() }
const openCreate = () => {
  form.value = { customer_id: '', salesman_id: null, date: new Date().toISOString().split('T')[0], description: '', details: [{ product_id: '', qty: 1, price: 0 }] }
  showForm.value = true
}
const openDetail = async item => {
  try { const r = await api.get(`/sales/${item.id}`); selectedItem.value = r.data.data; showDetail.value = true } catch (e) { toast.error('Terjadi kesalahan') }
}
const openSalesInvoicePrint = (id) => {
  if (!id) return
  window.open(`/print/sales/${id}`, '_blank')
}
const addItem = () => form.value.details.push({ product_id: '', qty: 1, price: 0 })
const removeItem = i => form.value.details.splice(i, 1)
const save = async () => {
  saving.value = true
  try {
    await api.post('/sales', form.value)
    toast.success('Penjualan berhasil ditambahkan. Stok berkurang.')
    showForm.value = false
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Terjadi kesalahan')
  } finally {
    saving.value = false
  }
}

onMounted(() => fetchItems())
</script>
