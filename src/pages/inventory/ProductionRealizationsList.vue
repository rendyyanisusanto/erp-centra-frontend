<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Realisasi Produksi</div>
        <div class="page-subtitle">Update qty realisasi dari rencana produksi berstatus APPROVED</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header filter-toolbar">
        <div class="filter-field filter-search">
          <label class="filter-label">Pencarian</label>
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input class="form-control" v-model="search" placeholder="Kode produksi / produk / nomor rencana" @input="debouncedFetch" />
          </div>
        </div>
        <div class="filter-field">
          <label class="filter-label">Bulan</label>
          <select class="form-control" v-model="monthFilter" @change="onFilterChange">
            <option value="">Semua Bulan</option>
            <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="filter-field">
          <label class="filter-label">Tahun</label>
          <select class="form-control" v-model="yearFilter" @change="onFilterChange">
            <option value="">Semua Tahun</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div class="filter-field">
          <label class="filter-label">Status Header</label>
          <select class="form-control" v-model="statusFilter" @change="onFilterChange">
            <option value="APPROVED">APPROVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div class="filter-field">
          <label class="filter-label">Produk</label>
          <ProductSearchSelect v-model="productFilter" />
        </div>
        <div class="filter-field filter-actions">
          <label class="filter-label">&nbsp;</label>
          <button class="btn btn-secondary" @click="resetFilters">Reset</button>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nomor Rencana</th>
              <th>Kode Produksi</th>
              <th>Tanggal</th>
              <th>Produk</th>
              <th>Qty Rencana</th>
              <th>Qty Realisasi</th>
              <th>Selisih</th>
              <th>Bulan</th>
              <th>Tahun</th>
              <th>Status Header</th>
              <th>Status Realisasi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 13" :key="j"><div class="skeleton-cell"></div></td></tr>
            </template>
            <template v-else-if="items.length === 0">
              <tr><td colspan="13"><div class="empty-state"><div class="empty-state-icon">📊</div><h3>Tidak ada data realisasi produksi</h3></div></td></tr>
            </template>
            <tr v-else v-for="(item, i) in items" :key="item.id">
              <td class="text-muted">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="fw-600">{{ item.plan_number }}</td>
              <td>{{ item.production_code }}</td>
              <td>{{ item.production_date }}</td>
              <td>{{ item.product_name }}</td>
              <td class="text-right">{{ fmtNum(item.planned_qty) }}</td>
              <td class="text-right">{{ fmtNum(item.realized_qty) }}</td>
              <td class="text-right" :class="item.difference < 0 ? 'text-danger' : ''">{{ fmtNum(item.difference) }}</td>
              <td class="text-center">{{ item.month }}</td>
              <td class="text-center">{{ item.year }}</td>
              <td><span class="badge" :class="statusClass(item.header_status)">{{ item.header_status }}</span></td>
              <td><span class="badge" :class="realizationClass(item.realization_status)">{{ realizationLabel(item.realization_status) }}</span></td>
              <td>
                <button class="btn btn-sm btn-secondary" v-if="auth.can('production-realization.update') && item.header_status === 'APPROVED'" @click="openEditModal(item.id)">✏️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <span class="pagination-info">Total: {{ total }}</span>
        <button class="page-btn" :disabled="page <= 1" @click="changePage(page - 1)">‹</button>
        <button class="page-btn" v-for="p in totalPages" :key="p" :class="{ active: p === page }" @click="changePage(p)">{{ p }}</button>
        <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">›</button>
      </div>
    </div>

    <BaseModal v-if="showEditModal" title="Update Realisasi Produksi" @close="showEditModal = false">
      <div v-if="editLoading" class="empty-state"><div class="empty-state-icon">⏳</div><h3>Memuat...</h3></div>
      <template v-else>
        <div class="detail-info-grid" style="margin-bottom:14px">
          <div class="detail-info-item"><label>Nomor Rencana</label><p>{{ editItem.plan_number }}</p></div>
          <div class="detail-info-item"><label>Kode Produksi</label><p>{{ editItem.production_code }}</p></div>
          <div class="detail-info-item"><label>Produk</label><p>{{ editItem.product_name }}</p></div>
          <div class="detail-info-item"><label>Qty Rencana</label><p>{{ fmtNum(editItem.planned_qty) }}</p></div>
        </div>
        <div class="form-group"><label class="form-label required">Qty Realisasi</label><input class="form-control" type="number" min="0" step="0.01" v-model="editForm.realized_qty" /></div>
        <div class="form-group"><label class="form-label">Note</label><textarea class="form-control" v-model="editForm.note"></textarea></div>
      </template>
      <template #footer>
        <button class="btn btn-secondary" @click="showEditModal = false">Batal</button>
        <button class="btn btn-primary" :disabled="saving || editLoading" @click="submitEdit"><span v-if="saving" class="spinner"></span><span v-else>Perbarui</span></button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import BaseModal from '@/components/BaseModal.vue'
