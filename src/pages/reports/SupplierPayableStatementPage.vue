<template>
  <div class="report-page">
    <div class="page-header no-print">
      <div>
        <div class="page-title">Kartu Hutang Supplier</div>
        <div class="page-subtitle">Kartu Hutang Supplier</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" @click="exportExcel" :disabled="!reportData">📥 Export Excel</button>
        <button class="btn btn-secondary" @click="printReport" :disabled="!reportData">🖨 Cetak Web / PDF</button>
      </div>
    </div>

    <div class="card no-print" style="margin-bottom: 24px;">
      <div class="card-header" style="display:flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;">
        <div style="flex:1; min-width: 250px;">
          <label class="form-label required">Supplier</label>
          <SupplierSearchSelect v-model="filter.supplier_id" placeholder="Pilih Supplier" />
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
        <div>
          <button class="btn btn-primary" @click="generateReport" :disabled="loading || !filter.supplier_id" style="height: 38px;">
            <span v-if="loading" class="spinner"></span><span v-else>Buat Laporan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Report Canvas -->
    <div v-if="reportData">
      <div class="report-canvas" style="margin-bottom: 24px;">
        <div class="report-header">
            <div>
              <div class="fw-700 font-lg">GRESIK, {{ formatCurrentDate() }}</div>
              <div class="fw-700 font-lg" style="margin-top: 16px;">{{ reportData.supplier?.name }}</div>
              <div class="fw-700 font-lg">(TAGIHAN {{ reportData.supplier?.name }})</div>
            </div>
        </div>

        <div class="report-table-wrapper" style="margin-top: 16px;">
          <table class="report-table payable-table">
            <thead>
              <tr>
                <th class="text-center" style="width:50px;">No</th>
                <th>TGL</th>
                <th>Nama Barang</th>
                <th class="text-right">KG</th>
                <th class="text-right">Harga</th>
                <th class="text-right">Jumlah</th>
                <th>Ket</th>
              </tr>
            </thead>
            <tbody>
              <!-- Previous Balance Row -->
               <tr>
                <td colspan="5" class="text-right fw-700">SISA TAGIHAN LALU</td>
                <td class="text-right fw-700">{{ fmtCurrency(reportData.previous_balance) }}</td>
                <td></td>
               </tr>

              <!-- Purchases -->
              <tr v-if="reportData.transactions.length === 0">
                 <td colspan="7" class="text-center text-muted">No new purchases in this period</td>
              </tr>
              <tr v-for="(row, i) in reportData.transactions" :key="`p-${i}`">
                <td class="text-center">{{ i + 1 }}</td>
                <td>{{ row.date }}</td>
                <td>{{ row.name }}</td>
                <td class="text-right">{{ fmtStock(row.qty) }}</td>
                <td class="text-right">{{ fmtCurrency(row.price) }}</td>
                <td class="text-right">{{ fmtCurrency(row.subtotal) }}</td>
                <td>{{ row.note }}</td>
              </tr>
              <!-- Purchase Total Row -->
               <tr>
                <td colspan="5" class="text-right fw-700">JUMLAH</td>
                <td class="text-right fw-700">{{ fmtCurrency(reportData.purchase_total) }}</td>
                <td></td>
               </tr>

               <!-- Total Payable -->
               <tr class="table-total-line">
                <td colspan="5" class="text-right fw-700">TOTAL TAGIHAN =</td>
                <td class="text-right fw-700">{{ fmtCurrency(reportData.total_payable) }}</td>
                <td></td>
               </tr>

              <!-- Pembayaran -->
              <tr v-for="(pay, i) in reportData.payment_transactions" :key="`pay-${i}`">
                <td colspan="5" class="text-right">{{ pay.note }}</td>
                <td class="text-right" style="color: #dc2626;">- {{ fmtCurrency(pay.amount) }}</td>
                <td></td>
              </tr>
              <!-- Pembayaran Total Row -->
               <tr v-if="reportData.payment_transactions.length > 0">
                <td colspan="5" class="text-right fw-700">JUMLAH PEMBAYARAN</td>
                <td class="text-right fw-700" style="color: #dc2626;">- {{ fmtCurrency(reportData.total_payments) }}</td>
                <td></td>
               </tr>

              <!-- Sisa Balance -->
               <tr class="table-total">
                <td colspan="5" class="text-right fw-700">SISA TAGIHAN =</td>
                <td class="text-right fw-700 bg-light">{{ fmtCurrency(reportData.remaining_balance) }}</td>
                <td class="bg-light"></td>
               </tr>

            </tbody>
          </table>
        </div>

      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import SupplierSearchSelect from '@/components/SupplierSearchSelect.vue'

