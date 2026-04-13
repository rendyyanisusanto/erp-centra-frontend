<template>
  <div class="print-page">
    <div v-if="loading" class="text-center" style="padding: 40px;">
      Memuat data laporan...
    </div>
    
    <div v-if="!loading && reportData && reportData.length > 0">
      <!-- Action buttons hidden during actual print -->
      <div class="print-actions no-print">
        <button class="btn btn-primary" @click="doPrint">🖨 Cetak Web / PDF</button>
        <button class="btn btn-secondary" @click="closeWindow">Tutup</button>
      </div>

      <div class="report-canvas">
        <div class="report-header text-center">
          <h2 style="margin-bottom: 8px;">PT. CENTRA AGRO PRATAMA</h2>
          <h2>LAPORAN STOCK BARANG JADI OPNAME</h2>
        </div>
        
        <div class="report-info-grid">
          <div class="info-row">
            <span class="info-label">BULAN</span>
            <span class="info-colon">:</span>
            <span class="info-value fw-600">
              {{ filterInfo.monthStr }} {{ filterInfo.year }}
            </span>
          </div>
        </div>

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
    
    <div v-if="!loading && (!reportData || reportData.length === 0)" class="text-center" style="padding: 40px; color: #64748b;">
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

const filterInfo = ref({ monthStr: 'ALL', year: 'ALL' })

const fmtStock = (n) => Number(n || 0).toLocaleString('id-ID')

const getMonthName = (m) => {
  const date = new Date(2000, parseInt(m) - 1, 1);
  return date.toLocaleString('id-ID', { month: 'long' }).toUpperCase();
}

const deviationClass = (diff) => {
  const val = Number(diff || 0)
  if (val < 0) return 'text-danger fw-600'
  if (val > 0) return 'text-success fw-600'
  return ''
}

const loadData = async () => {
  try {
    const { month, year, stock_adjustment_id } = route.query
    
    if (month) filterInfo.value.monthStr = getMonthName(month);
    if (year) filterInfo.value.year = year;

    const res = await api.get('/reports/stock-opname-product', {
      params: { month, year, stock_adjustment_id }
    })
    reportData.value = res.data.data
    
    // Auto print when loaded
    setTimeout(() => {
      window.print()
    }, 500)
    
  } catch (e) {
    console.error('Gagal memuat data print data', e)
    alert('Gagal memuat data laporan untuk dicetak.')
  } finally {
    loading.value = false
  }
}

const doPrint = () => {
  window.print()
}

const closeWindow = () => {
  window.close()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* Base print page styles (A4 portrait simulation) */
.print-page {
  background: #f1f5f9;
  min-height: 100vh;
  padding: 24px;
  font-family: Arial, sans-serif;
  color: #0f172a;
}

.print-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
}
.btn-primary { background: #4f46e5; color: white; }
.btn-secondary { background: #e2e8f0; color: #475569; }

.report-canvas {
  background: white;
  max-width: 794px; /* A4 Portrait approx width */
  margin: 0 auto;
  padding: 40px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
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
.info-label { width: 80px; color: #0f172a; }
.info-colon { width: 20px; }
.info-value { font-weight: 600; }

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.report-table th, .report-table td {
  border: 1px solid #000;
  padding: 8px 12px;
}
.report-table th {
  background: #f8fafc;
  font-weight: bold;
}
.text-center { text-align: center; }
.text-right { text-align: right; }

.text-success { color: #16a34a; font-weight: 500; }
.text-danger { color: #dc2626; font-weight: 500; }
.text-muted { color: #64748b; }
.fw-600 { font-weight: 600; }

.signature-section {
  display: flex;
  justify-content: space-between;
  margin-top: 60px;
  padding: 0 40px;
  page-break-inside: avoid;
}
.signature-box {
  text-align: center;
  width: 200px;
}
.signature-line {
  margin-top: 80px;
}


/* Print-specific CSS overrides */
@media print {
  .no-print { display: none !important; }
  .print-page { background: white; padding: 0; }
  .report-canvas {
    box-shadow: none;
    margin: 0;
    max-width: 100%;
    padding: 0;
  }
  .page-break {
    page-break-after: always;
  }
  .report-table table { page-break-inside: auto }
  .report-table tr { page-break-inside: avoid; page-break-after: auto }
  .report-table thead { display: table-header-group; }
  .report-table th, .report-table td { font-size: 12px; }
}
</style>
