<template>
  <div class="print-page">
    <div v-if="loading" class="text-center" style="padding: 40px;">
      Memuat data laporan...
    </div>
    
    <div v-if="!loading && reportData">
      <div class="print-actions no-print">
        <button class="btn btn-primary" @click="doPrint">🖨 Cetak Web / PDF</button>
        <button class="btn btn-secondary" @click="closeWindow">Tutup</button>
      </div>

      <div class="report-canvas">
        <div class="header-section">
          <div style="margin-bottom: 24px;">
            <div class="fw-700 font-lg">PT. CENTRA AGRO PRATAMA</div>
            <div>Desa Bolo, Kec.Ujungpangkah, Kab.Gresik</div>
          </div>
          <div class="text-center" style="margin-top: 24px;">
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

        <!-- Summary Section -->
        <div v-if="reportData.summaries.length > 0" class="page-break-avoid" style="margin-top: 40px;">
          <h3 style="margin-bottom: 16px; font-size: 16px;">Ringkasan per Bahan</h3>
          <table class="report-table" style="width: 70%;">
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
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const loading = ref(true)
const reportData = ref(null)

const filterInfo = ref({ periodStr: '' })

const fmtStock = (n) => Number(n || 0).toLocaleString('id-ID')
const fmtCurrency = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

const loadData = async () => {
  try {
    const { date_from, date_to, supplier_id } = route.query
    
    filterInfo.value.periodStr = `${date_from || '-'} to ${date_to || '-'}`

    const res = await api.get('/reports/purchase-order-recap', {
      params: { date_from, date_to, supplier_id }
    })
    reportData.value = res.data.data
    
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
.print-page { background: #f1f5f9; min-height: 100vh; padding: 24px; font-family: Arial, sans-serif; color: #000; }
.print-actions { display: flex; gap: 12px; justify-content: center; margin-bottom: 24px; }
.btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; font-size: 14px; }
.btn-primary { background: #4f46e5; color: white; }
.btn-secondary { background: #e2e8f0; color: #475569; }

/* A4 Portrait size roughly */
.report-canvas { background: white; max-width: 794px; margin: 0 auto; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.header-section { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 24px; }
.font-lg { font-size: 18px; }
.report-info-grid { margin-bottom: 16px; font-size: 14px; }
.info-row { display: flex; margin-bottom: 6px; }
.info-label { width: 80px; font-weight: bold; }
.info-colon { width: 20px; }
.info-value { font-weight: bold; }

.report-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.report-table th, .report-table td { border: 1px solid #000; padding: 8px 12px; }
.report-table th { background: #f8fafc; font-weight: bold; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-muted { color: #475569; padding: 24px !important; }
.table-total td { border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: bold; background: #f8fafc; }

@media print {
  @page { margin: 15mm; }
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print { display: none !important; }
  .print-page { background: white; padding: 0; }
  .report-canvas {
    box-shadow: none; margin: 0; max-width: 100%; padding: 0;
  }
  .report-table { page-break-inside: auto }
  .report-table tr { page-break-inside: avoid; page-break-after: auto }
  .report-table thead { display: table-header-group; }
  .page-break-avoid { page-break-inside: avoid; }
  /* Ensure page numbers shown by browser are visible if enabled by user */
}
</style>
