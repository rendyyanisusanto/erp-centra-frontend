<template>
  <div>
    <div class="page-header">
      <div><div class="page-title">Produk</div><div class="page-subtitle">Kelola data master produk</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" v-if="auth.can('product.create')" @click="openImport">📥 Import</button>
        <button class="btn btn-primary" v-if="auth.can('product.create')" @click="openCreate">+ Tambah Produk</button>
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
          <thead><tr><th>#</th><th>Nama</th><th>Satuan</th><th>Stock</th><th>Min Stock</th><th v-if="auth.can('product.create')">Aksi</th></tr></thead>
          <tbody>
            <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 5" :key="j"><div class="skeleton-cell"></div></td></tr></template>
            <template v-else-if="items.length === 0"><tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">📦</div><h3>Tidak ada data produk</h3><p>Tambahkan produk pertama Anda.</p></div></td></tr></template>
            <tr v-else v-for="(item, i) in items" :key="item.id">
              <td class="text-muted">{{ (page-1)*limit+i+1 }}</td>
              <td class="fw-600">{{ item.name }}</td>
              <td>{{ item.unit?.name || '-' }}</td>
              <td :class="Number(item.stock) < Number(item.min_stock) ? 'text-danger fw-600' : ''">{{ item.stock }}</td>
              <td>{{ item.min_stock }}</td>
              <td v-if="auth.can('product.create')"><div class="action-btns">
                <button class="btn btn-sm btn-secondary" @click="openEdit(item)">✏️ Edit</button>
                <button class="btn btn-sm btn-danger" @click="openDelete(item)">🗑️</button>
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span class="pagination-info">Total: {{ total }}</span>
        <button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button>
        <button class="page-btn" v-for="p in totalPages" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button>
        <button class="page-btn" :disabled="page>=totalPages" @click="changePage(page+1)">›</button>
      </div>
    </div>

    <BaseModal v-if="showForm" :title="editing?'Edit Produk':'Tambah Produk'" size="lg" @close="showForm=false">
      <div class="form-group"><label class="form-label required">Nama</label><input class="form-control" v-model="form.name" required /></div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Base Unit</label><UnitSearchSelect v-model="form.base_unit_id" /></div>
        <div class="form-group"><label class="form-label">Min Stock</label><input class="form-control" type="number" v-model="form.min_stock" /></div>
      </div>

      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label class="form-label" style="margin:0">Konversi Satuan</label>
          <button type="button" class="btn btn-sm btn-secondary" @click="addConversion">+ Tambah Konversi</button>
        </div>
        <table class="detail-table" style="table-layout:fixed;width:100%">
          <thead><tr><th style="width:45%">Satuan</th><th style="width:25%">Nilai Konversi</th><th style="width:18%">Base</th><th style="width:48px"></th></tr></thead>
          <tbody>
            <tr v-for="(c,i) in form.conversions" :key="i">
              <td><UnitSearchSelect v-model="c.unit_id" /></td>
              <td><input class="form-control" type="number" min="0.01" step="0.01" v-model="c.conversion_qty" :disabled="Number(c.unit_id)===Number(form.base_unit_id)" /></td>
              <td class="text-center"><input type="radio" :checked="Number(c.unit_id)===Number(form.base_unit_id)" disabled /></td>
              <td><button type="button" class="btn btn-sm btn-danger" @click="removeConversion(i)">✕</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showForm=false">Batal</button>
        <button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Simpan</span></button>
      </template>
    </BaseModal>

    <BaseModal v-if="showImport" title="Import Data Produk" size="md" @close="closeImport">
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
          Pilih file Excel (.xlsx / .xls) yang berisi data produk untuk diimpor.
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
                <th>Satuan</th>
                <th>Stok</th>
                <th>Min Stok</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in parsedRows.slice(0, 3)" :key="idx">
                <td class="fw-600">{{ row.name }}</td>
                <td>{{ row.unit }}</td>
                <td>{{ row.stock }}</td>
                <td>{{ row.min_stock }}</td>
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

    <ConfirmDialog v-if="showDeleteConfirm" :loading="deleting" @confirm="doDelete" @cancel="showDeleteConfirm=false" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import UnitSearchSelect from '@/components/UnitSearchSelect.vue'
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
const form = ref({ name: '', base_unit_id: '', min_stock: 0, conversions: [] })
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

