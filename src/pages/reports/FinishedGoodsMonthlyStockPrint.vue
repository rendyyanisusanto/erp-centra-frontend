<template>
  <div class="print-page">
    <div v-if="loading" class="text-center" style="padding: 40px;">
      Memuat data laporan...
    </div>

    <div v-if="!loading && reportData">
      <!-- Action buttons -->
      <div class="print-actions no-print">
        <button class="btn btn-primary" @click="doPrint">🖨 Cetak Web / PDF</button>
        <button class="btn btn-secondary" @click="closeWindow">Tutup</button>
      </div>

      <div class="report-canvas">
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
              <td colspan="6" class="text-right fw-600">STOCK OPNAME :</td>
              <td class="text-right fw-600">{{ fmtNum(reportData.final_stock) }}</td>
            </tr>
          </tfoot>
        </table>

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

    <div v-if="!loading && !reportData" class="text-center" style="padding: 40px; color: #64748b;">
      Tidak ada data to print.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const loading = ref(true)
const reportData = ref(null)

const fmtNum = (n) => Number(n || 0).toLocaleString('id-ID')
const fmtVal = (n) => {
  const v = Number(n || 0)
  return v === 0 ? '-' : v.toLocaleString('id-ID')
}

const getMonthName = (m) => {
  const date = new Date(2000, parseInt(m) - 1, 1)
  return date.toLocaleString('id-ID', { month: 'long' }).toUpperCase()
}

const loadData = async () => {
  try {
    const { product_id, month, year } = route.query
    if (!product_id || !month || !year) {
      loading.value = false
      return
    }

    const res = await api.get('/reports/fg-monthly-stock', {
      params: { product_id, month, year }
    })
    reportData.value = res.data.data

    setTimeout(() => { window.print() }, 500)
  } catch (e) {
    console.error('Gagal memuat data print data', e)
    alert('Gagal memuat data laporan untuk dicetak.')
  } finally {
    loading.value = false
  }
}

const doPrint = () => { window.print() }
const closeWindow = () => { window.close() }

onMounted(() => { loadData() })
</script>

<style scoped>
.print-page {
  background: #f1f5f9; min-height: 100vh; padding: 24px;
  font-family: Arial, sans-serif; color: #0f172a;
}
.print-actions { display: flex; gap: 12px; justify-content: center; margin-bottom: 24px; }
.btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; font-size: 14px; }
.btn-primary { background: #4f46e5; color: white; }
.btn-secondary { background: #e2e8f0; color: #475569; }

.report-canvas {
  background: white; max-width: 794px; margin: 0 auto; padding: 40px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-bottom: 24px;
}
.report-header h2 { font-size: 18px; margin-bottom: 24px; }
.report-info-grid { margin-bottom: 24px; font-size: 14px; }
.info-row { display: flex; margin-bottom: 6px; }
.info-label { width: 120px; color: #0f172a; }
.info-colon { width: 20px; }
.info-value { font-weight: 600; }
.fw-600 { font-weight: 600; }

.report-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.report-table th, .report-table td { border: 1px solid #000; padding: 6px 10px; }
.report-table th { background: #f8fafc; font-weight: bold; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-success { color: #16a34a; font-weight: 500; }
.text-danger { color: #dc2626; font-weight: 500; }
.row-muted td { color: #94a3b8; }
.summary-row td { background: #f1f5f9; border-top: 2px solid #000; font-size: 13px; }

.signature-section {
  display: flex; justify-content: space-between; margin-top: 60px;
  padding: 0 40px; page-break-inside: avoid;
}
.signature-box { text-align: center; width: 200px; }
.signature-line { margin-top: 80px; }

@media print {
  .no-print { display: none !important; }
  .print-page { background: white; padding: 0; }
  .report-canvas { box-shadow: none; margin: 0; max-width: 100%; padding: 0; }
  .report-table thead { display: table-header-group; }
  .report-table tr { page-break-inside: avoid; page-break-after: auto; }
  .report-table th, .report-table td { font-size: 11px; }
}
</style>
