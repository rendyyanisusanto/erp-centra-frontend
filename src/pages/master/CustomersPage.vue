<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Pelanggan</div>
        <div class="page-subtitle">Kelola data master pelanggan</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" v-if="auth.can('customer.create')" @click="openImport">📥 Import</button>
        <button class="btn btn-primary" v-if="auth.can('customer.create')" @click="openCreate">+ Tambah Pelanggan</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-control" v-model="search" placeholder="Cari..." @input="debouncedFetch" />
        </div>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>No. HP</th>
              <th>Alamat</th>
              <th v-if="auth.can('customer.create')">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr class="skeleton-row" v-for="i in 5" :key="i">
                <td v-for="j in 5" :key="j"><div class="skeleton-cell"></div></td>
              </tr>
            </template>
            <template v-else-if="items.length === 0">
              <tr>
                <td colspan="5">
                  <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3>Tidak ada data pelanggan</h3>
                    <p>Tambahkan pelanggan pertama Anda.</p>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-else v-for="(item, i) in items" :key="item.id">
              <td class="text-muted">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="fw-600">{{ item.name }}</td>
              <td>{{ item.phone || '-' }}</td>
              <td class="text-muted">{{ item.address || '-' }}</td>
              <td v-if="auth.can('customer.create')">
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
    <BaseModal v-if="showForm" :title="editing ? 'Edit Pelanggan' : 'Tambah Pelanggan'" size="md" @close="showForm = false">
      <div class="form-group"><label class="form-label required">Nama</label><input class="form-control" v-model="form.name" required /></div>
      <div class="form-group"><label class="form-label">No. HP</label><input class="form-control" v-model="form.phone" /></div>
      <div class="form-group"><label class="form-label">Alamat</label><textarea class="form-control" rows="3" v-model="form.address"></textarea></div>
      <template #footer>
        <button class="btn btn-secondary" @click="showForm = false">Batal</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          <span v-if="saving" class="spinner"></span><span v-else>Simpan</span>
        </button>
      </template>
    </BaseModal>

    <!-- Modal Import -->
    <BaseModal v-if="showImport" title="Import Data Pelanggan" size="md" @close="closeImport">
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
          Pilih file Excel (.xlsx / .xls) yang berisi data pelanggan untuk diimpor.
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
                <th>Nama</th>
                <th>No. HP</th>
                <th>Alamat</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in parsedRows.slice(0, 3)" :key="idx">
                <td class="fw-600">{{ row.name }}</td>
                <td>{{ row.phone || '-' }}</td>
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
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const editing = ref(null)
const form = ref({ name: '', phone: '', address: '' })
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
    const r = await api.get('/master/customers', { params: { page: page.value, limit: limit.value, search: search.value } })
    items.value = r.data.data.data
    total.value = r.data.data.total
  } catch (e) {
    toast.error('Terjadi kesalahan')
  } finally {
    loading.value = false
  }
}

const changePage = (p) => { page.value = p; fetchItems() }

const openCreate = () => { editing.value = null; form.value = { name: '', phone: '', address: '' }; showForm.value = true }
const openEdit = (item) => {
  editing.value = item
  form.value = { name: item.name, phone: item.phone || '', address: item.address || '' }
  showForm.value = true
}

const openDelete = (item) => { deleteTarget.value = item; showDeleteConfirm.value = true }

const save = async () => {
  if (!form.value.name?.trim()) return toast.error('Nama pelanggan wajib diisi.')
  saving.value = true
  try {
    if (editing.value) await api.put(`/master/customers/${editing.value.id}`, form.value)
    else await api.post('/master/customers', form.value)
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
    await api.delete(`/master/customers/${deleteTarget.value.id}`)
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

    const sheet = workbook.addWorksheet('Template Pelanggan')
    sheet.columns = [
      { header: 'Nama Pelanggan *', key: 'name', width: 35 },
      { header: 'No. HP / Telepon', key: 'phone', width: 22 },
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

    sheet.addRow({ name: 'PT Maju Bersama Sentosa', phone: '081122334455', address: 'Jl. Ahmad Yani No. 100, Jakarta' })
    sheet.addRow({ name: 'Toko Berkah Abadi', phone: '081298765432', address: 'Jl. Malioboro No. 25, Yogyakarta' })
    sheet.addRow({ name: 'CV Sinar Terang Gemilang', phone: '085612345678', address: 'Jl. Gajah Mada No. 88, Semarang' })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, 'Template_Import_Pelanggan.xlsx')
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

    let nameCol = -1
    let phoneCol = -1
    let addressCol = -1

    const headerRow = worksheet.getRow(1)
    headerRow.eachCell((cell, colNumber) => {
      const val = extractCellValue(cell).toLowerCase()
      if (val.includes('nama') || val.includes('name') || val.includes('pelanggan') || val.includes('customer')) nameCol = colNumber
      else if (val.includes('hp') || val.includes('phone') || val.includes('telp') || val.includes('kontak') || val.includes('telepon')) phoneCol = colNumber
      else if (val.includes('alamat') || val.includes('address')) addressCol = colNumber
    })

    if (nameCol === -1) nameCol = 1
    if (phoneCol === -1) phoneCol = 2
    if (addressCol === -1) addressCol = 3

    const rows = []
    const totalRowCount = worksheet.rowCount

    for (let r = 2; r <= totalRowCount; r++) {
      const row = worksheet.getRow(r)
      const name = extractCellValue(row.getCell(nameCol))
      const phone = extractCellValue(row.getCell(phoneCol))
      const address = extractCellValue(row.getCell(addressCol))

      if (!name && !phone && !address) continue

      if (!name) {
        importError.value = `Baris ke-${r}: Nama pelanggan wajib diisi.`
        parsedRows.value = []
        return
      }

      rows.push({
        name,
        phone,
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
    const res = await api.post('/master/customers/import', { items: parsedRows.value })
    const totalCount = res.data?.data?.total || parsedRows.value.length
    toast.success(`Berhasil mengimpor ${totalCount} pelanggan`)
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
