<template>
  <div>
    <div class="page-header">
      <div><div class="page-title">Employees</div></div>
      <button class="btn btn-primary" v-if="auth.can('employee.create')" @click="openCreate">+ Tambah Karyawan</button>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-control" v-model="search" placeholder="Cari berdasarkan kode, nama, no. HP..." @input="debouncedFetch" />
        </div>

        <select class="form-control" style="width: 180px" v-model="positionFilter" @change="handleFilterChange">
          <option value="">All Positions</option>
          <option v-for="p in positions" :key="p.id" :value="p.id">{{ p.code }} - {{ p.name }}</option>
        </select>

        <select class="form-control" style="width: 150px" v-model="statusFilter" @change="handleFilterChange">
          <option value="">Semua Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Kode Karyawan</th>
              <th>Nama</th>
              <th>Jabatan</th>
              <th>Gender</th>
              <th>No HP</th>
              <th>Gaji Pokok</th>
              <th>Status</th>
              <th>Data berhasil ditambahkan At</th>
              <th v-if="auth.can('employee.create')">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 10" :key="j"><div class="skeleton-cell"></div></td></tr>
            </template>
            <template v-else-if="items.length === 0">
              <tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon">👨‍💼</div><h3>No employees found</h3></div></td></tr>
            </template>
            <tr v-else v-for="(item, i) in items" :key="item.id">
              <td class="text-muted">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="fw-600">{{ item.employee_code }}</td>
              <td class="fw-600">{{ item.name }}</td>
              <td>{{ item.position_name || item.position?.name || '-' }}</td>
              <td>{{ item.gender || '-' }}</td>
              <td>{{ item.phone || '-' }}</td>
              <td>{{ fmtCurrency(item.basic_salary) }}</td>
              <td><span class="badge" :class="item.status === 'ACTIVE' ? 'badge-success' : 'badge-gray'">{{ item.status }}</span></td>
              <td>{{ fmtDate(item.created_at) }}</td>
              <td v-if="auth.can('employee.create')">
                <div class="action-btns">
                  <button class="btn btn-sm btn-secondary" @click="openEdit(item)">✏️</button>
                  <button class="btn btn-sm btn-danger" @click="openDelete(item)">🗑️</button>
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

    <BaseModal v-if="showForm" :title="editing ? 'Edit Karyawan' : 'Tambah Karyawan'" @close="showForm = false">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label required">Employee Code</label>
          <input class="form-control" v-model="form.employee_code" required />
        </div>
        <div class="form-group">
          <label class="form-label required">Nama</label>
          <input class="form-control" v-model="form.name" required />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Gender</label>
          <select class="form-control" v-model="form.gender">
            <option value="">-- Select Gender --</option>
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">No. HP</label>
          <input class="form-control" v-model="form.phone" />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label required">Jabatan</label>
          <PositionSearchSelect v-model="form.position_id" placeholder="-- Pilih Jabatan --" />
        </div>
        <div class="form-group">
          <label class="form-label">Basic Salary</label>
          <input class="form-control" type="number" min="0" step="0.01" v-model="form.basic_salary" />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label required">Status</label>
          <select class="form-control" v-model="form.status">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
        <div></div>
      </div>

      <div class="form-group">
        <label class="form-label">Alamat</label>
        <textarea class="form-control" v-model="form.address"></textarea>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showForm = false">Batal</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          <span v-if="saving" class="spinner"></span>
          <span v-else>Simpan</span>
        </button>
      </template>
    </BaseModal>

    <ConfirmDialog v-if="showDeleteConfirm" :loading="deleting" @confirm="doDelete" @cancel="showDeleteConfirm = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import PositionSearchSelect from '@/components/PositionSearchSelect.vue'
import api from '@/services/api'

const auth = useAuthStore()
const toast = useToastStore()

const items = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(15)
const search = ref('')
const positionFilter = ref('')
const statusFilter = ref('')
const positions = ref([])
const loading = ref(false)

const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const form = ref({
  employee_code: '',
  name: '',
  gender: '',
  phone: '',
  address: '',
  position_id: '',
  basic_salary: '',
  status: 'ACTIVE',
})

const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1)

const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID')
}

const fmtCurrency = (v) => {
  if (v === null || v === undefined || v === '') return '-'
  return 'Rp ' + Number(v).toLocaleString('id-ID')
}

let timer
const debouncedFetch = () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    fetchItems()
  }, 300)
}

const handleFilterChange = () => {
  page.value = 1
  fetchItems()
}

const fetchPositions = async () => {
  try {
    const r = await api.get('/master/positions/options', { params: { limit: 500 } })
    positions.value = r.data.data || []
  } catch {
    positions.value = []
  }
}

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/master/employees', {
      params: {
        page: page.value,
        limit: limit.value,
        search: search.value,
        position_id: positionFilter.value,
        status: statusFilter.value,
      },
    })
    items.value = r.data.data?.data || []
    total.value = r.data.data?.total || 0
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data karyawan')
  } finally {
    loading.value = false
  }
}

const changePage = (p) => {
  page.value = p
  fetchItems()
}

const openCreate = () => {
  editing.value = null
  form.value = {
    employee_code: '',
    name: '',
    gender: '',
    phone: '',
    address: '',
    position_id: '',
    basic_salary: '',
    status: 'ACTIVE',
  }
  showForm.value = true
}

const openEdit = (item) => {
  editing.value = item
  form.value = {
    employee_code: item.employee_code || '',
    name: item.name || '',
    gender: item.gender || '',
    phone: item.phone || '',
    address: item.address || '',
    position_id: item.position_id || '',
    basic_salary: item.basic_salary ?? '',
    status: item.status || 'ACTIVE',
  }
  showForm.value = true
}

const openDelete = (item) => {
  deleteTarget.value = item
  showDeleteConfirm.value = true
}

const save = async () => {
  if (!form.value.employee_code?.trim()) return toast.error('Kode karyawan wajib diisi')
  if (!form.value.name?.trim()) return toast.error('Nama karyawan wajib diisi')
  if (!form.value.position_id) return toast.error('Jabatan wajib dipilih')
  if (!form.value.status) return toast.error('Status wajib dipilih')
  if (form.value.basic_salary !== '' && Number(form.value.basic_salary) < 0) return toast.error('Basic salary must be >= 0')

  saving.value = true
  try {
    const payload = {
      employee_code: form.value.employee_code.trim(),
      name: form.value.name.trim(),
      gender: form.value.gender || null,
      phone: form.value.phone || null,
      address: form.value.address || null,
      position_id: form.value.position_id,
      basic_salary: form.value.basic_salary === '' ? null : Number(form.value.basic_salary),
      status: form.value.status,
    }

    if (editing.value) await api.put(`/master/employees/${editing.value.id}`, payload)
    else await api.post('/master/employees', payload)

    toast.success('Data berhasil disimpan')
    showForm.value = false
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan data karyawan')
  } finally {
    saving.value = false
  }
}

const doDelete = async () => {
  deleting.value = true
  try {
    await api.delete(`/master/employees/${deleteTarget.value.id}`)
    toast.success('Data berhasil dihapus')
    showDeleteConfirm.value = false
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal menghapus data karyawan')
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await fetchPositions()
  fetchItems()
})
</script>
