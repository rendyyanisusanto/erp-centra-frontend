<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Rencana Produksi</div>
        <div class="page-subtitle">Dokumen rencana produksi bulanan</div>
      </div>
      <button v-if="auth.can('production-plan.create')" class="btn btn-primary" @click="openCreateModal">+ Buat Rencana</button>
    </div>

    <div class="card">
      <div class="card-header filter-toolbar">
        <div class="filter-field filter-search">
          <label class="filter-label">Pencarian</label>
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input class="form-control" v-model="search" placeholder="Nomor rencana / keterangan / pembuat" @input="debouncedFetch" />
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
          <label class="filter-label">Status</label>
          <select class="form-control" v-model="statusFilter" @change="onFilterChange">
            <option value="">Semua Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
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
              <th>Bulan</th>
              <th>Tahun</th>
              <th>Status</th>
              <th>Dibuat Oleh</th>
              <th>Dibuat Pada</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 8" :key="j"><div class="skeleton-cell"></div></td></tr>
            </template>
            <template v-else-if="items.length === 0">
              <tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">📘</div><h3>Tidak ada rencana produksi</h3></div></td></tr>
            </template>
            <tr v-else v-for="(item, i) in items" :key="item.id">
              <td class="text-muted">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="fw-600">{{ item.plan_number }}</td>
              <td class="text-center">{{ item.month }}</td>
              <td class="text-center">{{ item.year }}</td>
              <td><span class="badge" :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ item.creator?.name || '-' }}</td>
              <td class="text-center">{{ fmtDate(item.created_at) }}</td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-sm btn-secondary" @click="openDetailModal(item.id)">👁</button>
                  <button class="btn btn-sm btn-secondary" v-if="auth.can('production-plan.create') && item.status === 'DRAFT'" @click="openEditModal(item.id)">✏️</button>
                  <button class="btn btn-sm btn-primary" v-if="auth.can('production-plan.approve') && item.status === 'DRAFT'" @click="openAction('approve', item)">✅</button>
                  <button class="btn btn-sm btn-secondary" v-if="auth.can('production-plan.approve') && item.status !== 'APPROVED' && item.status !== 'CANCELLED'" @click="openAction('cancel', item)">🚫</button>
                  <button class="btn btn-sm btn-danger" v-if="auth.can('production-plan.create') && item.status === 'DRAFT'" @click="openAction('delete', item)">🗑️</button>
                </div>
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

    <BaseModal v-if="showFormModal" :title="editingId ? 'Edit Rencana Produksi' : 'Buat Rencana Produksi'" size="xl" @close="showFormModal = false">
      <div class="grid-3">
        <div class="form-group"><label class="form-label required">Bulan</label><input class="form-control" type="number" min="1" max="12" v-model="form.month" /></div>
        <div class="form-group"><label class="form-label required">Tahun</label><input class="form-control" type="number" min="1900" v-model="form.year" /></div>
        <div class="form-group"><label class="form-label">Status</label><input class="form-control" :value="editingId ? (form.status || 'DRAFT') : 'DRAFT'" disabled /></div>
      </div>
      <div class="form-group"><label class="form-label">Keterangan</label><textarea class="form-control" v-model="form.description"></textarea></div>

      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label class="form-label" style="margin:0">Detail Produksi</label>
          <button type="button" class="btn btn-sm btn-secondary" @click="addDetail">+ Tambah Item</button>
        </div>
        <table class="detail-table" style="table-layout:fixed;width:100%">
          <thead>
            <tr>
              <th style="width:16%">Kode Produksi</th>
              <th style="width:16%">Tanggal</th>
              <th style="width:28%">Produk</th>
              <th style="width:12%">Qty Rencana</th>
              <th style="width:12%">Qty Realisasi</th>
              <th>Keterangan</th>
              <th style="width:48px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in form.details" :key="i">
              <td><input class="form-control" v-model="d.production_code" /></td>
              <td><input class="form-control" type="date" v-model="d.production_date" /></td>
              <td><ProductSearchSelect v-model="d.product_id" /></td>
              <td><input class="form-control" type="number" min="0.01" step="0.01" v-model="d.planned_qty" /></td>
              <td><input class="form-control" :value="fmtNum(d.realized_qty || 0)" disabled /></td>
              <td><input class="form-control" v-model="d.note" /></td>
              <td><button class="btn btn-sm btn-danger" type="button" @click="removeDetail(i)">✕</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showFormModal = false">Batal</button>
        <button class="btn btn-primary" :disabled="saving" @click="submitForm"><span v-if="saving" class="spinner"></span><span v-else>{{ editingId ? 'Update' : 'Simpan Draft' }}</span></button>
      </template>
    </BaseModal>

    <BaseModal v-if="showDetailModal" title="Detail Rencana Produksi" size="xl" @close="showDetailModal = false">
      <div v-if="detailLoading" class="empty-state"><div class="empty-state-icon">⏳</div><h3>Memuat...</h3></div>
      <template v-else-if="detailItem">
        <div class="detail-info-grid" style="margin-bottom:16px">
          <div class="detail-info-item"><label>Nomor Rencana</label><p class="fw-700">{{ detailItem.plan_number }}</p></div>
          <div class="detail-info-item"><label>Status</label><p><span class="badge" :class="statusClass(detailItem.status)">{{ detailItem.status }}</span></p></div>
          <div class="detail-info-item"><label>Bulan/Tahun</label><p>{{ detailItem.month }}/{{ detailItem.year }}</p></div>
          <div class="detail-info-item"><label>Dibuat Oleh</label><p>{{ detailItem.creator?.name || '-' }}</p></div>
          <div class="detail-info-item"><label>Disetujui Oleh</label><p>{{ detailItem.approver?.name || '-' }}</p></div>
          <div class="detail-info-item"><label>Disetujui Pada</label><p>{{ fmtDate(detailItem.approved_at) }}</p></div>
          <div class="detail-info-item"><label>Keterangan</label><p>{{ detailItem.description || '-' }}</p></div>
        </div>

        <table class="detail-table">
          <thead><tr><th>Kode Produksi</th><th>Tanggal</th><th>Produk</th><th>Qty Rencana</th><th>Qty Realisasi</th><th>Keterangan</th></tr></thead>
          <tbody>
            <tr v-for="d in detailItem.details" :key="d.id">
              <td>{{ d.production_code }}</td>
              <td>{{ d.production_date }}</td>
              <td>{{ d.product?.name || d.product_id }}</td>
              <td>{{ fmtNum(d.planned_qty) }}</td>
              <td>{{ fmtNum(d.realized_qty) }}</td>
              <td>{{ d.note || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <template #footer>
        <button class="btn btn-secondary" @click="showDetailModal = false">Tutup</button>
        <button class="btn btn-secondary" v-if="detailItem?.status === 'DRAFT' && auth.can('production-plan.create')" @click="openEditModal(detailItem.id)">Ubah</button>
        <button class="btn btn-primary" v-if="detailItem?.status === 'DRAFT' && auth.can('production-plan.approve')" :disabled="actionLoading" @click="openAction('approve', detailItem)">Setujui</button>
        <button class="btn btn-secondary" v-if="detailItem && detailItem.status !== 'APPROVED' && detailItem.status !== 'CANCELLED' && auth.can('production-plan.approve')" :disabled="actionLoading" @click="openAction('cancel', detailItem)">Batal</button>
      </template>
    </BaseModal>

    <ConfirmDialog
      v-if="showConfirm"
      :loading="actionLoading"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-text="confirmButtonText"
      :confirm-button-class="confirmButtonClass"
      @confirm="handleAction"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import BaseModal from '@/components/BaseModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ProductSearchSelect from '@/components/ProductSearchSelect.vue'

const auth = useAuthStore()
const toast = useToastStore()

const items = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(15)
const search = ref('')
const monthFilter = ref('')
const yearFilter = ref('')
const statusFilter = ref('')
const loading = ref(false)

const showFormModal = ref(false)
const saving = ref(false)
const editingId = ref(null)

const showDetailModal = ref(false)
const detailLoading = ref(false)
const detailItem = ref(null)

const showConfirm = ref(false)
const actionLoading = ref(false)
const actionType = ref('')
const actionTarget = ref(null)

const form = ref({ month: '', year: '', description: '', details: [] })

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1)
const confirmTitle = computed(() => {
  if (actionType.value === 'delete') return 'Konfirmasi Hapus'
  if (actionType.value === 'approve') return 'Konfirmasi Persetujuan'
  if (actionType.value === 'cancel') return 'Konfirmasi Batal'
  return 'Konfirmasi'
})
const confirmMessage = computed(() => {
  if (actionType.value === 'delete') return 'Hapus rencana produksi ini?'
  if (actionType.value === 'approve') return 'Setujui rencana produksi ini? Setelah approve data menjadi read-only.'
  if (actionType.value === 'cancel') return 'Batalkan rencana produksi ini?'
  return 'Lanjutkan proses ini?'
})
const confirmButtonText = computed(() => {
  if (actionType.value === 'delete') return 'Hapus'
  if (actionType.value === 'approve') return 'Setujui'
  if (actionType.value === 'cancel') return 'Cancel'
  return 'Lanjutkan'
})
const confirmButtonClass = computed(() => {
  if (actionType.value === 'delete') return 'btn-danger'
  if (actionType.value === 'approve') return 'btn-primary'
  return 'btn-secondary'
})

const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID')
}
const fmtNum = (v) => Number(v || 0).toLocaleString('id-ID')
const statusClass = (s) => ({ DRAFT: 'badge-info', APPROVED: 'badge-success', CANCELLED: 'badge-danger' }[s] || 'badge-gray')

