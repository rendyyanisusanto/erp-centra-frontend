<template>
  <div class="report-page">
    <div class="page-header">
      <div>
        <div class="page-title">Laporan Produksi</div>
        <div class="page-subtitle">Realisasi produksi berdasarkan tonase</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" @click="exportExcel" :disabled="!report">📥 Export Excel</button>
        <button class="btn btn-secondary" @click="printReport" :disabled="!report">🖨 Cetak Web / PDF</button>
      </div>
    </div>

    <div class="card no-print" style="margin-bottom:16px">
      <div class="card-body" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
        <div class="form-group" style="margin:0">
          <label class="form-label required">Tanggal Awal</label>
          <input class="form-control" type="date" v-model="startDate" />
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label required">Tanggal Akhir</label>
          <input class="form-control" type="date" v-model="endDate" />
        </div>
        <button class="btn btn-primary" :disabled="loading" @click="fetchReport">
          <span v-if="loading" class="spinner"></span>
          <span v-else>Tampilkan</span>
        </button>
      </div>
    </div>

    <div class="card" v-if="report">
      <div class="card-body">
        <div class="report-title">PRODUKSI {{ fmtTitleDate(startDate) }} S/D {{ fmtTitleDate(endDate) }}</div>
        <div class="report-subtitle">PRODUKSI</div>

        <div class="table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th>HARI</th>
                <th>TGL</th>
                <th>PRODUK</th>
                <th class="text-right">TONASE</th>
                <th class="text-right">Q</th>
                <th class="text-right">JUMLAH</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="groupedRows.length === 0">
                <td colspan="6" class="text-center text-muted">Tidak ada data produksi</td>
              </tr>
              <tr v-else v-for="(row, idx) in groupedRows" :key="`${row.production_date}-${row.product_id}-${idx}`">
                <td>{{ row.showDate ? row.day_name : '' }}</td>
                <td>{{ row.showDate ? fmtDate(row.production_date) : '' }}</td>
                <td>{{ row.product_name }}</td>
                <td class="text-right">{{ fmtQty(row.tonase) }}</td>
                <td class="text-right">{{ fmtCurrency(row.q_price) }}</td>
                <td class="text-right">{{ fmtCurrency(row.total) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="groupedRows.length > 0">
              <tr>
                <td colspan="3" class="text-right fw-700">TOTAL</td>
                <td class="text-right fw-700">{{ fmtQty(report.total_tonase) }}</td>
                <td></td>
                <td class="text-right fw-700">{{ fmtCurrency(report.total_amount) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else-if="!loading">
      <div class="empty-state-icon">🏭</div>
      <h3>Pilih rentang tanggal lalu klik Tampilkan</h3>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const toast = useToastStore()
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const report = ref(null)

const fmtQty = (n) => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const fmtCurrency = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const fmtDate = (dateStr) => {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${d}/${m}/${y}`
}
const fmtTitleDate = (dateStr) => {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${d}-${m}-${y}`
}

const groupedRows = computed(() => {
  const rows = report.value?.rows || []
  let prevDate = ''
  return rows.map((row) => {
    const showDate = row.production_date !== prevDate
    prevDate = row.production_date
    return { ...row, showDate }
  })
})

const fetchReport = async () => {
  if (!startDate.value || !endDate.value) {
    toast.error('Tanggal awal dan tanggal akhir wajib diisi')
    return
  }
  loading.value = true
  try {
    const res = await api.get('/reports/production', { params: { start_date: startDate.value, end_date: endDate.value } })
    report.value = res.data.data
  } catch (e) {
    toast.error(e.response?.data?.message || 'Terjadi kesalahan')
  } finally {
    loading.value = false
  }
}

const printReport = () => {
  if (!startDate.value || !endDate.value) {
    toast.error('Tanggal awal dan tanggal akhir wajib diisi')
    return
  }
  const q = new URLSearchParams({ start_date: startDate.value, end_date: endDate.value })
  window.open(`/print/production?${q.toString()}`, '_blank')
}

const exportExcel = async () => {
  if (!report.value) return

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Laporan Produksi')

  sheet.mergeCells('A1:F1')
  sheet.getCell('A1').value = `PRODUKSI ${fmtTitleDate(startDate.value)} S/D ${fmtTitleDate(endDate.value)}`
  sheet.getCell('A1').font = { bold: true, size: 13 }
  sheet.getCell('A1').alignment = { horizontal: 'center' }

  sheet.mergeCells('A2:F2')
  sheet.getCell('A2').value = 'PRODUKSI'
  sheet.getCell('A2').font = { bold: true, size: 12 }
  sheet.getCell('A2').alignment = { horizontal: 'center' }

  sheet.columns = [
    { key: 'hari', width: 14 },
    { key: 'tgl', width: 14 },
    { key: 'produk', width: 30 },
    { key: 'tonase', width: 16 },
    { key: 'q', width: 18 },
    { key: 'jumlah', width: 20 },
  ]

  const headerRow = sheet.getRow(4)
  headerRow.values = ['HARI', 'TGL', 'PRODUK', 'TONASE', 'Q', 'JUMLAH']
  headerRow.font = { bold: true }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

  for (let c = 1; c <= 6; c++) {
    headerRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    headerRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
  }

  let rowNum = 5
  for (const row of groupedRows.value) {
    const r = sheet.getRow(rowNum++)
    r.values = [
      row.showDate ? row.day_name : '',
      row.showDate ? fmtDate(row.production_date) : '',
      row.product_name,
      Number(row.tonase || 0),
      Number(row.q_price || 0),
      Number(row.total || 0),
    ]
    r.getCell(4).numFmt = '#,##0.00'
    r.getCell(5).numFmt = '#,##0'
    r.getCell(6).numFmt = '#,##0'
    for (let c = 1; c <= 6; c++) {
      r.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    }
  }

  if (groupedRows.value.length > 0) {
    const totalRow = sheet.getRow(rowNum)
    totalRow.getCell(3).value = 'TOTAL'
    totalRow.getCell(3).alignment = { horizontal: 'right' }
    totalRow.getCell(3).font = { bold: true }
    totalRow.getCell(4).value = Number(report.value.total_tonase || 0)
    totalRow.getCell(4).numFmt = '#,##0.00'
    totalRow.getCell(4).font = { bold: true }
    totalRow.getCell(6).value = Number(report.value.total_amount || 0)
    totalRow.getCell(6).numFmt = '#,##0'
    totalRow.getCell(6).font = { bold: true }
    for (let c = 1; c <= 6; c++) {
      totalRow.getCell(c).border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `Laporan_Produksi_${startDate.value}_${endDate.value}.xlsx`)
}
</script>

<style scoped>
.report-page { width: 100%; }
.report-title { text-align: center; font-weight: 700; font-size: 18px; margin-bottom: 4px; }
.report-subtitle { text-align: center; font-weight: 700; font-size: 15px; margin-bottom: 14px; }
.report-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.report-table th, .report-table td { border: 1px solid #e2e8f0; padding: 8px 10px; }
.report-table th { background: #f8fafc; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: #64748b; }
</style>