watch(() => form.value.base_unit_id, (baseUnitId) => {
  if (!baseUnitId) return
  const idx = form.value.conversions.findIndex(c => Number(c.unit_id) === Number(baseUnitId))
  if (idx < 0) form.value.conversions.unshift({ unit_id: baseUnitId, conversion_qty: 1, is_base: true })
  form.value.conversions = form.value.conversions.map(c => ({
    ...c,
    is_base: Number(c.unit_id) === Number(baseUnitId),
    conversion_qty: Number(c.unit_id) === Number(baseUnitId) ? 1 : Number(c.conversion_qty || 0),
  }))
})

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/master/products', { params: { page: page.value, limit: limit.value, search: search.value } })
    items.value = r.data.data.data
    total.value = r.data.data.total
  } catch (e) {
    toast.error(e.response?.data?.message || 'Terjadi kesalahan')
  } finally {
    loading.value = false
  }
}

const changePage = (p) => { page.value = p; fetchItems() }

const openCreate = () => { editing.value = null; form.value = { name: '', base_unit_id: '', min_stock: 0, conversions: [] }; showForm.value = true }
const openEdit = async (item) => {
  editing.value = item
  form.value = { name: item.name, base_unit_id: item.base_unit_id || item.unit_id || '', min_stock: item.min_stock, conversions: [] }
  try {
    const r = await api.get('/master/item-unit-conversions', { params: { item_type: 'PRODUCT', item_id: item.id } })
    form.value.conversions = (r.data.data || []).map(c => ({ unit_id: c.unit_id, conversion_qty: Number(c.conversion_qty), is_base: !!c.is_base }))
  } catch {}
  showForm.value = true
}

const addConversion = () => form.value.conversions.push({ unit_id: '', conversion_qty: 1, is_base: false })
const removeConversion = (idx) => form.value.conversions.splice(idx, 1)

const openDelete = (item) => { deleteTarget.value = item; showDeleteConfirm.value = true }

const validate = () => {
  if (!form.value.name?.trim()) return 'Nama wajib diisi.'
  if (!form.value.base_unit_id) return 'Base unit wajib diisi.'
  const rows = form.value.conversions.filter(c => c.unit_id)
  if (!rows.length) return 'Minimal 1 konversi satuan wajib diisi.'
  const seen = new Set()
  for (const c of rows) {
    const key = Number(c.unit_id)
    if (seen.has(key)) return 'Duplikasi satuan tidak diperbolehkan.'
    seen.add(key)
    if (Number(c.unit_id) !== Number(form.value.base_unit_id) && !(Number(c.conversion_qty) > 0)) return 'conversion_qty harus > 0.'
  }
  return ''
}

