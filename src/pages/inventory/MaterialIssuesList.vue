<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Pengeluaran Bahan Baku</div>
        <div class="page-subtitle">Bukti Pengeluaran Gudang</div>
      </div>
      <button class="btn btn-primary" v-if="auth.can('material-issue.create')" @click="openCreateModal">+ Buat Bukti</button>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-control" v-model="search" placeholder="Cari nomor bukti, department, penerima..." @input="debouncedFetch" />
        </div>
        <select class="form-control" style="width: 170px" v-model="statusFilter" @change="onFilterChange">
          <option value="">Semua Status</option>
          <option value="DRAFT">DRAFT</option>
          <option value="APPROVED">APPROVED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nomor Bukti</th>
              <th>Tanggal</th>
              <th>Bagian</th>
              <th>Penerima</th>
              <th>Jabatan</th>
              <th>Status</th>
              <th>Data berhasil ditambahkan At</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 9" :key="j"><div class="skeleton-cell"></div></td></tr>
            </template>
            <template v-else-if="items.length === 0">
              <tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">📦</div><h3>No material issues found</h3></div></td></tr>
            </template>
            <tr v-else v-for="(item, i) in items" :key="item.id">
              <td class="text-muted">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="fw-600">{{ item.issue_number }}</td>
              <td>{{ fmtDate(item.date) }}</td>
              <td>{{ item.department }}</td>
              <td>{{ item.recipientEmployee?.name || '-' }}</td>
              <td>{{ item.recipientEmployee?.position?.name || '-' }}</td>
              <td><span class="badge" :class="statusClass(item.status)">{{ item.status }}</span></td>
              <td>{{ fmtDate(item.created_at) }}</td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-sm btn-secondary" @click="openDetailModal(item.id)">👁</button>
                  <button class="btn btn-sm btn-secondary" v-if="auth.can('material-issue.create') && item.status === 'DRAFT'" @click="openEditModal(item.id)">✏️</button>
                  <button class="btn btn-sm btn-primary" v-if="auth.can('material-issue.approve') && item.status === 'DRAFT'" @click="openAction('approve', item)">✅</button>
                  <button class="btn btn-sm btn-secondary" v-if="auth.can('material-issue.approve') && item.status !== 'APPROVED' && item.status !== 'CANCELLED'" @click="openAction('cancel', item)">🚫</button>
                  <button class="btn btn-sm btn-danger" v-if="auth.can('material-issue.create') && item.status === 'DRAFT'" @click="openAction('delete', item)">🗑️</button>
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

    <BaseModal v-if="showCreateModal" title="Buat Bukti Pengeluaran Gudang" size="xl" @close="showCreateModal = false">
      <div class="grid-3">
        <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="datetime-local" v-model="createForm.date" /></div>
        <div class="form-group"><label class="form-label required">Bulan</label><input class="form-control" type="number" min="1" max="12" v-model="createForm.month" /></div>
        <div class="form-group"><label class="form-label required">Tahun</label><input class="form-control" type="number" min="1900" v-model="createForm.year" /></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Bagian</label><input class="form-control" v-model="createForm.department" /></div>
        <div class="form-group">
          <label class="form-label required">Penerima</label>
          <select class="form-control" v-model="createForm.recipient_employee_id">
            <option value="">-- Pilih Karyawan --</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.employee_code }} - {{ e.name }}</option>
          </select>
          <div class="text-muted" style="margin-top:6px" v-if="selectedCreateEmployee">
            <div>Nama: <strong>{{ selectedCreateEmployee.name }}</strong></div>
            <div>Jabatan: <strong>{{ selectedCreateEmployee.position_name || selectedCreateEmployee.position?.name || '-' }}</strong></div>
          </div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Keterangan</label><textarea class="form-control" v-model="createForm.description"></textarea></div>
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label class="form-label" style="margin:0">Detail Item</label>
          <button type="button" class="btn btn-sm btn-secondary" @click="addDetail(createForm.details)">+ Tambah Item</button>
        </div>
        <table class="detail-table" style="table-layout:fixed;width:100%">
          <thead><tr><th style="width:30%">Bahan Baku</th><th style="width:18%">Satuan</th><th style="width:14%">Qty</th><th>Note</th><th style="width:48px"></th></tr></thead>
          <tbody>
            <tr v-for="(d, i) in createForm.details" :key="i">
              <td><RawMaterialSearchSelect v-model="d.raw_material_id" @update:modelValue="onRawMaterialSelected(d, $event)" /></td>
              <td><select class="form-control" v-model="d.unit_id"><option value="">-- Pilih Unit --</option><option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }}</option></select></td>
              <td><input class="form-control" type="number" min="0.01" step="0.01" v-model="d.qty" /></td>
              <td><input class="form-control" v-model="d.note" /></td>
              <td><button type="button" class="btn btn-sm btn-danger" @click="removeDetail(createForm.details, i)">✕</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showCreateModal = false">Batal</button>
        <button class="btn btn-primary" :disabled="createSaving" @click="submitCreate"><span v-if="createSaving" class="spinner"></span><span v-else>Simpan Draft</span></button>
      </template>
    </BaseModal>

    <BaseModal v-if="showEditModal" title="Edit Bukti Pengeluaran Gudang" size="xl" @close="showEditModal = false">
      <div v-if="editLoading" class="empty-state"><div class="empty-state-icon">⏳</div><h3>Memuat...</h3></div>
      <template v-else>
        <div class="grid-3">
          <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="datetime-local" v-model="editForm.date" /></div>
          <div class="form-group"><label class="form-label required">Bulan</label><input class="form-control" type="number" min="1" max="12" v-model="editForm.month" /></div>
          <div class="form-group"><label class="form-label required">Tahun</label><input class="form-control" type="number" min="1900" v-model="editForm.year" /></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label required">Bagian</label><input class="form-control" v-model="editForm.department" /></div>
          <div class="form-group">
            <label class="form-label required">Penerima</label>
            <select class="form-control" v-model="editForm.recipient_employee_id">
              <option value="">-- Pilih Karyawan --</option>
              <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.employee_code }} - {{ e.name }}</option>
            </select>
            <div class="text-muted" style="margin-top:6px" v-if="selectedEditEmployee">
              <div>Nama: <strong>{{ selectedEditEmployee.name }}</strong></div>
              <div>Jabatan: <strong>{{ selectedEditEmployee.position_name || selectedEditEmployee.position?.name || '-' }}</strong></div>
            </div>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Keterangan</label><textarea class="form-control" v-model="editForm.description"></textarea></div>
        <div class="form-group">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <label class="form-label" style="margin:0">Detail Item</label>
            <button type="button" class="btn btn-sm btn-secondary" @click="addDetail(editForm.details)">+ Tambah Item</button>
          </div>
          <table class="detail-table" style="table-layout:fixed;width:100%">
            <thead><tr><th style="width:30%">Bahan Baku</th><th style="width:18%">Satuan</th><th style="width:14%">Qty</th><th>Note</th><th style="width:48px"></th></tr></thead>
            <tbody>
              <tr v-for="(d, i) in editForm.details" :key="i">
                <td><RawMaterialSearchSelect v-model="d.raw_material_id" @update:modelValue="onRawMaterialSelected(d, $event)" /></td>
                <td><select class="form-control" v-model="d.unit_id"><option value="">-- Pilih Unit --</option><option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }}</option></select></td>
                <td><input class="form-control" type="number" min="0.01" step="0.01" v-model="d.qty" /></td>
                <td><input class="form-control" v-model="d.note" /></td>
                <td><button type="button" class="btn btn-sm btn-danger" @click="removeDetail(editForm.details, i)">✕</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #footer>
        <button class="btn btn-secondary" @click="showEditModal = false">Batal</button>
        <button class="btn btn-primary" :disabled="editSaving || editLoading" @click="submitEdit"><span v-if="editSaving" class="spinner"></span><span v-else>Perbarui</span></button>
      </template>
    </BaseModal>

    <BaseModal v-if="showDetailModal" title="Detail Bukti Pengeluaran Gudang" size="xl" @close="showDetailModal = false">
      <div v-if="detailLoading" class="empty-state"><div class="empty-state-icon">⏳</div><h3>Memuat...</h3></div>
      <template v-else-if="detailItem">
        <div class="detail-info-grid" style="margin-bottom:16px">
          <div class="detail-info-item"><label>Nomor Bukti</label><p class="fw-700">{{ detailItem.issue_number }}</p></div>
          <div class="detail-info-item"><label>Status</label><p><span class="badge" :class="statusClass(detailItem.status)">{{ detailItem.status }}</span></p></div>
          <div class="detail-info-item"><label>Tanggal</label><p>{{ fmtDate(detailItem.date) }}</p></div>
          <div class="detail-info-item"><label>Bagian</label><p>{{ detailItem.department }}</p></div>
          <div class="detail-info-item"><label>Penerima</label><p>{{ detailItem.recipientEmployee?.name || '-' }}</p></div>
          <div class="detail-info-item"><label>Jabatan</label><p>{{ detailItem.recipientEmployee?.position?.name || '-' }}</p></div>
          <div class="detail-info-item"><label>Dibuat Oleh</label><p>{{ detailItem.creator?.name || '-' }}</p></div>
          <div class="detail-info-item"><label>Disetujui By</label><p>{{ detailItem.approver?.name || '-' }}</p></div>
          <div class="detail-info-item"><label>Disetujui At</label><p>{{ fmtDate(detailItem.approved_at) }}</p></div>
          <div class="detail-info-item"><label>Keterangan</label><p>{{ detailItem.description || '-' }}</p></div>
        </div>

        <table class="detail-table">
          <thead><tr><th>Bahan Baku</th><th>Satuan</th><th>Qty</th><th>Note</th></tr></thead>
          <tbody><tr v-for="d in detailItem.details" :key="d.id"><td>{{ d.rawMaterial?.name || d.raw_material_id }}</td><td>{{ d.unit?.name || d.unit_id }}</td><td>{{ d.qty }}</td><td>{{ d.note || '-' }}</td></tr></tbody>
        </table>
      </template>

      <template #footer>
        <button class="btn btn-secondary" @click="showDetailModal = false">Tutup</button>
        <button class="btn btn-secondary" v-if="detailItem?.status === 'APPROVED' && auth.can('report.material-issues')" @click="openPrint(detailItem.id)">🖨 Print</button>
        <button class="btn btn-secondary" v-if="detailItem?.status === 'DRAFT' && auth.can('material-issue.create')" @click="openEditModal(detailItem.id)">Edit</button>
        <button class="btn btn-primary" v-if="detailItem?.status === 'DRAFT' && auth.can('material-issue.approve')" :disabled="actionLoading" @click="openAction('approve', detailItem)">Setujui</button>
        <button class="btn btn-secondary" v-if="detailItem && detailItem.status !== 'APPROVED' && detailItem.status !== 'CANCELLED' && auth.can('material-issue.approve')" :disabled="actionLoading" @click="openAction('cancel', detailItem)">Batal</button>
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
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import RawMaterialSearchSelect from '@/components/RawMaterialSearchSelect.vue'
import api from '@/services/api'

