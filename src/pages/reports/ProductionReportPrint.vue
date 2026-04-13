<template>
  <div class="print-page">
    <div v-if="loading" class="state-box">Memuat data laporan...</div>

    <div v-else>
      <div class="print-actions no-print">
        <button class="btn btn-primary" @click="doPrint">🖨 Cetak Web / PDF</button>
        <button class="btn btn-secondary" @click="closeWindow">Tutup</button>
      </div>

      <div class="report-canvas">
        <div class="report-title">PRODUKSI {{ fmtTitleDate(startDate) }} S/D {{ fmtTitleDate(endDate) }}</div>
        <div class="report-subtitle">PRODUKSI</div>

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
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const loading = ref(true)
const report = ref({ rows: [], total_tonase: 0, total_amount: 0 })
const startDate = ref('')
const endDate = ref('')

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

const loadData = async () => {
  loading.value = true
  try {
    startDate.value = route.query.start_date || ''
    endDate.value = route.query.end_date || ''
    const res = await api.get('/reports/production', { params: { start_date: startDate.value, end_date: endDate.value } })
    report.value = res.data.data || { rows: [], total_tonase: 0, total_amount: 0 }
    setTimeout(() => window.print(), 300)
  } catch {
    report.value = { rows: [], total_tonase: 0, total_amount: 0 }
  } finally {
    loading.value = false
  }
}

const doPrint = () => window.print()
const closeWindow = () => window.close()

onMounted(loadData)
</script>

<style scoped>
.print-page { background: #f1f5f9; min-height: 100vh; padding: 24px; font-family: Arial, sans-serif; color: #111827; }
.state-box { max-width: 794px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; }
.print-actions { display: flex; gap: 12px; justify-content: center; margin-bottom: 20px; }
.btn { padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; }
.btn-primary { background: #0f766e; color: #fff; }
.btn-secondary { background: #e2e8f0; color: #334155; }

.report-canvas { max-width: 794px; margin: 0 auto; background: #fff; padding: 26px; box-shadow: 0 4px 12px rgba(0,0,0,.12); }
.report-title { text-align: center; font-weight: 700; font-size: 18px; margin-bottom: 4px; }
.report-subtitle { text-align: center; font-weight: 700; font-size: 15px; margin-bottom: 12px; }
.report-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.report-table th, .report-table td { border: 1px solid #111827; padding: 7px 8px; }
.report-table th { background: #f8fafc; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: #64748b; }
.fw-700 { font-weight: 700; }

@media print {
  @page { size: A4 portrait; margin: 12mm; }
  .no-print { display: none !important; }
  .print-page { background: #fff; padding: 0; }
  .report-canvas { box-shadow: none; max-width: 100%; margin: 0; padding: 0; }
}
</style>
