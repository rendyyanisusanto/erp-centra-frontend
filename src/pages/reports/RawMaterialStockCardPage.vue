<template>
  <div class="report-page">
    <div class="page-header no-print">
      <div>
        <div class="page-title">Kartu Stok Bahan Baku</div>
        <div class="page-subtitle">Kartu Stok Bahan Baku</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" @click="exportExcel" :disabled="!reportData">📥 Export Excel</button>
        <button class="btn btn-secondary" @click="printReport" :disabled="!reportData">🖨 Cetak Web / PDF</button>
      </div>
    </div>

    <div class="card no-print" style="margin-bottom: 24px;">
      <div class="card-header" style="display:flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;">
        <div style="flex:1; min-width: 250px;">
          <label class="form-label">Raw Material (Kosongkan untuk semua data)</label>
          <RawMaterialSearchSelect v-model="filter.raw_material_id" />
        </div>
        <div>
          <label class="form-label">Period</label>
          <select class="form-control" v-model="periodType" @change="onPeriodChange" style="width: 150px;">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Bulanan</option>
            <option value="custom">Periode Kustom</option>
          </select>
        </div>
        <div v-if="periodType === 'custom'">
          <label class="form-label">Tanggal Mulai</label>
          <input class="form-control" type="date" v-model="filter.date_from" />
        </div>
        <div v-if="periodType === 'custom'">
          <label class="form-label">Tanggal Akhir</label>
          <input class="form-control" type="date" v-model="filter.date_to" />
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
      <div v-for="data in reportData" :key="data.material.id" class="report-canvas" style="margin-bottom: 24px;">
        <div class="report-header text-center">
          <h2>RAW MATERIAL STOCK CARD REPORT</h2>
        </div>
        
        <div class="report-info-grid">
          <div class="info-row"><span class="info-label">Material</span><span class="info-colon">:</span><span class="info-value fw-600">{{ data.material.name }}</span></div>
          <div class="info-row"><span class="info-label">Satuan</span><span class="info-colon">:</span><span class="info-value">{{ data.material.unit }}</span></div>
          <div class="info-row"><span class="info-label">Rentang Tanggal</span><span class="info-colon">:</span><span class="info-value">{{ data.period.from || '-' }} to {{ data.period.to || '-' }}</span></div>
        </div>

        <div class="report-table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th class="text-center" style="width:50px;">No</th>
                <th>Tanggal</th>
                <th>Reference</th>
                <th>Jenis</th>
                <th class="text-right">Opening Stock</th>
                <th class="text-right">Stock In</th>
                <th class="text-right">Stock Out</th>
                <th class="text-right">Ending Stock</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="data.movements.length === 0">
                <td colspan="8" class="text-center" style="padding: 32px 0;">
                  <div class="empty-state-icon">📊</div>
                  <div style="margin-top:8px; color:#64748b;">No stock movement found for selected period</div>
                </td>
              </tr>
              <tr v-else v-for="(m, i) in data.movements" :key="i">
                <td class="text-center">{{ i + 1 }}</td>
                <td>{{ m.date }}</td>
                <td>{{ m.reference }}</td>
                <td><span class="badge" :class="badgeClass(m.type)">{{ m.type }}</span></td>
                <td class="text-right">{{ fmtStock(m.opening_stock) }}</td>
                <td class="text-right text-success">{{ m.stock_in > 0 ? fmtStock(m.stock_in) : '-' }}</td>
                <td class="text-right text-danger">{{ m.stock_out > 0 ? fmtStock(m.stock_out) : '-' }}</td>
                <td class="text-right fw-600">{{ fmtStock(m.ending_stock) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="data.movements.length > 0">
              <tr class="stock-footer">
                <td colspan="7" class="text-right fw-700">STOCK :</td>
                <td class="text-right fw-700">{{ fmtStock(data.ending_stock) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'
import RawMaterialSearchSelect from '@/components/RawMaterialSearchSelect.vue'
import api from '@/services/api'

const toast = useToastStore()
const filter = ref({ raw_material_id: '', date_from: '', date_to: '' })
const periodType = ref('monthly')
const loading = ref(false)
const reportData = ref(null)

const setDateRange = (days) => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  filter.value.date_from = start.toISOString().split('T')[0]
  filter.value.date_to = end.toISOString().split('T')[0]
}

const onPeriodChange = () => {
  if (periodType.value === 'daily') setDateRange(1)
  else if (periodType.value === 'weekly') setDateRange(7)
  else if (periodType.value === 'monthly') setDateRange(30)
}

// init period
onPeriodChange()

const generateReport = async () => {
  loading.value = true
  try {
    const res = await api.get('/reports/raw-material-stock-card', { params: filter.value })
    reportData.value = res.data.data
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal membuat laporan')
  } finally {
    loading.value = false
  }
}

const fmtStock = (n) => Number(n || 0).toLocaleString('id-ID')

const badgeClass = (type) => {
  const map = {
    'PURCHASE': 'badge-success',
    'ADJUSTMENT': 'badge-warning',
    'OPENING_BALANCE': 'badge-info',
    'SALES': 'badge-danger',
    'ISSUE': 'badge-neutral',
  }
  return map[type] || 'badge-neutral'
}

const printReport = () => {
  const q = new URLSearchParams()
  if (filter.value.raw_material_id) q.set('raw_material_id', filter.value.raw_material_id)
  if (filter.value.date_from) q.set('date_from', filter.value.date_from)
  if (filter.value.date_to) q.set('date_to', filter.value.date_to)
  
  const url = `/print/raw-material-stock-card?${q.toString()}`
  window.open(url, '_blank')
}

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const exportExcel = async () => {
  if (!reportData.value || reportData.value.length === 0) return
  
  const workbook = new ExcelJS.Workbook()
  
  reportData.value.forEach((data, index) => {
    let wsName = data.material.name.substring(0, 25)
    if (!filter.value.raw_material_id) {
       wsName = `${wsName} - ${index + 1}`
    }
    const sheet = workbook.addWorksheet(wsName)
    
    // Title
    sheet.mergeCells('A1:H1')
    sheet.getCell('A1').value = 'RAW MATERIAL STOCK CARD'
    sheet.getCell('A1').font = { bold: true, size: 14 }
    sheet.getCell('A1').alignment = { horizontal: 'center' }

    // Info header
    sheet.getCell('A3').value = 'Material'
    sheet.getCell('B3').value = data.material.name
    sheet.getCell('B3').font = { bold: true }
    
    sheet.getCell('A4').value = 'Unit'
    sheet.getCell('B4').value = data.material.unit
    
    sheet.getCell('A5').value = 'Period'
    sheet.getCell('B5').value = `${data.period.from || '-'} to ${data.period.to || '-'}`

    // Table Header
    const headerRow = sheet.getRow(7)
    headerRow.values = ['No', 'Date', 'Reference', 'Type', 'Opening Stock', 'Stock In', 'Stock Out', 'Ending Stock']
    headerRow.font = { bold: true }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    
    // Configure columns width
    sheet.columns = [
      { key: 'no', width: 5 },
      { key: 'date', width: 12 },
      { key: 'ref', width: 25 },
      { key: 'type', width: 18 },
      { key: 'opening', width: 15 },
      { key: 'in', width: 15 },
      { key: 'out', width: 15 },
      { key: 'ending', width: 15 }
    ]

    // Apply borders and fill to header
    for (let c = 1; c <= 8; c++) {
      headerRow.getCell(c).border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      }
      headerRow.getCell(c).fill = {
        type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' }
      }
    }

    let startRow = 8
    if (data.movements.length === 0) {
      sheet.mergeCells(`A${startRow}:H${startRow}`)
      const cell = sheet.getCell(`A${startRow}`)
      cell.value = 'Tidak ada mutasi'
      cell.alignment = { horizontal: 'center' }
      for (let c = 1; c <= 8; c++) {
         sheet.getCell(startRow, c).border = {
           top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
         }
      }
    } else {
      data.movements.forEach((m, i) => {
        const row = sheet.getRow(startRow + i)
        row.values = [
          i + 1,
          m.date,
          m.reference,
          m.type,
          Number(m.opening_stock || 0),
          Number(m.stock_in || 0),
          Number(m.stock_out || 0),
          Number(m.ending_stock || 0)
        ]
        
        // Alignment and Number Formatting for data rows
        row.getCell(1).alignment = { horizontal: 'center' }
        row.getCell(5).numFmt = '#,##0'
        row.getCell(5).alignment = { horizontal: 'right' }
        row.getCell(6).numFmt = '#,##0'
        row.getCell(6).alignment = { horizontal: 'right' }
        row.getCell(7).numFmt = '#,##0'
        row.getCell(7).alignment = { horizontal: 'right' }
        row.getCell(8).numFmt = '#,##0'
        row.getCell(8).alignment = { horizontal: 'right' }
        row.getCell(8).font = { bold: true }

        // Borders
        for (let c = 1; c <= 8; c++) {
          row.getCell(c).border = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
          }
        }
      })

      // STOCK footer row
      const footerRowNum = startRow + data.movements.length
      const footerRow = sheet.getRow(footerRowNum)
      sheet.mergeCells(`A${footerRowNum}:G${footerRowNum}`)
      footerRow.getCell(1).value = 'STOCK :'
      footerRow.getCell(1).alignment = { horizontal: 'right' }
      footerRow.getCell(1).font = { bold: true, size: 12 }
      footerRow.getCell(8).value = Number(data.ending_stock || 0)
      footerRow.getCell(8).numFmt = '#,##0'
      footerRow.getCell(8).alignment = { horizontal: 'right' }
      footerRow.getCell(8).font = { bold: true, size: 12 }
      for (let c = 1; c <= 8; c++) {
        footerRow.getCell(c).border = {
          top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' }
        }
      }
    }
  })

  // Export buffer
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const fileName = filter.value.raw_material_id 
    ? `RawMaterial_StockCard_${reportData.value[0].material.name}_${new Date().toISOString().split('T')[0]}.xlsx` 
    : `RawMaterial_StockCard_All_${new Date().toISOString().split('T')[0]}.xlsx`
  
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
  font-size: 20px;
  margin-bottom: 30px;
  border-bottom: 2px solid #334155;
  padding-bottom: 12px;
  color: #1e293b;
  letter-spacing: 1px;
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
  width: 100px;
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
  position: sticky;
  top: 0;
}
.text-success { color: #16a34a; }
.text-danger { color: #dc2626; }
.stock-footer td {
  background: #f0fdf4;
  border-top: 2px double #334155;
  border-bottom: 2px double #334155;
  font-size: 15px;
  padding: 12px;
}
.badge-neutral { background: #e2e8f0; color: #475569; }

@media print {
  .no-print { display: none !important; }
  .report-canvas { box-shadow: none; padding: 0; }
  .report-page { max-width: 100%; margin: 0; padding: 0; }
  body { background: white; }
  .sidebar, .top-navbar { display: none !important; }
  .main-content { margin: 0 !important; padding: 0 !important; }
}
</style>
