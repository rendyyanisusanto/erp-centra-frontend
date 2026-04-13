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

      <div v-for="(data, index) in reportData" :key="data.material.id" class="report-canvas" :class="{ 'page-break': index < reportData.length - 1 }">
        <div class="report-header text-center">
          <h2>RAW MATERIAL STOCK CARD REPORT</h2>
        </div>
        
        <div class="report-info-grid">
          <div class="info-row"><span class="info-label">Material</span><span class="info-colon">:</span><span class="info-value fw-600">{{ data.material.name }}</span></div>
          <div class="info-row"><span class="info-label">Satuan</span><span class="info-colon">:</span><span class="info-value">{{ data.material.unit }}</span></div>
          <div class="info-row"><span class="info-label">Rentang Tanggal</span><span class="info-colon">:</span><span class="info-value">{{ data.period.from || '-' }} to {{ data.period.to || '-' }}</span></div>
        </div>

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
              <td colspan="8" class="text-center" style="padding: 24px 0; color: #64748b;">
                No stock movement found for selected period
              </td>
            </tr>
            <tr v-else v-for="(m, i) in data.movements" :key="i">
              <td class="text-center">{{ i + 1 }}</td>
              <td>{{ m.date }}</td>
              <td>{{ m.reference }}</td>
              <td>{{ m.type }}</td>
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

const fmtStock = (n) => Number(n || 0).toLocaleString('id-ID')

const loadData = async () => {
  try {
    const { raw_material_id, date_from, date_to } = route.query
    const res = await api.get('/reports/raw-material-stock-card', {
      params: { raw_material_id, date_from, date_to }
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
  max-width: 900px;
  margin: 0 auto;
  padding: 40px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.report-header h2 {
  font-size: 20px;
  margin-bottom: 24px;
  border-bottom: 2px solid #0f172a;
  padding-bottom: 12px;
  text-align: center;
}

.report-info-grid {
  margin-bottom: 24px;
  font-size: 14px;
}

.info-row {
  display: flex;
  margin-bottom: 6px;
}
.info-label { width: 100px; color: #475569; }
.info-colon { width: 20px; }
.info-value { font-weight: 600; }

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.report-table th, .report-table td {
  border: 1px solid #cbd5e1;
  padding: 8px 12px;
}
.report-table th {
  background: #f8fafc;
  font-weight: bold;
}
.text-center { text-align: center; }
.text-right { text-align: right; }

.text-success { color: #16a34a; }
.text-danger { color: #dc2626; }

.stock-footer td {
  background: #f0fdf4;
  border-top: 2px double #0f172a;
  border-bottom: 2px double #0f172a;
  font-size: 14px;
  font-weight: 700;
  padding: 10px 12px;
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
  .report-table th, .report-table td { font-size: 12px; }
}
</style>