const toast = useToastStore()
const filter = ref({ supplier_id: '', date_from: '', date_to: '', monthInput: '' })
const periodType = ref('monthly')

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

const generateReport = async () => {
  if (!filter.value.supplier_id) {
    toast.error('Supplier wajib dipilih');
    return;
  }
  loading.value = true
  try {
    const res = await api.get('/reports/supplier-payable-statement', { params: filter.value })
    reportData.value = res.data.data
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal membuat laporan')
  } finally {
    loading.value = false
  }
}

const fmtStock = (n) => Number(n || 0).toLocaleString('id-ID')
const fmtCurrency = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const formatCurrentDate = () => {
    const d = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const printReport = () => {
  window.print();
}

const exportExcel = async () => {
  if (!reportData.value) return
  
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Kartu Hutang')
  
  sheet.getCell('A1').value = `GRESIK, ${formatCurrentDate()}`
  sheet.getCell('A1').font = { bold: true, size: 12 }
  sheet.getCell('A3').value = reportData.value.supplier?.name
  sheet.getCell('A3').font = { bold: true, size: 12 }
  sheet.getCell('A4').value = `(TAGIHAN ${reportData.value.supplier?.name})`
  sheet.getCell('A4').font = { bold: true, size: 12 }

  const headerRow = sheet.getRow(6)
  headerRow.values = ['No', 'TGL', 'Nama Barang', 'KG', 'Harga', 'Jumlah', 'Ket']
  headerRow.font = { bold: true }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  
  sheet.columns = [
    { key: 'no', width: 5 },
    { key: 'tgl', width: 12 },
    { key: 'barang', width: 30 },
    { key: 'kg', width: 15 },
    { key: 'harga', width: 20 },
    { key: 'jumlah', width: 20 },
    { key: 'ket', width: 25 }
  ]

  for (let c = 1; c <= 7; c++) {
    headerRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    headerRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
  }

  let startRow = 7

  // Previous Balance Row
  const prevRow = sheet.getRow(startRow)
  prevRow.getCell(5).value = 'SISA TAGIHAN LALU'
  prevRow.getCell(5).font = { bold: true }
  prevRow.getCell(5).alignment = { horizontal: 'right' }
  prevRow.getCell(6).value = Number(reportData.value.previous_balance)
  prevRow.getCell(6).numFmt = '#,##0'
  prevRow.getCell(6).font = { bold: true }
  for (let c = 1; c <= 7; c++) prevRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  
  startRow++

  // Transactions
  reportData.value.transactions.forEach((row, i) => {
    const r = sheet.getRow(startRow + i)
    r.values = [ i + 1, row.date, row.name, Number(row.qty), Number(row.price), Number(row.subtotal), row.note ]
    r.getCell(1).alignment = { horizontal: 'center' }
    r.getCell(4).numFmt = '#,##0'
    r.getCell(5).numFmt = '#,##0'
    r.getCell(6).numFmt = '#,##0'
    for (let c = 1; c <= 7; c++) r.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  })
  
  startRow += reportData.value.transactions.length
  
  // JUMLAH
  const jumlahRow = sheet.getRow(startRow)
  jumlahRow.getCell(5).value = 'JUMLAH'
  jumlahRow.getCell(5).font = { bold: true }
  jumlahRow.getCell(5).alignment = { horizontal: 'right' }
  jumlahRow.getCell(6).value = Number(reportData.value.purchase_total)
  jumlahRow.getCell(6).numFmt = '#,##0'
  jumlahRow.getCell(6).font = { bold: true }
  for (let c = 1; c <= 7; c++) jumlahRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }

  startRow++

  // TOTAL TAGIHAN
  const grandTotalRow = sheet.getRow(startRow)
  grandTotalRow.getCell(5).value = 'TOTAL TAGIHAN ='
  grandTotalRow.getCell(5).font = { bold: true }
  grandTotalRow.getCell(5).alignment = { horizontal: 'right' }
  grandTotalRow.getCell(6).value = Number(reportData.value.total_payable)
  grandTotalRow.getCell(6).numFmt = '#,##0'
  grandTotalRow.getCell(6).font = { bold: true }
  for (let c = 1; c <= 7; c++) grandTotalRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } }
  
  startRow++

  // Pembayaran
  reportData.value.payment_transactions.forEach((pay, i) => {
    const r = sheet.getRow(startRow + i)
    r.getCell(5).value = pay.note
    r.getCell(5).alignment = { horizontal: 'right' }
    r.getCell(6).value = -Number(pay.amount)
    r.getCell(6).numFmt = '#,##0'
    r.getCell(6).font = { color: { argb: 'FFDC2626' } }
    for (let c = 1; c <= 7; c++) r.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  })

  startRow += reportData.value.payment_transactions.length

  if (reportData.value.payment_transactions.length > 0) {
    const payTotalRow = sheet.getRow(startRow)
    payTotalRow.getCell(5).value = 'JUMLAH PEMBAYARAN'
    payTotalRow.getCell(5).font = { bold: true }
    payTotalRow.getCell(5).alignment = { horizontal: 'right' }
    payTotalRow.getCell(6).value = -Number(reportData.value.total_payments)
    payTotalRow.getCell(6).numFmt = '#,##0'
    payTotalRow.getCell(6).font = { bold: true, color: { argb: 'FFDC2626' } }
    for (let c = 1; c <= 7; c++) payTotalRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    startRow++
  }

  // SISA TAGIHAN
  const sisaRow = sheet.getRow(startRow)
  sisaRow.getCell(5).value = 'SISA TAGIHAN ='
  sisaRow.getCell(5).font = { bold: true }
  sisaRow.getCell(5).alignment = { horizontal: 'right' }
  sisaRow.getCell(6).value = Number(reportData.value.remaining_balance)
  sisaRow.getCell(6).numFmt = '#,##0'
  sisaRow.getCell(6).font = { bold: true }
  for (let c = 1; c <= 7; c++) sisaRow.getCell(c).border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `Kartu_Hutang_${reportData.value.supplier?.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`)
}
</script>

<style scoped>
.report-page { width: 100%; margin: 0 auto; }
.report-canvas { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.report-header { margin-bottom: 24px; }
.font-lg { font-size: 18px; }
.report-table-wrapper { overflow-x: auto; }
.report-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.report-table th, .report-table td { border: 1px solid #e2e8f0; padding: 8px 12px; }
.report-table th { background: #f8fafc; color: #475569; font-weight: 600; }
.payable-table td { border-color: #cbd5e1; }
.table-total td { border-top: 3px double #0f172a; border-bottom: 3px double #0f172a; }
.table-total-line td { border-bottom: 2px solid #0f172a; }
.bg-light { background: #f8fafc; }
.text-muted { color: #94a3b8; padding: 24px !important; }

@media print {
  .no-print { display: none !important; }
  .report-canvas { box-shadow: none; padding: 0; }
  .report-page { max-width: 100%; margin: 0; padding: 0; }
  @page { margin: 10mm; size: A4 portrait; }
}
</style>