let timer
const debouncedFetch = () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; fetchItems() }, 300) }
const onFilterChange = () => { page.value = 1; fetchItems() }
const changePage = (p) => { page.value = p; fetchItems() }
const resetFilters = () => {
  search.value = ''
  monthFilter.value = ''
  yearFilter.value = ''
  statusFilter.value = ''
  page.value = 1
  fetchItems()
}

const resetForm = () => {
  const now = new Date()
  form.value = {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    description: '',
    details: [{ production_code: '', production_date: '', product_id: '', planned_qty: 1, realized_qty: 0, note: '' }],
  }
}

const addDetail = () => {
  form.value.details.push({ production_code: '', production_date: '', product_id: '', planned_qty: 1, realized_qty: 0, note: '' })
}

const removeDetail = (idx) => {
  if (form.value.details.length <= 1) return
  form.value.details.splice(idx, 1)
}

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/production-plans', {
      params: {
        page: page.value,
        limit: limit.value,
        search: search.value,
        status: statusFilter.value,
        month: monthFilter.value,
        year: yearFilter.value,
      },
    })
    items.value = r.data.data?.data || []
    total.value = r.data.data?.total || 0
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data production plans')
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingId.value = null
  resetForm()
  showFormModal.value = true
}

const openEditModal = async (id) => {
  showDetailModal.value = false
  editingId.value = id
  showFormModal.value = true
  saving.value = false
  try {
    const r = await api.get(`/production-plans/${id}`)
    const data = r.data.data
    form.value = {
      month: data.month,
      year: data.year,
      description: data.description || '',
      status: data.status,
      details: (data.details || []).map((d) => ({
        production_code: d.production_code,
        production_date: d.production_date,
        product_id: d.product_id,
        planned_qty: d.planned_qty,
        realized_qty: d.realized_qty,
        note: d.note || '',
      })),
    }
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data plan detail')
    showFormModal.value = false
  }
}

