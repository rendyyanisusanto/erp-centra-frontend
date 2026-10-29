<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Salesmen</div>
        <div class="page-subtitle">Kelola data master sales / tenaga penjual</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" v-if="auth.can('salesman.create')" @click="openImport">📥 Import</button>
        <button class="btn btn-primary" v-if="auth.can('salesman.create')" @click="openCreate">+ Tambah Sales</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-control" v-model="search" placeholder="Cari berdasarkan kode, nama, no. HP..." @input="debouncedFetch" />
        </div>
        <select class="form-control" style="width:170px" v-model="activeFilter" @change="fetchItems">
          <option value="">Semua Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Kode</th>
              <th>Nama</th>
              <th>No. HP</th>
              <th>Status</th>
              <th>Alamat</th>
              <th v-if="auth.can('salesman.create')">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr class="skeleton-row" v-for="i in 5" :key="i">
                <td v-for="j in 7" :key="j"><div class="skeleton-cell"></div></td>
              </tr>
            </template>
            <template v-else-if="items.length === 0">
              <tr>
                <td colspan="7">
                  <div class="empty-state">
                    <div class="empty-state-icon">🧑</div>
                    <h3>Tidak ada data sales</h3>
                    <p>Tambahkan tenaga penjual pertama Anda.</p>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-else v-for="(item, i) in items" :key="item.id">
              <td class="text-muted">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="fw-600">{{ item.code }}</td>
              <td class="fw-600">{{ item.name }}</td>
              <td>{{ item.phone || '-' }}</td>
              <td><span class="badge" :class="item.is_active ? 'badge-success' : 'badge-gray'">{{ item.is_active ? 'ACTIVE' : 'INACTIVE' }}</span></td>
              <td class="text-muted">{{ item.address || '-' }}</td>
              <td v-if="auth.can('salesman.create')">
                <div class="action-btns">
                  <button class="btn btn-sm btn-secondary" @click="openEdit(item)">✏️ Edit</button>
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

    <!-- Modal Form Tambah / Edit -->
    <BaseModal v-if="showForm" :title="editing ? 'Edit Sales' : 'Tambah Sales'" size="md" @close="showForm = false">
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Kode</label><input class="form-control" v-model="form.code" required /></div>
        <div class="form-group"><label class="form-label required">Nama</label><input class="form-control" v-model="form.name" required /></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">No. HP</label><input class="form-control" v-model="form.phone" /></div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" v-model="form.is_active">
            <option :value="true">Active</option>
            <option :value="false">Inactive</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Alamat</label><textarea class="form-control" rows="3" v-model="form.address"></textarea></div>
      <template #footer>
        <button class="btn btn-secondary" @click="showForm = false">Batal</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          <span v-if="saving" class="spinner"></span><span v-else>Simpan</span>
        </button>
      </template>
    </BaseModal>

    <!-- Modal Import -->
    <BaseModal v-if="showImport" title="Import Data Sales" size="md" @close="closeImport">
      <div class="form-group">
        <label class="form-label fw-600">Langkah 1: Unduh Template Excel</label>
        <p class="text-muted" style="margin-bottom:8px;font-size:13px">
          Unduh template Excel yang telah disiapkan agar format data sesuai dengan sistem.
        </p>
        <button type="button" class="btn btn-secondary" :disabled="downloadingTemplate" @click="downloadTemplate">
          <span v-if="downloadingTemplate" class="spinner"></span>
          <span v-else>📥 Unduh Template Excel</span>
        </button>
      </div>

      <hr style="border:0;border-top:1px solid var(--color-border);margin:16px 0" />

      <div class="form-group">
        <label class="form-label fw-600 required">Langkah 2: Pilih File Excel</label>
        <p class="text-muted" style="margin-bottom:8px;font-size:13px">
          Pilih file Excel (.xlsx / .xls) yang berisi data sales untuk diimpor.
        </p>
        <input
          type="file"
          ref="fileInputRef"
          accept=".xlsx, .xls"
          class="form-control"
          :disabled="importing"
          @change="onFileSelected"
        />
        <div v-if="importError" class="form-error">{{ importError }}</div>
        <div v-else-if="parsedRows.length > 0" class="text-success" style="font-size:12.5px;margin-top:6px;font-weight:500">
          ✓ {{ parsedRows.length }} baris data siap diimpor dari file "{{ selectedFileName }}"
        </div>
      </div>

      <div v-if="parsedRows.length > 0" class="form-group">
        <label class="form-label" style="font-size:12px;color:var(--color-text-muted)">Preview Data (Maks. 3 baris):</label>
        <div class="table-wrapper" style="max-height:140px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius)">
          <table class="detail-table" style="font-size:12px">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>No. HP</th>
                <th>Status</th>
                <th>Alamat</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in parsedRows.slice(0, 3)" :key="idx">
                <td class="fw-600">{{ row.code }}</td>
                <td>{{ row.name }}</td>
                <td>{{ row.phone || '-' }}</td>
                <td><span class="badge" :class="row.is_active ? 'badge-success' : 'badge-gray'">{{ row.is_active ? 'ACTIVE' : 'INACTIVE' }}</span></td>
                <td>{{ row.address || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #footer>
        <button class="btn btn-secondary" :disabled="importing" @click="closeImport">Batal</button>
        <button class="btn btn-primary" :disabled="importing || parsedRows.length === 0" @click="doImport">
          <span v-if="importing" class="spinner"></span>
          <span v-else>Import Data</span>
        </button>
      </template>
    </BaseModal>

    <ConfirmDialog v-if="showDeleteConfirm" :loading="deleting" @confirm="doDelete" @cancel="showDeleteConfirm = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import api from '@/services/api'

const auth = useAuthStore()
const toast = useToastStore()

const items = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(15)
const search = ref('')
const activeFilter = ref('')
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const editing = ref(null)
const form = ref({ code: '', name: '', phone: '', address: '', is_active: true })
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const showImport = ref(false)
const importing = ref(false)
const downloadingTemplate = ref(false)
const fileInputRef = ref(null)
const selectedFileName = ref('')
const parsedRows = ref([])
const importError = ref('')

const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1)
let dt
const debouncedFetch = () => { clearTimeout(dt); dt = setTimeout(() => { page.value = 1; fetchItems() }, 300) }

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/master/salesmen', { params: { page: page.value, limit: limit.value, search: search.value, is_active: activeFilter.value } })
    items.value = r.data.data.data
    total.value = r.data.data.total
  } catch (e) {
    toast.error('Terjadi kesalahan')
  } finally {
    loading.value = false
  }
}

