<template>
  <div class="report-page">
    <div class="page-header">
      <div>
        <div class="page-title">Laporan Hutang</div>
        <div class="page-subtitle">Tagihan ke supplier yang belum lunas</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" @click="exportExcel" :disabled="!report">📥 Export Excel</button>
        <button class="btn btn-secondary" @click="printReport" :disabled="!report">🖨 Cetak Web / PDF</button>
      </div>
    </div>

    <div class="card no-print" style="margin-bottom:16px">
      <div class="card-body" style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">
        <div class="form-group" style="margin:0">
          <label class="form-label">Dari</label>
          <input class="form-control" type="date" v-model="dateDari" />
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Sampai</label>
          <input class="form-control" type="date" v-model="dateSampai" />
        </div>
        <button class="btn btn-primary" :disabled="loading" @click="fetchReport">
          <span v-if="loading" class="spinner"></span>
          <span v-else>Buat Laporan</span>
        </button>
      </div>
    </div>

    <div class="card" v-if="report">
      <div class="card-header">
        <span class="fw-600">Laporan Hutang</span>
        <span class="fw-700 text-danger">Total: {{ fmt(totalSisa) }}</span>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>PO#</th>
              <th>Supplier</th>
              <th>Tanggal</th>
              <th>Total</th>
              <th>Dibayar</th>
              <th>Sisa</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="report.length===0">
              <tr>
                <td colspan="7">
                  <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <h3>Tidak ada hutang outstanding</h3>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-else v-for="r in report" :key="r.id">
              <td>{{ r.id }}</td>
              <td class="fw-600">{{ r.supplier }}</td>
              <td>{{ r.date }}</td>
              <td>{{ fmt(r.total_amount) }}</td>
              <td class="text-success">{{ fmt(r.total_paid) }}</td>
              <td class="fw-600 text-danger">{{ fmt(r.remaining) }}</td>
              <td><StatusBadge :status="r.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="empty-state" v-else-if="!loading">
      <div class="empty-state-icon">🔴</div>
      <h3>Pilih rentang tanggal lalu klik Buat Laporan</h3>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useToastStore } from '@/stores/toast'
import StatusBadge from '@/components/StatusBadge.vue'
import api from '@/services/api'

const toast = useToastStore()
const dateDari = ref('')
const dateSampai = ref('')
const report = ref(null)
const loading = ref(false)

const fmt = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const totalSisa = computed(() => report.value?.reduce((s, r) => s + Number(r.remaining), 0) || 0)

const fetchReport = async () => {
  loading.value = true
  try {
    const r = await api.get('/reports/payables', { params: { date_from: dateDari.value, date_to: dateSampai.value } })
    report.value = r.data.data
  } catch (e) {
    toast.error('Terjadi kesalahan')
  } finally {
    loading.value = false
  }
}

const printReport = () => {
  const q = new URLSearchParams()
  if (dateDari.value) q.set('date_from', dateDari.value)
  if (dateSampai.value) q.set('date_to', dateSampai.value)
  window.open(`/print/payables?${q.toString()}`, '_blank')
}

const exportExcel = async () => {
  if (!report.value) return

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Laporan Hutang')

  sheet.mergeCells('A1:G1')
  sheet.getCell('A1').value = 'PT. CENTRA AGRO PRATAMA'
  sheet.getCell('A1').font = { bold: true, size: 14 }
  sheet.getCell('A1').alignment = { horizontal: 'center' }

  sheet.mergeCells('A2:G2')
  sheet.getCell('A2').value = 'LAPORAN HUTANG'
  sheet.getCell('A2').font = { bold: true, size: 12 }
  sheet.getCell('A2').alignment = { horizontal: 'center' }

  sheet.getCell('A4').value = 'Periode:'
  sheet.getCell('B4').value = `${dateDari.value || '-'} s.d. ${dateSampai.value || '-'}`

  sheet.columns = [
    { key: 'po', width: 10 },
    { key: 'supplier', width: 28 },
    { key: 'date', width: 14 },
    { key: 'total', width: 18 },
    { key: 'paid', width: 18 },
    { key: 'remaining', width: 18 },
    { key: 'status', width: 14 },
  ]

  const headerRow = sheet.getRow(6)
  headerRow.values = ['PO#', 'Supplier', 'Tanggal', 'Total', 'Dibayar', 'Sisa', 'Status']
  headerRow.font = { bold: true }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

  for (let c = 1; c <= 7; c++) {
    headerRow.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    headerRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
  }

  let rowNum = 7
  for (const row of report.value) {
    const r = sheet.getRow(rowNum++)
    r.values = [row.id, row.supplier, row.date, Number(row.total_amount), Number(row.total_paid), Number(row.remaining), row.status]
    r.getCell(1).alignment = { horizontal: 'center' }
    r.getCell(4).numFmt = '#,##0'
    r.getCell(5).numFmt = '#,##0'
    r.getCell(6).numFmt = '#,##0'
    for (let c = 1; c <= 7; c++) {
      r.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    }
  }

  const totalRow = sheet.getRow(rowNum)
  totalRow.getCell(5).value = 'TOTAL SISA'
  totalRow.getCell(5).font = { bold: true }
  totalRow.getCell(5).alignment = { horizontal: 'right' }
  totalRow.getCell(6).value = Number(totalSisa.value)
  totalRow.getCell(6).numFmt = '#,##0'
  totalRow.getCell(6).font = { bold: true }
  for (let c = 1; c <= 7; c++) {
    totalRow.getCell(c).border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `Laporan_Hutang_${new Date().toISOString().split('T')[0]}.xlsx`)
}
</script>

<style scoped>
.report-page { width: 100%; }
</style>
