<template>
  <div class="report-page">
    <div class="page-header no-print">
      <div>
        <div class="page-title">Laporan Stok Opname Barang Jadi</div>
        <div class="page-subtitle">Laporan Stock Barang Jadi Opname</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" @click="exportExcel" :disabled="!reportData">📥 Export Excel</button>
        <button class="btn btn-secondary" @click="printReport" :disabled="!reportData">🖨 Cetak Web / PDF</button>
      </div>
    </div>

    <div class="card no-print" style="margin-bottom: 24px;">
      <div class="card-header" style="display:flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;">
        <div>
          <label class="form-label">Bulan</label>
          <select class="form-control" v-model="filter.month" style="width: 120px;">
            <option value="">All</option>
            <option v-for="m in 12" :key="m" :value="String(m).padStart(2, '0')">{{ m }}</option>
          </select>
        </div>
        <div>
          <label class="form-label">Tahun</label>
          <select class="form-control" v-model="filter.year" style="width: 100px;">
            <option value="">All</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div style="flex:1; min-width: 250px;">
          <label class="form-label">Dokumen Penyesuaian Stok (Opsional)</label>
          <select class="form-control" v-model="filter.stock_adjustment_id">
            <option value="">-- All --</option>
            <option v-for="adj in adjustments" :key="adj.id" :value="adj.id">
              Adj #{{ adj.id }} - {{ adj.date }}
            </option>
          </select>
        </div>
        <div>
          <button class="btn btn-primary" @click="generateReport" :disabled="loading" style="height: 38px;">
            <span v-if="loading" class="spinner"></span><span v-else>Buat Laporan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Report Canvas -->
    <div v-if="reportData && reportData.length > 0">
      <div class="report-canvas" style="margin-bottom: 24px;">
        <div class="report-header text-center">
          <h2 style="margin-bottom: 8px;">PT. CENTRA AGRO PRATAMA</h2>
          <h2>LAPORAN STOCK BARANG JADI OPNAME</h2>
        </div>
        
        <div class="report-info-grid">
          <div class="info-row">
            <span class="info-label">BULAN</span>
            <span class="info-colon">:</span>
            <span class="info-value fw-600">
              {{ filter.month ? getMonthName(filter.month) : 'ALL' }} {{ filter.year || 'ALL' }}
            </span>
          </div>
        </div>

        <div class="report-table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th class="text-center" style="width:50px;">No</th>
                <th>Nama Barang</th>
                <th class="text-right">Qty Data</th>
                <th class="text-right">Qty Aktual</th>
                <th class="text-right">Deviasi</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in reportData" :key="i">
                <td class="text-center">{{ i + 1 }}</td>
                <td>{{ row.product.name }}</td>
                <td class="text-right">{{ fmtStock(row.qty_system) }} {{ row.product.unit }}</td>
                <td class="text-right">{{ fmtStock(row.qty_real) }} {{ row.product.unit }}</td>
                <td class="text-right">
                  <span :class="deviationClass(row.difference)">{{ fmtStock(row.difference) }}</span>
                </td>
                <td>
                  <span v-if="Number(row.difference) !== 0" :class="Number(row.difference) > 0 ? 'text-success' : 'text-danger'">
                    Selisih: {{ fmtStock(row.difference) }}
                  </span>
                  <span v-else class="text-muted">Sesuai</span>
                </td>
              </tr>
            </tbody>
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
    <div v-else-if="reportData && reportData.length === 0" class="card text-center" style="padding: 40px;">
      <div style="font-size: 3rem; margin-bottom: 16px;">📊</div>
      <h3 style="color: #475569;">Data tidak ditemukan</h3>
      <p style="color: #64748b;">No finished goods stock opname data available for the selected filters.</p>
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
const filter = ref({ month: new Date().getMonth() + 1 + '', year: new Date().getFullYear(), stock_adjustment_id: '' })
if (filter.value.month.length === 1) filter.value.month = '0' + filter.value.month;

const loading = ref(false)
const reportData = ref(null)
const adjustments = ref([])

const currentYear = new Date().getFullYear();
const years = Array.from({length: 10}, (_, i) => currentYear - i);

const loadAdjustments = async () => {
  try {
    const res = await api.get('/inventory/adjustments', { params: { limit: 100 } });
    adjustments.value = res.data.data.rows || res.data.data;
  } catch (e) {
    console.error('Gagal memuat data adjustments', e);
  }
}

onMounted(() => {
  loadAdjustments()
})

const getMonthName = (m) => {
  const date = new Date(2000, parseInt(m) - 1, 1);
  return date.toLocaleString('id-ID', { month: 'long' }).toUpperCase();
}

const generateReport = async () => {
  loading.value = true
  try {
    const res = await api.get('/reports/stock-opname-product', { params: filter.value })
    reportData.value = res.data.data
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal membuat laporan')
  } finally {
    loading.value = false
  }
}

const fmtStock = (n) => Number(n || 0).toLocaleString('id-ID')

const deviationClass = (diff) => {
  const val = Number(diff || 0)
  if (val < 0) return 'text-danger fw-600'
  if (val > 0) return 'text-success fw-600'
  return ''
}

