<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Penerimaan Barang Jadi</div>
        <div class="page-subtitle">Transaksi penerimaan hasil produksi ke gudang</div>
      </div>
      <button v-if="auth.can('finished-goods-receipt.create')" class="btn btn-primary" @click="openCreateModal">+ Buat Penerimaan</button>
    </div>

    <div class="card">
      <div class="card-header filter-toolbar">
        <div class="filter-field filter-search">
          <label class="filter-label">Pencarian</label>
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input class="form-control" v-model="search" placeholder="Nomor penerimaan / keterangan / pembuat" @input="debouncedFetch" />
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
              <th>Nomor Penerimaan</th>
              <th>Tanggal</th>
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
              <tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 9" :key="j"><div class="skeleton-cell"></div></td></tr>
            </template>
            <template v-else-if="items.length === 0">
              <tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">📥</div><h3>Tidak ada penerimaan barang jadi</h3></div></td></tr>
            </template>
            <tr v-else v-for="(item, i) in items" :key="item.id">
              <td class="text-muted">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="fw-600">{{ item.receipt_number }}</td>
              <td>{{ fmtDate(item.date) }}</td>
              <td class="text-center">{{ item.month }}</td>
              <td class="text-center">{{ item.year }}</td>
              <td><span class="badge" :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ item.creator?.name || '-' }}</td>
              <td class="text-center">{{ fmtDate(item.created_at) }}</td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-sm btn-secondary" @click="openDetailModal(item.id)">👁</button>
                  <button class="btn btn-sm btn-secondary" v-if="auth.can('finished-goods-receipt.create') && item.status === 'DRAFT'" @click="openEditModal(item.id)">✏️</button>
                  <button class="btn btn-sm btn-primary" v-if="auth.can('finished-goods-receipt.approve') && item.status === 'DRAFT'" @click="openAction('approve', item)">✅</button>
                  <button class="btn btn-sm btn-secondary" v-if="auth.can('finished-goods-receipt.approve') && item.status === 'APPROVED'" @click="openAction('cancel', item)">🚫</button>
                  <button class="btn btn-sm btn-danger" v-if="auth.can('finished-goods-receipt.create') && item.status === 'DRAFT'" @click="openAction('delete', item)">🗑️</button>
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

    <BaseModal v-if="showFormModal" :title="editingId ? 'Edit Penerimaan Barang Jadi' : 'Buat Penerimaan Barang Jadi'" size="xl" @close="showFormModal = false">
      <div class="grid-3">
        <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="datetime-local" v-model="form.date" /></div>
        <div class="form-group"><label class="form-label required">Bulan</label><input class="form-control" type="number" min="1" max="12" v-model="form.month" /></div>
        <div class="form-group"><label class="form-label required">Tahun</label><input class="form-control" type="number" min="1900" v-model="form.year" /></div>
      </div>
      <div class="form-group"><label class="form-label">Keterangan</label><textarea class="form-control" v-model="form.description"></textarea></div>

      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label class="form-label" style="margin:0">Detail Penerimaan</label>
          <button type="button" class="btn btn-sm btn-secondary" @click="addDetail">+ Tambah Item</button>
        </div>
        <table class="detail-table" style="table-layout:fixed;width:100%">
          <thead>
            <tr>
              <th style="width:30%">Sumber Produksi (Opsional)</th>
              <th style="width:20%">Produk</th>
              <th style="width:11%">Qty Diterima</th>
              <th style="width:18%">Satuan</th>
              <th style="width:11%">Base Qty</th>
              <th>Keterangan</th>
              <th style="width:48px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in form.details" :key="i">
              <td>
                <select class="form-control" v-model="d.production_plan_detail_id" @change="onSourceChange(d)">
                  <option value="">-- Tanpa Referensi --</option>
                  <option v-for="s in sourceOptions" :key="s.id" :value="s.id">
                    {{ s.plan_number }} | {{ s.production_code }} | {{ s.product_name }} | Real: {{ fmtNum(s.realized_qty) }} | Sisa: {{ fmtNum(s.remaining_qty) }}
                  </option>
                </select>
              </td>
              <td><ProductSearchSelect v-model="d.product_id" /></td>
              <td><input class="form-control" type="number" min="0.01" step="0.01" v-model="d.qty_received" /></td>
              <td><ItemUnitSelect item-type="PRODUCT" :item-id="d.product_id" v-model="d.unit_id" @conversion-change="(c)=>onConversionChange(d,c)" /></td>
              <td>{{ fmtNum(Number(d.qty_received || 0) * Number(d.conversion_qty || 1)) }}</td>
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

    <BaseModal v-if="showDetailModal" title="Detail Penerimaan Barang Jadi" size="xl" @close="showDetailModal = false">
      <div v-if="detailLoading" class="empty-state"><div class="empty-state-icon">⏳</div><h3>Memuat...</h3></div>
      <template v-else-if="detailItem">
        <div class="detail-info-grid" style="margin-bottom:16px">
          <div class="detail-info-item"><label>Nomor Penerimaan</label><p class="fw-700">{{ detailItem.receipt_number }}</p></div>
          <div class="detail-info-item"><label>Status</label><p><span class="badge" :class="statusClass(detailItem.status)">{{ detailItem.status }}</span></p></div>
          <div class="detail-info-item"><label>Tanggal</label><p>{{ fmtDate(detailItem.date) }}</p></div>
          <div class="detail-info-item"><label>Bulan/Tahun</label><p>{{ detailItem.month }}/{{ detailItem.year }}</p></div>
          <div class="detail-info-item"><label>Dibuat Oleh</label><p>{{ detailItem.creator?.name || '-' }}</p></div>
          <div class="detail-info-item"><label>Disetujui Oleh</label><p>{{ detailItem.approver?.name || '-' }}</p></div>
          <div class="detail-info-item"><label>Keterangan</label><p>{{ detailItem.description || '-' }}</p></div>
        </div>

        <table class="detail-table">
          <thead><tr><th>Produk</th><th>Referensi Kode Produksi</th><th>Qty Transaksi</th><th>Base Qty</th><th>Keterangan</th></tr></thead>
          <tbody>
            <tr v-for="d in detailItem.details" :key="d.id">
              <td>{{ d.product?.name || d.product_id }}</td>
              <td>{{ d.productionPlanDetail?.production_code || '-' }}</td>
              <td>{{ fmtNum(d.qty_received) }} {{ d.unit?.name || '' }}</td>
              <td>{{ fmtNum(d.base_qty_received || d.qty_received) }}</td>
              <td>{{ d.note || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <template #footer>
        <button class="btn btn-secondary" @click="showDetailModal = false">Tutup</button>
        <button class="btn btn-secondary" v-if="detailItem?.status === 'DRAFT' && auth.can('finished-goods-receipt.create')" @click="openEditModal(detailItem.id)">Ubah</button>
        <button class="btn btn-primary" v-if="detailItem?.status === 'DRAFT' && auth.can('finished-goods-receipt.approve')" :disabled="actionLoading" @click="openAction('approve', detailItem)">Setujui</button>
        <button class="btn btn-secondary" v-if="detailItem?.status === 'APPROVED' && auth.can('finished-goods-receipt.approve')" :disabled="actionLoading" @click="openAction('cancel', detailItem)">Batal</button>
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
import ItemUnitSelect from '@/components/ItemUnitSelect.vue'

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

const sourceOptions = ref([])

const form = ref({ date: '', month: '', year: '', description: '', details: [] })

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
  if (actionType.value === 'delete') return 'Hapus penerimaan ini?'
  if (actionType.value === 'approve') return 'Setujui penerimaan ini? Stok produk akan bertambah.'
  if (actionType.value === 'cancel') return 'Batalkan penerimaan ini? Stok barang jadi akan direverse.'
  return 'Lanjutkan proses ini?'
})
const confirmButtonText = computed(() => {
  if (actionType.value === 'delete') return 'Hapus'
  if (actionType.value === 'approve') return 'Setujui'
  if (actionType.value === 'cancel') return 'Batalkan'
  return 'Lanjutkan'
})
const confirmButtonClass = computed(() => {
  if (actionType.value === 'delete') return 'btn-danger'
  if (actionType.value === 'approve') return 'btn-primary'
  return 'btn-secondary'
})