const changePage = (p) => { page.value = p; fetchItems() }

const openCreate = () => {
  editing.value = null
  form.value = { code: '', name: '', phone: '', address: '', is_active: true }
  showForm.value = true
}

const openEdit = (item) => {
  editing.value = item
  form.value = { code: item.code, name: item.name, phone: item.phone || '', address: item.address || '', is_active: !!item.is_active }
  showForm.value = true
}

const openDelete = (item) => { deleteTarget.value = item; showDeleteConfirm.value = true }

const save = async () => {
  if (!form.value.code?.trim()) return toast.error('Kode sales wajib diisi.')
  if (!form.value.name?.trim()) return toast.error('Nama sales wajib diisi.')
  saving.value = true
  try {
    if (editing.value) await api.put(`/master/salesmen/${editing.value.id}`, form.value)
    else await api.post('/master/salesmen', form.value)
    toast.success('Data berhasil disimpan')
    showForm.value = false
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Terjadi kesalahan')
  } finally {
    saving.value = false
  }
}

const doDelete = async () => {
  deleting.value = true
  try {
    await api.delete(`/master/salesmen/${deleteTarget.value.id}`)
    toast.success('Data berhasil dihapus')
    showDeleteConfirm.value = false
    fetchItems()
  } catch (e) {
    toast.error('Terjadi kesalahan')
  } finally {
    deleting.value = false
  }
}