const auth = useAuthStore()
const toast = useToastStore()

const items = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(15)
const search = ref('')
const statusFilter = ref('')
const loading = ref(false)

const showConfirm = ref(false)
const actionLoading = ref(false)
const actionType = ref('')
const actionTarget = ref(null)

const showCreateModal = ref(false)
const createSaving = ref(false)
const showEditModal = ref(false)
const editLoading = ref(false)
const editSaving = ref(false)
const editId = ref(null)
const showDetailModal = ref(false)
const detailLoading = ref(false)
const detailItem = ref(null)

const employees = ref([])
const rawMaterials = ref([])
const units = ref([])

const createForm = ref({ date: '', month: '', year: '', department: '', recipient_employee_id: '', description: '', details: [{ raw_material_id: '', unit_id: '', qty: 1, note: '' }] })
const editForm = ref({ date: '', month: '', year: '', department: '', recipient_employee_id: '', description: '', details: [{ raw_material_id: '', unit_id: '', qty: 1, note: '' }] })

const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1)
const selectedCreateEmployee = computed(() => employees.value.find(e => e.id === Number(createForm.value.recipient_employee_id)) || null)
const selectedEditEmployee = computed(() => employees.value.find(e => e.id === Number(editForm.value.recipient_employee_id)) || null)