const toDateTimeLocal = (value) => {
  const d = new Date(value)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

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
    date: toDateTimeLocal(now),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    description: '',
    details: [{ production_plan_detail_id: '', product_id: '', qty_received: 1, unit_id: '', conversion_qty: 1, note: '' }],
  }
}

const onConversionChange = (row, c) => { row.conversion_qty = Number(c?.conversion_qty || 1) }
const addDetail = () => form.value.details.push({ production_plan_detail_id: '', product_id: '', qty_received: 1, unit_id: '', conversion_qty: 1, note: '' })
const removeDetail = (idx) => {
  if (form.value.details.length <= 1) return
  form.value.details.splice(idx, 1)
}

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/finished-goods-receipts', {
      params: {
        page: page.value,
        limit: limit.value,
        search: search.value,
        month: monthFilter.value,
        year: yearFilter.value,
        status: statusFilter.value,
      },
    })
    items.value = r.data.data?.data || []
    total.value = r.data.data?.total || 0
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data finished goods receipts')
  } finally {
    loading.value = false
  }
}

const fetchSourceOptions = async () => {
  try {
    const r = await api.get('/finished-goods-receipts/source-options', { params: { limit: 500 } })
    sourceOptions.value = r.data.data || []
  } catch {
    toast.error('Gagal memuat data source options')
  }
}

