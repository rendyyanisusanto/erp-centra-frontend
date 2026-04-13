<template>
  <div class="print-page">
    <div v-if="loading" class="state-box">Memuat kwitansi pembayaran...</div>
    <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>

    <div v-else-if="payload">
      <div class="print-actions no-print">
        <button class="btn btn-primary" @click="doPrint">Cetak Kwitansi</button>
        <button class="btn btn-secondary" @click="closeWindow">Tutup</button>
      </div>

      <div class="receipt-paper">
        <div class="header">
          <div class="company-name">PT. CENTRA AGRO PRATAMA</div>
          <div class="title">KWITANSI PEMBAYARAN</div>
        </div>

        <div class="content">
          <div class="line-row">
            <span class="label">Sudah terima dari</span>
            <span class="colon">:</span>
            <span class="value">{{ payload.sale?.customer?.name || '-' }}</span>
          </div>
          <div class="line-row">
            <span class="label">Uang sejumlah</span>
            <span class="colon">:</span>
            <span class="value">{{ fmtCurrency(payload.total_paid) }}</span>
          </div>
          <div class="line-row">
            <span class="label"></span>
            <span class="colon"></span>
            <span class="text-amount">({{ terbilang(payload.total_paid) }} rupiah)</span>
          </div>
          <div class="line-row">
            <span class="label">Untuk pembayaran</span>
            <span class="colon">:</span>
            <span class="value">Penjualan No SO-{{ payload.sale?.id }}</span>
          </div>
          <div class="line-row">
            <span class="label">Tanggal pembayaran</span>
            <span class="colon">:</span>
            <span class="value">{{ paymentDateText }}</span>
          </div>
        </div>

        <table class="doc-table" v-if="(payload.sale_payments || []).length > 1">
          <thead>
            <tr>
              <th class="text-center" style="width: 52px;">No</th>
              <th>Tanggal</th>
              <th>Akun</th>
              <th class="text-right" style="width: 170px;">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, idx) in payload.sale_payments" :key="p.id || idx">
              <td class="text-center">{{ idx + 1 }}</td>
              <td>{{ fmtDate(p.date) }}</td>
              <td>{{ p.account?.name || '-' }}</td>
              <td class="text-right">{{ fmtCurrency(p.amount) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row"><span>Total penjualan</span><span>{{ fmtCurrency(payload.sale?.total_amount) }}</span></div>
          <div class="summary-row"><span>Total dibayar</span><span>{{ fmtCurrency(payload.total_paid) }}</span></div>
          <div class="summary-row"><span>Sisa</span><span>{{ fmtCurrency(payload.remaining_amount) }}</span></div>
        </div>

        <div class="signature-grid">
          <div class="signature-box">
            <div class="signature-label">Penerima,</div>
            <div class="signature-space"></div>
            <div class="signature-name">(...........................)</div>
          </div>
          <div class="signature-box">
            <div class="signature-label">Pembayar,</div>
            <div class="signature-space"></div>
            <div class="signature-name">(...........................)</div>
          </div>
        </div>
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
const payload = ref(null)
const errorMessage = ref('')

const fmtCurrency = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`
const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

const paymentDateText = computed(() => {
  const payments = payload.value?.sale_payments || []
  if (!payments.length) return '-'
  return fmtDate(payments[payments.length - 1].date)
})

const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']
const toWords = (n) => {
  if (n < 12) return units[n]
  if (n < 20) return `${toWords(n - 10)} belas`
  if (n < 100) return `${toWords(Math.floor(n / 10))} puluh ${toWords(n % 10)}`
  if (n < 200) return `seratus ${toWords(n - 100)}`
  if (n < 1000) return `${toWords(Math.floor(n / 100))} ratus ${toWords(n % 100)}`
  if (n < 2000) return `seribu ${toWords(n - 1000)}`
  if (n < 1000000) return `${toWords(Math.floor(n / 1000))} ribu ${toWords(n % 1000)}`
  if (n < 1000000000) return `${toWords(Math.floor(n / 1000000))} juta ${toWords(n % 1000000)}`
  if (n < 1000000000000) return `${toWords(Math.floor(n / 1000000000))} miliar ${toWords(n % 1000000000)}`
  return `${toWords(Math.floor(n / 1000000000000))} triliun ${toWords(n % 1000000000000)}`
}
const terbilang = (value) => {
  const num = Math.floor(Number(value || 0))
  if (!Number.isFinite(num) || num <= 0) return 'nol'
  return toWords(num).replace(/\s+/g, ' ').trim()
}

const loadData = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const saleId = route.params.sale_id
    if (!saleId) {
      errorMessage.value = 'ID penjualan tidak ditemukan.'
      return
    }
    const res = await api.get(`/sales/${saleId}/payments`)
    payload.value = res.data.data
    if (!payload.value?.sale_payments?.length) {
      errorMessage.value = 'Data pembayaran belum tersedia, kwitansi tidak dapat dicetak.'
      return
    }
    setTimeout(() => window.print(), 300)
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal memuat data kwitansi.'
  } finally {
    loading.value = false
  }
}

const doPrint = () => window.print()
const closeWindow = () => window.close()

onMounted(loadData)
</script>

<style scoped>
.print-page { min-height: 100vh; background: #f1f5f9; padding: 24px; font-family: Arial, sans-serif; color: #111827; }
.state-box { max-width: 820px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; }
.state-box.error { color: #b91c1c; }
.print-actions { display: flex; gap: 12px; justify-content: center; margin-bottom: 20px; }
.btn { border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 14px; }
.btn-primary { background: #0f766e; color: #fff; }
.btn-secondary { background: #e2e8f0; color: #334155; }

.receipt-paper { max-width: 794px; margin: 0 auto; background: #fff; padding: 26px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); }
.header { border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
.company-name { font-size: 19px; font-weight: 700; letter-spacing: 0.2px; }
.title { margin-top: 4px; font-size: 17px; font-weight: 700; text-transform: uppercase; }

.content { margin-bottom: 14px; font-size: 13px; }
.line-row { display: flex; margin-bottom: 4px; }
.label { width: 130px; }
.colon { width: 16px; text-align: center; }
.value { font-weight: 600; }
.text-amount { font-style: italic; color: #334155; }

.doc-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 12px; }
.doc-table th, .doc-table td { border: 1px solid #111827; padding: 7px 8px; vertical-align: top; }
.doc-table th { background: #f8fafc; }
.text-center { text-align: center; }
.text-right { text-align: right; }

.summary { margin-left: auto; width: 300px; border: 1px solid #111827; }
.summary-row { display: flex; justify-content: space-between; padding: 7px 10px; border-bottom: 1px solid #d1d5db; }
.summary-row:last-child { border-bottom: none; font-weight: 700; }

.signature-grid { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; }
.signature-box { text-align: center; }
.signature-label { margin-bottom: 50px; }
.signature-name { border-top: 1px solid #111827; padding-top: 6px; font-size: 13px; }

@media print {
  @page { size: A4 portrait; margin: 12mm; }
  .no-print { display: none !important; }
  .print-page { background: #fff; padding: 0; min-height: auto; }
  .receipt-paper { box-shadow: none; max-width: 100%; margin: 0; padding: 0; }
}
</style>