const confirmTitle = computed(() => {
  if (actionType.value === 'delete') return 'Konfirmasi Hapus'
  if (actionType.value === 'approve') return 'Konfirmasi Persetujuan'
  if (actionType.value === 'cancel') return 'Konfirmasi Pembatalan'
  return 'Konfirmasi'
})
const confirmMessage = computed(() => {
  if (actionType.value === 'delete') return 'Hapus bukti pengeluaran ini?'
  if (actionType.value === 'approve') return 'Setujui bukti pengeluaran ini? Stok akan berkurang.'
  if (actionType.value === 'cancel') return 'Cancel bukti pengeluaran ini?'
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

const statusClass = (s) => ({ DRAFT: 'badge-info', APPROVED: 'badge-success', CANCELLED: 'badge-danger' }[s] || 'badge-gray')

const toDateTimeLocal = (value) => {
  const d = new Date(value)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

let timer
const debouncedFetch = () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; fetchItems() }, 300) }
const onFilterChange = () => { page.value = 1; fetchItems() }

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/material-issues', { params: { page: page.value, limit: limit.value, search: search.value, status: statusFilter.value } })
    items.value = r.data.data?.data || []
    total.value = r.data.data?.total || 0
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data material issues')
  } finally {
    loading.value = false
  }
}