const openImport = () => {
  showImport.value = true
  importError.value = ''
  parsedRows.value = []
  selectedFileName.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const closeImport = () => {
  showImport.value = false
  importError.value = ''
  parsedRows.value = []
  selectedFileName.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const downloadTemplate = async () => {
  downloadingTemplate.value = true
  try {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Centra ERP'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Template Sales')
    sheet.columns = [
      { header: 'Kode Sales *', key: 'code', width: 18 },
      { header: 'Nama Sales *', key: 'name', width: 30 },
      { header: 'No. HP / Telepon', key: 'phone', width: 22 },
      { header: 'Status (Active/Inactive)', key: 'status', width: 25 },
      { header: 'Alamat', key: 'address', width: 45 },
    ]

    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A7F5B' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

    sheet.addRow({ code: 'SLS-001', name: 'Budi Santoso', phone: '081234567890', status: 'Active', address: 'Jl. Merdeka No. 10' })
    sheet.addRow({ code: 'SLS-002', name: 'Dewi Lestari', phone: '085712345678', status: 'Active', address: 'Jl. Sudirman No. 45' })
    sheet.addRow({ code: 'SLS-003', name: 'Agus Setiawan', phone: '082198765432', status: 'Inactive', address: 'Jl. Diponegoro No. 88' })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, 'Template_Import_Sales.xlsx')
  } catch (e) {
    toast.error('Gagal mengunduh template')
  } finally {
    downloadingTemplate.value = false
  }
}

const extractCellValue = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return ''
  const v = cell.value
  if (typeof v === 'object') {
    if (v.result !== undefined && v.result !== null) return String(v.result).trim()
    if (v.text !== undefined && v.text !== null) return String(v.text).trim()
    if (Array.isArray(v.richText)) return v.richText.map(t => t.text || '').join('').trim()
    return String(v).trim()
  }
  return String(v).trim()
}

const onFileSelected = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  selectedFileName.value = file.name
  importError.value = ''
  parsedRows.value = []

  try {
    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const worksheet = workbook.worksheets[0]
    if (!worksheet) throw new Error('Sheet Excel tidak ditemukan.')

    let codeCol = -1
    let nameCol = -1
    let phoneCol = -1
    let statusCol = -1
    let addressCol = -1

    const headerRow = worksheet.getRow(1)
    headerRow.eachCell((cell, colNumber) => {
      const val = extractCellValue(cell).toLowerCase()
      if (val.includes('kode') || val.includes('code')) codeCol = colNumber
      else if (val.includes('nama') || val.includes('name') || val.includes('sales')) nameCol = colNumber
      else if (val.includes('hp') || val.includes('phone') || val.includes('telp') || val.includes('kontak') || val.includes('telepon')) phoneCol = colNumber
      else if (val.includes('status') || val.includes('aktif') || val.includes('active')) statusCol = colNumber
      else if (val.includes('alamat') || val.includes('address')) addressCol = colNumber
    })

    if (codeCol === -1) codeCol = 1
    if (nameCol === -1) nameCol = 2
    if (phoneCol === -1) phoneCol = 3
    if (statusCol === -1) statusCol = 4
    if (addressCol === -1) addressCol = 5

    const rows = []
    const totalRowCount = worksheet.rowCount

    for (let r = 2; r <= totalRowCount; r++) {
      const row = worksheet.getRow(r)
      const code = extractCellValue(row.getCell(codeCol))
      const name = extractCellValue(row.getCell(nameCol))
      const phone = extractCellValue(row.getCell(phoneCol))
      const statusRaw = extractCellValue(row.getCell(statusCol)).toLowerCase()
      const address = extractCellValue(row.getCell(addressCol))

      if (!code && !name && !phone && !statusRaw && !address) continue

      if (!code) {
        importError.value = `Baris ke-${r}: Kode sales wajib diisi.`
        parsedRows.value = []
        return
      }

      if (!name) {
        importError.value = `Baris ke-${r}: Nama sales wajib diisi.`
        parsedRows.value = []
        return
      }

      const is_active = !(statusRaw === 'inactive' || statusRaw === 'nonaktif' || statusRaw === 'non-aktif' || statusRaw === 'false' || statusRaw === '0')

      rows.push({
        code,
        name,
        phone,
        is_active,
        address,
      })
    }

    if (rows.length === 0) {
      importError.value = 'Tidak ada baris data yang ditemukan dalam file Excel.'
      return
    }

    parsedRows.value = rows
  } catch (err) {
    importError.value = 'Gagal membaca file Excel: ' + (err.message || 'Format tidak valid')
  }
}

const doImport = async () => {
  if (parsedRows.value.length === 0) return
  importing.value = true
  try {
    const res = await api.post('/master/salesmen/import', { items: parsedRows.value })
    const totalCount = res.data?.data?.total || parsedRows.value.length
    toast.success(`Berhasil mengimpor ${totalCount} sales`)
    closeImport()
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal mengimpor data')
  } finally {
    importing.value = false
  }
}

onMounted(fetchItems)
</script>
