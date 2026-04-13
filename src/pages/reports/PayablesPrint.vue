<template>
  <div class="print-page">
    <div v-if="loading" class="state-box">Memuat data laporan...</div>

    <div v-else-if="report">
      <div class="print-actions no-print">
        <button class="btn btn-primary" @click="doPrint">🖨 Cetak Web / PDF</button>
        <button class="btn btn-secondary" @click="closeWindow">Tutup</button>
      </div>

      <div class="report-canvas">
        <div class="header">
          <div class="company-name">PT. CENTRA AGRO PRATAMA</div>
          <div class="title">LAPORAN HUTANG</div>
          <div class="period">Periode: {{ dateFrom || '-' }} s.d. {{ dateTo || '-' }}</div>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 70px;">PO#</th>
              <th>Supplier</th>
              <th style="width: 120px;">Tanggal</th>
              <th class="text-right">Total</th>
              <th class="text-right">Dibayar</th>
              <th class="text-right">Sisa</th>
              <th style="width: 100px;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="report.length === 0">
              <td colspan="7" class="text-center text-muted">Tidak ada data hutang outstanding</td>
            </tr>
            <tr v-else v-for="r in report" :key="r.id">
              <td class="text-center">{{ r.id }}</td>
              <td>{{ r.supplier }}</td>
              <td>{{ r.date }}</td>
              <td class="text-right">{{ fmt(r.total_amount) }}</td>
              <td class="text-right">{{ fmt(r.total_paid) }}</td>
              <td class="text-right">{{ fmt(r.remaining) }}</td>
              <td class="text-center">{{ r.status }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="text-right fw-700">TOTAL SISA</td>
              <td class="text-right fw-700">{{ fmt(totalSisa) }}</td>
              <td></td>
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
const report = ref(null)
const dateFrom = ref('')
const dateTo = ref('')

const fmt = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const totalSisa = computed(() => report.value?.reduce((s, r) => s + Number(r.remaining || 0), 0) || 0)

const loadData = async () => {
  loading.value = true
  try {
    dateFrom.value = route.query.date_from || ''
    dateTo.value = route.query.date_to || ''
    const res = await api.get('/reports/payables', { params: { date_from: dateFrom.value, date_to: dateTo.value } })
    report.value = res.data.data || []
    setTimeout(() => window.print(), 300)
  } catch {
    report.value = []
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
.header { border-bottom: 2px solid #111827; margin-bottom: 12px; padding-bottom: 8px; }
.company-name { font-size: 18px; font-weight: 700; }
.title { font-size: 16px; font-weight: 700; margin-top: 4px; }
.period { margin-top: 4px; font-size: 13px; }

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