const fetchMasters = async () => {
  try {
    const [empRes, rmRes, unitRes] = await Promise.all([
      api.get('/master/employees', { params: { limit: 500 } }),
      api.get('/master/raw-materials', { params: { limit: 500 } }),
      api.get('/master/units', { params: { limit: 500 } }),
    ])
    employees.value = empRes.data.data?.data || []
    rawMaterials.value = rmRes.data.data?.data || []
    units.value = unitRes.data.data?.data || []
  } catch {
    toast.error('Gagal memuat data master data')
  }
}

const changePage = (p) => { page.value = p; fetchItems() }

const resetForm = (formRef) => {
  const now = new Date()
  formRef.value = {
    date: toDateTimeLocal(now),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    department: '',
    recipient_employee_id: '',
    description: '',
    details: [{ raw_material_id: '', unit_id: '', qty: 1, note: '' }],
  }
}

const openCreateModal = async () => {
  if (!employees.value.length || !rawMaterials.value.length || !units.value.length) await fetchMasters()
  resetForm(createForm)
  showCreateModal.value = true
}

const addDetail = (details) => { details.push({ raw_material_id: '', unit_id: '', qty: 1, note: '' }) }
const removeDetail = (details, idx) => { details.splice(idx, 1) }

const onRawMaterialSelected = (detail, rawMaterialId) => {
  detail.raw_material_id = rawMaterialId
  const raw = rawMaterials.value.find(r => r.id === Number(rawMaterialId))
  if (raw?.unit_id) detail.unit_id = raw.unit_id
}