import ProductSearchSelect from '@/components/ProductSearchSelect.vue'

const auth = useAuthStore()
const toast = useToastStore()

const items = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(15)
const loading = ref(false)

const search = ref('')
const monthFilter = ref('')
const yearFilter = ref('')
const statusFilter = ref('APPROVED')
const productFilter = ref('')

const showEditModal = ref(false)
const editLoading = ref(false)
const saving = ref(false)
const editId = ref(null)
const editItem = ref({})
const editForm = ref({ realized_qty: 0, note: '' })

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1)
const fmtNum = (v) => Number(v || 0).toLocaleString('id-ID')
const statusClass = (s) => ({ DRAFT: 'badge-info', APPROVED: 'badge-success', CANCELLED: 'badge-danger' }[s] || 'badge-gray')
const realizationClass = (s) => ({ BELUM_DIREALISASI: 'badge-gray', SEBAGIAN: 'badge-warning', SELESAI: 'badge-success', OVER_TARGET: 'badge-danger' }[s] || 'badge-gray')
const realizationLabel = (s) => ({
  BELUM_DIREALISASI: 'Belum Direalisasi',
  SEBAGIAN: 'Sebagian',
  SELESAI: 'Selesai',
  OVER_TARGET: 'Over Target',
}[s] || s)

let timer
const debouncedFetch = () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; fetchItems() }, 300) }
const onFilterChange = () => { page.value = 1; fetchItems() }
const changePage = (p) => { page.value = p; fetchItems() }
const resetFilters = () => {
  search.value = ''
  monthFilter.value = ''
  yearFilter.value = ''
  statusFilter.value = 'APPROVED'
  productFilter.value = ''
  page.value = 1
  fetchItems()
}

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/production-realizations', {
      params: {
        page: page.value,
        limit: limit.value,
        search: search.value,
        month: monthFilter.value,
        year: yearFilter.value,
        status: statusFilter.value,
        product_id: productFilter.value,
      },
    })
    items.value = r.data.data?.data || []
    total.value = r.data.data?.total || 0
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data production realizations')
  } finally {
    loading.value = false
  }
}

const openEditModal = async (id) => {
  editId.value = id
  showEditModal.value = true
  editLoading.value = true
  editItem.value = {}
  try {
    const r = await api.get(`/production-realizations/${id}`)
    editItem.value = r.data.data
    editForm.value = {
      realized_qty: r.data.data.realized_qty,
      note: r.data.data.note || '',
    }
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data detail')
    showEditModal.value = false
  } finally {
    editLoading.value = false
  }
}

const submitEdit = async () => {
  saving.value = true
  try {
    await api.put(`/production-realizations/${editId.value}`, editForm.value)
    toast.success('Realisasi produksi berhasil diupdate')
    showEditModal.value = false
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memperbarui realisasi')
  } finally {
    saving.value = false
  }
}

onMounted(fetchItems)
</script>

<style scoped>
.filter-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 2fr) repeat(5, minmax(140px, 1fr));
  gap: 12px;
  align-items: end;
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.filter-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}
.filter-actions .btn {
  width: 100%;
}
@media (max-width: 1280px) {
  .filter-toolbar {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}
</style>
