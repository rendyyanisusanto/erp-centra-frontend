<template>
  <div class="report-page">
    <div class="page-header no-print">
      <div>
        <div class="page-title">Laporan Rekap Pembelian</div>
        <div class="page-subtitle">Daftar Rekapitulasi Order</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" @click="exportExcel" :disabled="!reportData">📥 Export Excel</button>
        <button class="btn btn-secondary" @click="printReport" :disabled="!reportData">🖨 Cetak Web / PDF</button>
      </div>
    </div>

    <div class="card no-print" style="margin-bottom: 24px;">
      <div class="card-header" style="display:flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;">
        <div>
          <label class="form-label">Period</label>
          <select class="form-control" v-model="periodType" @change="onPeriodChange" style="width: 150px;">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Bulanan</option>
            <option value="custom">Periode Kustom</option>
          </select>
        </div>
        <div v-if="periodType === 'daily'">
          <label class="form-label">Tanggal</label>
          <input class="form-control" type="date" v-model="filter.date_from" @input="filter.date_to = filter.date_from" />
        </div>
        <div v-if="periodType === 'weekly'">
          <label class="form-label">Week Starting</label>
          <input class="form-control" type="date" v-model="filter.date_from" @input="updateWeeklyEnd" />
        </div>
        <div v-if="periodType === 'monthly'">
          <label class="form-label">Bulan</label>
          <input class="form-control" type="month" v-model="filter.monthInput" @input="updateBulananRange" />
        </div>
        <div v-if="periodType === 'custom'">
          <label class="form-label">Tanggal Mulai</label>
          <input class="form-control" type="date" v-model="filter.date_from" />
        </div>
        <div v-if="periodType === 'custom'">
          <label class="form-label">Tanggal Akhir</label>
          <input class="form-control" type="date" v-model="filter.date_to" />
        </div>
        <div style="flex:1; min-width: 250px;">
          <label class="form-label">Supplier (Opsional)</label>
          <SupplierSearchSelect v-model="filter.supplier_id" placeholder="Semua Supplier" />
        </div>
        <div>
          <button class="btn btn-primary" @click="generateReport" :disabled="loading" style="height: 38px;">
            <span v-if="loading" class="spinner"></span><span v-else>Buat Laporan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Report Canvas -->
    <div v-if="reportData">
      <div class="report-canvas" style="margin-bottom: 24px;">
        <div class="report-header">
          <div style="margin-bottom: 16px;">
            <div class="fw-700 font-lg">PT. CENTRA AGRO PRATAMA</div>
            <div>Desa Bolo, Kec.Ujungpangkah, Kab.Gresik</div>
          </div>
          <div class="text-center" style="margin-top: 16px;">
            <h2 style="margin-bottom: 4px; text-decoration: underline;">DAFTAR REKAPITULASI ORDER</h2>
            <div style="font-size: 14px;">FM 0704-03</div>
          </div>
        </div>
        
        <div class="report-info-grid">
          <div class="info-row">
            <span class="info-label">PERIODE</span>
            <span class="info-colon">:</span>
            <span class="info-value fw-600">
              {{ filterInfo.periodStr }}
            </span>
          </div>
        </div>

        <div class="report-table-wrapper" style="margin-top: 16px;">
          <table class="report-table">
            <thead>
              <tr>
                <th class="text-center" style="width:50px;">No</th>
                <th>TGL</th>
                <th>Nama Barang</th>
                <th class="text-right">Tonase</th>
                <th>Pengirim</th>
                <th>Nopol</th>
                <th class="text-right">Harga</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="reportData.transactions.length === 0">
                 <td colspan="7" class="text-center text-muted">No transactions found</td>
              </tr>
              <tr v-for="(row, i) in reportData.transactions" :key="i">
                <td class="text-center">{{ i + 1 }}</td>
                <td>{{ row.date }}</td>
                <td>{{ row.material_name }}</td>
                <td class="text-right">{{ fmtStock(row.qty) }}</td>
                <td>{{ row.supplier_name }}</td>
                <td>{{ row.vehicle_number }}</td>
                <td class="text-right">{{ fmtCurrency(row.subtotal) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="reportData.transactions.length > 0">
              <tr class="table-total">
                <td colspan="6" class="text-right fw-700">TOTAL :</td>
                <td class="text-right fw-700 bg-light">{{ fmtCurrency(reportData.grand_total) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Summary Section -->
        <div v-if="reportData.summaries.length > 0" style="margin-top: 40px; page-break-inside: avoid;">
          <h3 style="margin-bottom: 16px; font-size: 16px;">Ringkasan per Bahan</h3>
          <table class="report-table" style="max-width: 600px;">
            <thead>
              <tr>
                <th>Nama Barang</th>
                <th class="text-right">Total Qty</th>
                <th class="text-right">Unit Harga</th>
                <th class="text-right">Total Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sumItem, j) in reportData.summaries" :key="j">
                <td>{{ sumItem.material_name }}</td>
                <td class="text-right">{{ fmtStock(sumItem.total_qty) }}</td>
                <td class="text-right">{{ fmtCurrency(sumItem.unit_price) }}</td>
                <td class="text-right fw-600">{{ fmtCurrency(sumItem.total_amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import SupplierSearchSelect from '@/components/SupplierSearchSelect.vue'

const toast = useToastStore()
const filter = ref({ date_from: '', date_to: '', supplier_id: '' })
const periodType = ref('monthly')

const filterInfo = ref({ periodStr: '' })

const loading = ref(false)
const reportData = ref(null)

const setDateRange = (days) => {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  filter.value.date_from = start.toISOString().split('T')[0]
  filter.value.date_to = end.toISOString().split('T')[0]
  if (days === 0) filter.value.date_to = filter.value.date_from;
}

const updateWeeklyEnd = () => {
  if (!filter.value.date_from) return;
  const start = new Date(filter.value.date_from);
  start.setDate(start.getDate() + 6);
  filter.value.date_to = start.toISOString().split('T')[0];
}

const updateBulananRange = () => {
  if (!filter.value.monthInput) return;
  const [year, month] = filter.value.monthInput.split('-');
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  filter.value.date_from = start.toISOString().split('T')[0];
  filter.value.date_to = end.toISOString().split('T')[0];
}

const onPeriodChange = () => {
  if (periodType.value === 'daily') setDateRange(0)
  else if (periodType.value === 'weekly') setDateRange(7)
  else if (periodType.value === 'monthly') {
    const d = new Date();
    filter.value.monthInput = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    updateBulananRange();
  }
}

onPeriodChange()

onMounted(() => {
  // onMounted initialized logic
})

const generateReport = async () => {
  loading.value = true
  try {
    const res = await api.get('/reports/purchase-order-recap', { params: filter.value })
    reportData.value = res.data.data
    filterInfo.value.periodStr = `${filter.value.date_from || '-'} to ${filter.value.date_to || '-'}`
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal membuat laporan')
  } finally {
    loading.value = false
  }
}

const fmtStock = (n) => Number(n || 0).toLocaleString('id-ID')
const fmtCurrency = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

const printReport = () => {
  const q = new URLSearchParams()
  if (filter.value.date_from) q.set('date_from', filter.value.date_from)
  if (filter.value.date_to) q.set('date_to', filter.value.date_to)
  if (filter.value.supplier_id) q.set('supplier_id', filter.value.supplier_id)
  
  const url = `/print/purchase-order-recap?${q.toString()}`
  window.open(url, '_blank')
}

const exportExcel = async () => {
  if (!reportData.value) return
  
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('PO Recap')
  
  sheet.getCell('A1').value = 'PT. CENTRA AGRO PRATAMA'
  sheet.getCell('A2').value = 'Desa Bolo, Kec.Ujungpangkah, Kab.Gresik'
  sheet.getCell('A1').font = { bold: true, size: 12 }
  
  sheet.mergeCells('A4:G4')
  sheet.getCell('A4').value = 'DAFTAR REKAPITULASI ORDER'
  sheet.getCell('A4').font = { bold: true, size: 14 }
  sheet.getCell('A4').alignment = { horizontal: 'center' }

  sheet.getCell('A6').value = 'PERIODE:'
  sheet.getCell('B6').value = filterInfo.value.periodStr
  sheet.getCell('B6').font = { bold: true }

  const headerRow = sheet.getRow(8)
  headerRow.values = ['No', 'TGL', 'Nama Barang', 'Tonase', 'Pengirim', 'Nopol', 'Harga']
  headerRow.font = { bold: true }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  
  sheet.columns = [
    { key: 'no', width: 5 },
    { key: 'tgl', width: 12 },
    { key: 'barang', width: 30 },
    { key: 'tonase', width: 15 },
    { key: 'pengirim', width: 30 },
    { key: 'nopol', width: 15 },
    { key: 'harga', width: 20 }
  ]

  for (let c = 1; c <= 7; c++) {
    headerRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    headerRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
  }

  let startRow = 9
  reportData.value.transactions.forEach((row, i) => {
    const r = sheet.getRow(startRow + i)
    r.values = [ i + 1, row.date, row.material_name, Number(row.qty), row.supplier_name, row.vehicle_number, Number(row.subtotal) ]
    r.getCell(1).alignment = { horizontal: 'center' }
    r.getCell(4).numFmt = '#,##0'
    r.getCell(7).numFmt = '#,##0'
    for (let c = 1; c <= 7; c++) r.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  })
  
  const totalRowIndex = startRow + reportData.value.transactions.length
  const totalRow = sheet.getRow(totalRowIndex)
  sheet.mergeCells(`A${totalRowIndex}:F${totalRowIndex}`)
  totalRow.getCell(1).value = 'TOTAL :'
  totalRow.getCell(1).alignment = { horizontal: 'right' }
  totalRow.getCell(1).font = { bold: true }
  totalRow.getCell(7).value = Number(reportData.value.grand_total)
  totalRow.getCell(7).numFmt = '#,##0'
  totalRow.getCell(7).font = { bold: true }
  for (let c = 1; c <= 7; c++) totalRow.getCell(c).border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } }

  if (reportData.value.summaries.length > 0) {
    const summaryStart = totalRowIndex + 3
    sheet.getCell(`A${summaryStart}`).value = 'Ringkasan per Bahan'
    sheet.getCell(`A${summaryStart}`).font = { bold: true, size: 12 }
    
    const sHeader = sheet.getRow(summaryStart + 1)
    sHeader.values = ['Nama Barang', 'Total Qty', 'Unit Harga', 'Total Jumlah']
    sHeader.font = { bold: true }
    for (let c = 1; c <= 4; c++) {
      sHeader.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      sHeader.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
    }
    
    reportData.value.summaries.forEach((s, i) => {
      const r = sheet.getRow(summaryStart + 2 + i)
      r.values = [s.material_name, Number(s.total_qty), Number(s.unit_price), Number(s.total_amount)]
      r.getCell(2).numFmt = '#,##0'
      r.getCell(3).numFmt = '#,##0'
      r.getCell(4).numFmt = '#,##0'
      for (let c = 1; c <= 4; c++) r.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `Daftar_Rekapitulasi_Order_${new Date().toISOString().split('T')[0]}.xlsx`)
}
</script>

<style scoped>
.report-page { width: 100%; margin: 0 auto; }
.report-canvas { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.report-header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 24px; }
.font-lg { font-size: 18px; }
.report-info-grid { font-size: 14px; }
.info-row { display: flex; margin-bottom: 6px; }
.info-label { width: 80px; color: #475569; }
.info-colon { width: 20px; }
.report-table-wrapper { overflow-x: auto; }
.report-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.report-table th, .report-table td { border: 1px solid #e2e8f0; padding: 10px 12px; }
.report-table th { background: #f8fafc; color: #475569; font-weight: 600; }
.table-total td { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
.bg-light { background: #f8fafc; }
.text-muted { color: #94a3b8; padding: 24px !important; }

@media print {
  .no-print { display: none !important; }
  .report-canvas { box-shadow: none; padding: 0; }
  .report-page { max-width: 100%; margin: 0; padding: 0; }
}
</style>