const openDetailModal = async (id) => {
  showDetailModal.value = true
  detailLoading.value = true
  detailItem.value = null
  try {
    const r = await api.get(`/production-plans/${id}`)
    detailItem.value = r.data.data
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data detail')
    showDetailModal.value = false
  } finally {
    detailLoading.value = false
  }
}

const submitForm = async () => {
  saving.value = true
  try {
    if (editingId.value) await api.put(`/production-plans/${editingId.value}`, form.value)
    else await api.post('/production-plans', form.value)

    toast.success(editingId.value ? 'Rencana produksi berhasil diupdate' : 'Rencana produksi berhasil dibuat')
    showFormModal.value = false
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan data data')
  } finally {
    saving.value = false
  }
}

const openAction = (type, item) => {
  actionType.value = type
  actionTarget.value = item
  showConfirm.value = true
}

const handleAction = async () => {
  if (!actionTarget.value) return
  actionLoading.value = true
  try {
    const id = actionTarget.value.id
    if (actionType.value === 'delete') {
      await api.delete(`/production-plans/${id}`)
      toast.success('Rencana produksi berhasil dihapus')
    } else if (actionType.value === 'approve') {
      await api.post(`/production-plans/${id}/approve`)
      toast.success('Rencana produksi berhasil di-approve')
    } else if (actionType.value === 'cancel') {
      await api.post(`/production-plans/${id}/cancel`)
      toast.success('Rencana produksi berhasil di-cancel')
    }

    showConfirm.value = false
    showDetailModal.value = false
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Aksi gagal')
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  resetForm()
  fetchItems()
})
</script>

<style scoped>
.filter-toolbar {
  display: grid;
  grid-template-columns: minmax(280px, 2fr) repeat(4, minmax(140px, 1fr));
  gap: 12px;
  align-items: end;
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.filter-search {
  min-width: 240px;
}
.filter-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}
.filter-actions .btn {
  width: 100%;
}
@media (max-width: 1200px) {
  .filter-toolbar {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}
</style>