const onSourceChange = (detail) => {
  const selected = sourceOptions.value.find((s) => s.id === Number(detail.production_plan_detail_id))
  if (selected) detail.product_id = selected.product_id
}

const openCreateModal = async () => {
  editingId.value = null
  resetForm()
  await fetchSourceOptions()
  showFormModal.value = true
}

const openEditModal = async (id) => {
  showDetailModal.value = false
  editingId.value = id
  showFormModal.value = true
  saving.value = false
  try {
    await fetchSourceOptions()
    const r = await api.get(`/finished-goods-receipts/${id}`)
    const data = r.data.data
    form.value = {
      date: toDateTimeLocal(data.date),
      month: data.month,
      year: data.year,
      description: data.description || '',
      details: (data.details || []).map((d) => ({
        production_plan_detail_id: d.production_plan_detail_id || '',
        product_id: d.product_id,
        qty_received: d.qty_received,
        unit_id: d.unit_id || '',
        conversion_qty: Number(d.conversion_qty || 1),
        note: d.note || '',
      })),
    }
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data receipt detail')
    showFormModal.value = false
  }
}

const openDetailModal = async (id) => {
  showDetailModal.value = true
  detailLoading.value = true
  detailItem.value = null
  try {
    const r = await api.get(`/finished-goods-receipts/${id}`)
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
    if (editingId.value) await api.put(`/finished-goods-receipts/${editingId.value}`, form.value)
    else await api.post('/finished-goods-receipts', form.value)

    toast.success(editingId.value ? 'Penerimaan berhasil diupdate' : 'Penerimaan berhasil dibuat')
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
      await api.delete(`/finished-goods-receipts/${id}`)
      toast.success('Penerimaan berhasil dihapus')
    } else if (actionType.value === 'approve') {
      await api.post(`/finished-goods-receipts/${id}/approve`)
      toast.success('Penerimaan berhasil di-approve')
    } else if (actionType.value === 'cancel') {
      const cancel_reason = prompt('Alasan pembatalan:')
      if (cancel_reason === null) return
      await api.post(`/finished-goods-receipts/${id}/cancel`, { cancel_reason })
      toast.success('Penerimaan berhasil di-cancel')
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
