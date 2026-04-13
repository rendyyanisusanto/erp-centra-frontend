<template>
  <div class="report-page">
    <div class="page-header no-print">
      <div>
        <div class="page-title">Laporan Stok Bulanan Barang Jadi</div>
        <div class="page-subtitle">Laporan Stock Barang Jadi</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" @click="exportExcel" :disabled="!reportData">📥 Export Excel</button>
        <button class="btn btn-secondary" @click="printReport" :disabled="!reportData">🖨 Cetak Web / PDF</button>
      </div>
    </div>

    <div class="card no-print" style="margin-bottom: 24px;">
      <div class="card-header" style="display:flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;">
        <div style="flex:1; min-width: 250px;">
          <label class="form-label">Produk</label>
          <select class="form-control" v-model="filter.product_id">
            <option value="">-- Select Produk --</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Bulan</label>
          <select class="form-control" v-model="filter.month" style="width: 120px;">
            <option v-for="m in 12" :key="m" :value="String(m).padStart(2, '0')">{{ getMonthName(String(m).padStart(2, '0')) }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Tahun</label>
          <select class="form-control" v-model="filter.year" style="width: 100px;">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div>
          <button class="btn btn-primary" @click="generateReport" :disabled="loading || !filter.product_id" style="height: 38px;">
            <span v-if="loading" class="spinner"></span><span v-else>Buat Laporan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Report Canvas -->
    <div v-if="reportData">
      <div class="report-canvas" style="margin-bottom: 24px;">
        <div class="report-header text-center">
          <h2 style="margin-bottom: 8px;">PT. CENTRA AGRO PRATAMA</h2>
          <h2>LAPORAN STOCK BARANG JADI</h2>
        </div>

        <div class="report-info-grid">
          <div class="info-row">
            <span class="info-label">Jenis Barang</span>
            <span class="info-colon">:</span>
            <span class="info-value fw-600">{{ reportData.product.name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Satuan</span>
            <span class="info-colon">:</span>
            <span class="info-value fw-600">{{ reportData.product.unit }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Bulan</span>
            <span class="info-colon">:</span>
            <span class="info-value fw-600">{{ getMonthName(String(reportData.period.month).padStart(2, '0')) }} {{ reportData.period.year }}</span>
          </div>
        </div>

        <div class="report-table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th class="text-center" style="width:40px;">No</th>
                <th class="text-center" style="width:50px;">TGL</th>
                <th class="text-right">Persediaan</th>
                <th class="text-right">Masuk</th>
                <th class="text-right">Keluar</th>
                <th class="text-right">Deviasi</th>
                <th class="text-right">Sisa</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in reportData.rows" :key="i" :class="{ 'row-muted': !row.has_data }">
                <td class="text-center">{{ i + 1 }}</td>
                <td class="text-center">{{ row.day }}</td>
                <td class="text-right">{{ fmtVal(row.persediaan) }}</td>
                <td class="text-right">{{ row.has_data && row.masuk ? fmtNum(row.masuk) : '-' }}</td>
                <td class="text-right">{{ row.has_data && row.keluar ? fmtNum(row.keluar) : '-' }}</td>
                <td class="text-right">
                  <span v-if="row.has_data && row.deviasi" :class="row.deviasi < 0 ? 'text-danger' : 'text-success'">{{ fmtNum(row.deviasi) }}</span>
                  <span v-else>-</span>
                </td>
                <td class="text-right fw-600">{{ fmtVal(row.sisa) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="summary-row">
                <td colspan="6" class="text-right fw-600" style="font-size:14px;">STOCK OPNAME :</td>
                <td class="text-right fw-600" style="font-size:14px;">{{ fmtNum(reportData.final_stock) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div>Dibuat Oleh ,</div>
            <div class="signature-line">( …………………………………. )</div>
          </div>
          <div class="signature-box">
            <div>Disetujui Oleh ,</div>
            <div class="signature-line">( ……………………………… )</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="emptyState" class="card text-center" style="padding: 40px;">
      <div style="font-size: 3rem; margin-bottom: 16px;">📊</div>
      <h3 style="color: #475569;">Data tidak ditemukan</h3>
      <p style="color: #64748b;">Select a product and period, then click Buat Laporan.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const toast = useToastStore()
const filter = ref({
  product_id: '',
  month: String(new Date().getMonth() + 1).padStart(2, '0'),
  year: new Date().getFullYear()
})
const loading = ref(false)
const reportData = ref(null)
const emptyState = ref(false)
const products = ref([])

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

const loadProduks = async () => {
  try {
    const res = await api.get('/master/products', { params: { limit: 100 } })
    products.value = res.data.data.data || res.data.data
  } catch (e) {
    console.error('Gagal memuat data products', e)
  }
}

onMounted(() => {
  loadProduks()
})

const getMonthName = (m) => {
  const date = new Date(2000, parseInt(m) - 1, 1)
  return date.toLocaleString('id-ID', { month: 'long' }).toUpperCase()
}

const fmtNum = (n) => Number(n || 0).toLocaleString('id-ID')
const fmtVal = (n) => {
  const v = Number(n || 0)
  return v === 0 ? '-' : v.toLocaleString('id-ID')
}

const generateReport = async () => {
  if (!filter.value.product_id) {
    toast.error('Please select a product.')
    return
  }
  loading.value = true
  emptyState.value = false
  try {
    const res = await api.get('/reports/fg-monthly-stock', { params: filter.value })
    reportData.value = res.data.data
    if (!reportData.value || !reportData.value.rows || reportData.value.rows.length === 0) {
      emptyState.value = true
      reportData.value = null
    }
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal membuat laporan')
    reportData.value = null
  } finally {
    loading.value = false
  }
}

const printReport = () => {
  const q = new URLSearchParams()
  q.set('product_id', filter.value.product_id)
  q.set('month', filter.value.month)
  q.set('year', filter.value.year)
  const url = `/print/fg-monthly-stock?${q.toString()}`
  window.open(url, '_blank')
}

const exportExcel = async () => {
  if (!reportData.value) return
  const data = reportData.value

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('FG Bulanan Stock')

  // Title
  sheet.mergeCells('A1:G1')
  sheet.getCell('A1').value = 'PT. CENTRA AGRO PRATAMA'
  sheet.getCell('A1').font = { bold: true, size: 14 }
  sheet.getCell('A1').alignment = { horizontal: 'center' }

  sheet.mergeCells('A2:G2')
  sheet.getCell('A2').value = 'LAPORAN STOCK BARANG JADI'
  sheet.getCell('A2').font = { bold: true, size: 12 }
  sheet.getCell('A2').alignment = { horizontal: 'center' }

  // Info
  sheet.getCell('A4').value = 'Jenis Barang:'
  sheet.getCell('B4').value = data.product.name
  sheet.getCell('B4').font = { bold: true }
  sheet.getCell('A5').value = 'Satuan:'
  sheet.getCell('B5').value = data.product.unit
  sheet.getCell('A6').value = 'Bulan:'
  sheet.getCell('B6').value = `${getMonthName(String(data.period.month).padStart(2, '0'))} ${data.period.year}`
  sheet.getCell('B6').font = { bold: true }

  // Column widths
  sheet.columns = [
    { key: 'no', width: 5 },
    { key: 'tgl', width: 6 },
    { key: 'persediaan', width: 15 },
    { key: 'masuk', width: 15 },
    { key: 'keluar', width: 15 },
    { key: 'deviasi', width: 15 },
    { key: 'sisa', width: 15 },
  ]

  // Table header
  const headerRow = sheet.getRow(8)
  headerRow.values = ['No', 'TGL', 'Persediaan', 'Masuk', 'Keluar', 'Deviasi', 'Sisa']
  headerRow.font = { bold: true }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  for (let c = 1; c <= 7; c++) {
    headerRow.getCell(c).border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    }
    headerRow.getCell(c).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' }
    }
  }

  // Data rows
  let startRow = 9
  data.rows.forEach((row, i) => {
    const r = sheet.getRow(startRow + i)
    r.values = [
      i + 1,
      row.day,
      row.persediaan || 0,
      row.has_data && row.masuk ? row.masuk : '-',
      row.has_data && row.keluar ? row.keluar : '-',
      row.has_data && row.deviasi ? row.deviasi : '-',
      row.sisa || 0
    ]
    r.getCell(1).alignment = { horizontal: 'center' }
    r.getCell(2).alignment = { horizontal: 'center' }
    for (let c = 3; c <= 7; c++) r.getCell(c).alignment = { horizontal: 'right' }
    if (row.deviasi && row.deviasi < 0) {
      r.getCell(6).font = { color: { argb: 'FFDC2626' }, bold: true }
    }
    for (let c = 1; c <= 7; c++) {
      r.getCell(c).border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      }
    }
  })

  // Summary row
  const sumRow = sheet.getRow(startRow + data.rows.length)
  sumRow.getCell(1).value = ''
  sheet.mergeCells(startRow + data.rows.length, 1, startRow + data.rows.length, 6)
  sumRow.getCell(1).value = 'STOCK OPNAME :'
  sumRow.getCell(1).alignment = { horizontal: 'right' }
  sumRow.getCell(1).font = { bold: true }
  sumRow.getCell(7).value = data.final_stock
  sumRow.getCell(7).alignment = { horizontal: 'right' }
  sumRow.getCell(7).font = { bold: true }
  for (let c = 1; c <= 7; c++) {
    sumRow.getCell(c).border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `Laporan_Stock_Barang_Jadi_${data.product.name}_${data.period.year}-${String(data.period.month).padStart(2,'0')}.xlsx`)
}
</script>

<style scoped>
.report-page { width: 100%; margin: 0 auto; }
.report-canvas {
  background: white; padding: 40px; border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.report-header h2 { font-size: 18px; margin-bottom: 24px; }
.report-info-grid { margin-bottom: 24px; font-size: 14px; }
.info-row { display: flex; margin-bottom: 6px; }
.info-label { width: 120px; color: #64748b; }
.info-colon { width: 20px; }
.info-value { color: #0f172a; }
.report-table-wrapper { overflow-x: auto; }
.report-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.report-table th, .report-table td { border: 1px solid #e2e8f0; padding: 8px 10px; }
.report-table th { background: #f8fafc; color: #475569; font-weight: 600; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.fw-600 { font-weight: 600; }
.text-success { color: #16a34a; font-weight: 500; }
.text-danger { color: #dc2626; font-weight: 500; }
.row-muted td { color: #94a3b8; }
.summary-row td { background: #f1f5f9; border-top: 2px solid #475569; }

.signature-section { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
.signature-box { text-align: center; width: 200px; }
.signature-line { margin-top: 80px; }

@media print {
  .no-print { display: none !important; }
  .report-canvas { box-shadow: none; padding: 0; }
  .report-page { max-width: 100%; margin: 0; padding: 0; }
  body { background: white; }
  .sidebar, .top-navbar { display: none !important; }
  .main-content { margin: 0 !important; padding: 0 !important; }
}
</style>