const save = async () => {
  const err = validate()
  if (err) return toast.error(err)
  saving.value = true
  try {
    const conversions = form.value.conversions
      .filter(c => c.unit_id)
      .map(c => ({
        unit_id: Number(c.unit_id),
        conversion_qty: Number(c.unit_id) === Number(form.value.base_unit_id) ? 1 : Number(c.conversion_qty),
        is_base: Number(c.unit_id) === Number(form.value.base_unit_id),
      }))

    const payload = {
      name: form.value.name,
      base_unit_id: Number(form.value.base_unit_id),
      min_stock: Number(form.value.min_stock || 0),
      conversions,
    }

    if (editing.value) await api.put(`/master/products/${editing.value.id}`, payload)
    else await api.post('/master/products', payload)
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
    await api.delete(`/master/products/${deleteTarget.value.id}`)
    toast.success('Data berhasil dihapus')
    showDeleteConfirm.value = false
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Terjadi kesalahan')
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

    const sheet = workbook.addWorksheet('Template Produk')
    sheet.columns = [
      { header: 'Nama Produk *', key: 'name', width: 30 },
      { header: 'Satuan *', key: 'unit', width: 16 },
      { header: 'Stok Awal', key: 'stock', width: 16 },
      { header: 'Min Stok', key: 'min_stock', width: 16 },
    ]

    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A7F5B' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

    sheet.addRow({ name: 'BRIKET HEXAGONAL 1KG', unit: 'Box', stock: 100, min_stock: 20 })
    sheet.addRow({ name: 'BRIKET CUBE 25MM', unit: 'Box', stock: 150, min_stock: 30 })
    sheet.addRow({ name: 'BRIKET PILLOW', unit: 'Zak', stock: 50, min_stock: 10 })

    for (let r = 2; r <= 4; r++) {
      sheet.getRow(r).getCell(3).numFmt = '#,##0.00'
      sheet.getRow(r).getCell(4).numFmt = '#,##0.00'
    }

    const unitSheet = workbook.addWorksheet('Daftar Satuan Referensi')
    unitSheet.columns = [
      { header: 'No', key: 'no', width: 8 },
      { header: 'Nama Satuan', key: 'name', width: 25 },
    ]
    const uHeader = unitSheet.getRow(1)
    uHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    uHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF155F44' } }
    uHeader.alignment = { vertical: 'middle', horizontal: 'center' }

    let unitList = []
    try {
      const uRes = await api.get('/master/units', { params: { limit: 100 } })
      unitList = uRes.data.data?.data || []
    } catch {}

    if (unitList.length > 0) {
      unitList.forEach((u, idx) => {
        unitSheet.addRow({ no: idx + 1, name: u.name })
      })
    } else {
      ['Kg', 'Liter', 'Pcs', 'Box', 'Meter', 'Roll', 'Zak'].forEach((name, idx) => {
        unitSheet.addRow({ no: idx + 1, name })
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, 'Template_Import_Produk.xlsx')
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
    let unitCol = -1
    let stockCol = -1
    let minStockCol = -1

    const headerRow = worksheet.getRow(1)
    headerRow.eachCell((cell, colNumber) => {
      const val = extractCellValue(cell).toLowerCase()
      if (val.includes('nama') || val.includes('name') || val.includes('produk') || val.includes('product')) nameCol = colNumber
      else if (val.includes('satuan') || val.includes('unit')) unitCol = colNumber
      else if (val.includes('stok') || val.includes('stock')) {
        if (val.includes('min')) minStockCol = colNumber
        else stockCol = colNumber
      } else if (val.includes('min')) minStockCol = colNumber
    })

    if (nameCol === -1) nameCol = 1
    if (unitCol === -1) unitCol = 2
    if (stockCol === -1) stockCol = 3
    if (minStockCol === -1) minStockCol = 4

    const rows = []
    const totalRowCount = worksheet.rowCount

    for (let r = 2; r <= totalRowCount; r++) {
      const row = worksheet.getRow(r)
      const name = extractCellValue(row.getCell(nameCol))
      const unit = extractCellValue(row.getCell(unitCol))
      const stock = extractCellValue(row.getCell(stockCol))
      const minStock = extractCellValue(row.getCell(minStockCol))

      if (!name && !unit && !stock && !minStock) continue

      if (!name) {
        importError.value = `Baris ke-${r}: Nama produk wajib diisi.`
        parsedRows.value = []
        return
      }
      if (!unit) {
        importError.value = `Baris ke-${r}: Satuan wajib diisi.`
        parsedRows.value = []
        return
      }

      rows.push({
        name,
        unit,
        stock: parseFloat(stock) || 0,
        min_stock: parseFloat(minStock) || 0,
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
    const res = await api.post('/master/products/import', { items: parsedRows.value })
    const totalCount = res.data?.data?.total || parsedRows.value.length
    toast.success(`Berhasil mengimpor ${totalCount} produk`)
    closeImport()
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal mengimpor data')
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  fetchItems()
})
</script>