const validateForm = (formObj) => {
  if (!formObj.date) return 'Tanggal wajib diisi'
  if (!formObj.month) return 'Bulan wajib diisi'
  if (!formObj.year) return 'Tahun wajib diisi'
  if (!formObj.department?.trim()) return 'Bagian wajib diisi'
  if (!formObj.recipient_employee_id) return 'Penerima wajib dipilih'
  if (!formObj.details.length) return 'Minimal 1 detail item'
  for (const d of formObj.details) {
    if (!d.raw_material_id) return 'Bahan baku wajib dipilih'
    if (!d.unit_id) return 'Satuan wajib dipilih'
    if (!Number(d.qty) || Number(d.qty) <= 0) return 'Qty harus > 0'
  }
  return ''
}

const toPayload = (formObj) => ({
  date: formObj.date,
  month: Number(formObj.month),
  year: Number(formObj.year),
  department: formObj.department.trim(),
  recipient_employee_id: Number(formObj.recipient_employee_id),
  description: formObj.description || null,
  details: formObj.details.map(d => ({ raw_material_id: Number(d.raw_material_id), unit_id: Number(d.unit_id), qty: Number(d.qty), note: d.note || null })),
})

const submitCreate = async () => {
  const err = validateForm(createForm.value)
  if (err) return toast.error(err)
  createSaving.value = true
  try {
    await api.post('/material-issues', toPayload(createForm.value))
    toast.success('Data berhasil ditambahkan')
    showCreateModal.value = false
    page.value = 1
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal menambah data')
  } finally {
    createSaving.value = false
  }
}

const openDetailModal = async (id) => {
  showDetailModal.value = true
  detailLoading.value = true
  detailItem.value = null
  try {
    const r = await api.get(`/material-issues/${id}`)
    detailItem.value = r.data.data
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data detail')
    showDetailModal.value = false
  } finally {
    detailLoading.value = false
  }
}

const openEditModal = async (id) => {
  if (!employees.value.length || !rawMaterials.value.length || !units.value.length) await fetchMasters()
  showEditModal.value = true
  editLoading.value = true
  editId.value = id
  try {
    const r = await api.get(`/material-issues/${id}`)
    const data = r.data.data
    if (data.status !== 'DRAFT') {
      toast.error('Hanya dokumen DRAFT yang dapat diedit')
      showEditModal.value = false
      return
    }
    editForm.value = {
      date: toDateTimeLocal(data.date),
      month: data.month,
      year: data.year,
      department: data.department || '',
      recipient_employee_id: data.recipient_employee_id || '',
      description: data.description || '',
      details: (data.details || []).map(d => ({ raw_material_id: d.raw_material_id, unit_id: d.unit_id, qty: d.qty, note: d.note || '' })),
    }
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data edit data')
    showEditModal.value = false
  } finally {
    editLoading.value = false
  }
}

const submitEdit = async () => {
  const err = validateForm(editForm.value)
  if (err) return toast.error(err)
  editSaving.value = true
  try {
    await api.put(`/material-issues/${editId.value}`, toPayload(editForm.value))
    toast.success('Data berhasil diperbarui')
    showEditModal.value = false
    fetchItems()
    if (detailItem.value?.id === editId.value) {
      await openDetailModal(editId.value)
    }
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memperbarui data')
  } finally {
    editSaving.value = false
  }
}

const openPrint = (id) => {
  window.open(`/print/material-issue?id=${id}`, '_blank')
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
    if (actionType.value === 'delete') {
      await api.delete(`/material-issues/${actionTarget.value.id}`)
      toast.success('Data berhasil dihapus')
      if (detailItem.value?.id === actionTarget.value.id) showDetailModal.value = false
    }
    if (actionType.value === 'approve') {
      await api.post(`/material-issues/${actionTarget.value.id}/approve`)
      toast.success('Disetujui')
      if (detailItem.value?.id === actionTarget.value.id) await openDetailModal(actionTarget.value.id)
    }
    if (actionType.value === 'cancel') {
      await api.post(`/material-issues/${actionTarget.value.id}/cancel`)
      toast.success('Cancelled')
      if (detailItem.value?.id === actionTarget.value.id) await openDetailModal(actionTarget.value.id)
    }
    showConfirm.value = false
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Aksi gagal')
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  fetchItems()
  fetchMasters()
})
</script>