const printReport = () => {
  const q = new URLSearchParams()
  if (filter.value.month) q.set('month', filter.value.month)
  if (filter.value.year) q.set('year', filter.value.year)
  if (filter.value.stock_adjustment_id) q.set('stock_adjustment_id', filter.value.stock_adjustment_id)
  
  const url = `/print/stock-opname-product?${q.toString()}`
  window.open(url, '_blank')
}

const exportExcel = async () => {
  if (!reportData.value || reportData.value.length === 0) return
  
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('FG Stock Opname Report')
  
  // Title
  sheet.mergeCells('A1:F1')
  sheet.getCell('A1').value = 'PT. CENTRA AGRO PRATAMA'
  sheet.getCell('A1').font = { bold: true, size: 14 }
  sheet.getCell('A1').alignment = { horizontal: 'center' }

  sheet.mergeCells('A2:F2')
  sheet.getCell('A2').value = 'LAPORAN STOCK BARANG JADI OPNAME'
  sheet.getCell('A2').font = { bold: true, size: 12 }
  sheet.getCell('A2').alignment = { horizontal: 'center' }

  // Info header
  sheet.getCell('A4').value = 'BULAN:'
  const monthStr = filter.value.month ? getMonthName(filter.value.month) : 'ALL'
  sheet.getCell('B4').value = `${monthStr} ${filter.value.year || 'ALL'}`
  sheet.getCell('B4').font = { bold: true }

  // Table Header
  const headerRow = sheet.getRow(6)
  headerRow.values = ['No', 'Nama Barang', 'Qty Data', 'Qty Aktual', 'Deviasi', 'Keterangan']
  headerRow.font = { bold: true }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  
  // Configure columns width
  sheet.columns = [
    { key: 'no', width: 5 },
    { key: 'nama_barang', width: 35 },
    { key: 'qty_data', width: 20 },
    { key: 'qty_aktual', width: 20 },
    { key: 'deviasi', width: 15 },
    { key: 'keterangan', width: 30 }
  ]

  // Apply borders and fill to header
  for (let c = 1; c <= 6; c++) {
    headerRow.getCell(c).border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    }
    headerRow.getCell(c).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' }
    }
  }

  let startRow = 7
  reportData.value.forEach((row, i) => {
    const excelRow = sheet.getRow(startRow + i)
    
    let ket = 'Sesuai';
    if (Number(row.difference) !== 0) {
      ket = `Selisih: ${fmtStock(row.difference)}`
    }

    excelRow.values = [
      i + 1,
      row.product.name,
      `${fmtStock(row.qty_system)} ${row.product.unit}`,
      `${fmtStock(row.qty_real)} ${row.product.unit}`,
      Number(row.difference || 0),
      ket
    ]
    
    // Alignment
    excelRow.getCell(1).alignment = { horizontal: 'center' }
    excelRow.getCell(3).alignment = { horizontal: 'right' }
    excelRow.getCell(4).alignment = { horizontal: 'right' }
    excelRow.getCell(5).alignment = { horizontal: 'right' }

    // Highlight negative deviation in red
    if (Number(row.difference) < 0) {
      excelRow.getCell(5).font = { color: { argb: 'FFDC2626' }, bold: true }
    } else if (Number(row.difference) > 0) {
      excelRow.getCell(5).font = { color: { argb: 'FF16A34A' }, bold: true }
    }

    // Borders
    for (let c = 1; c <= 6; c++) {
      excelRow.getCell(c).border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      }
    }
  })

  // Export buffer
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const fileName = `Laporan_Stock_Barang_Jadi_Opname_${new Date().toISOString().split('T')[0]}.xlsx`
  
  saveAs(blob, fileName)
}
</script>

<style scoped>
.report-page {
  width: 100%;
  margin: 0 auto;
}
.report-canvas {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.report-header h2 {
  font-size: 18px;
  margin-bottom: 24px;
}
.report-info-grid {
  margin-bottom: 24px;
  font-size: 14px;
}
.info-row {
  display: flex;
  margin-bottom: 6px;
}
.info-label {
  width: 80px;
  color: #64748b;
}
.info-colon {
  width: 20px;
}
.info-value {
  color: #0f172a;
}
.report-table-wrapper {
  overflow-x: auto;
}
.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.report-table th, .report-table td {
  border: 1px solid #e2e8f0;
  padding: 10px 12px;
}
.report-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
}
.text-success { color: #16a34a; font-weight: 500; }
.text-danger { color: #dc2626; font-weight: 500; }
.text-muted { color: #94a3b8; }
.fw-600 { font-weight: 600; }

.signature-section {
  display: flex;
  justify-content: space-between;
  margin-top: 60px;
  padding: 0 40px;
}
.signature-box {
  text-align: center;
  width: 200px;
}
.signature-line {
  margin-top: 80px;
}

@media print {
  .no-print { display: none !important; }
  .report-canvas { box-shadow: none; padding: 0; }
  .report-page { max-width: 100%; margin: 0; padding: 0; }
  body { background: white; }
  .sidebar, .top-navbar { display: none !important; }
  .main-content { margin: 0 !important; padding: 0 !important; }
}
</style>
