<template>
  <div class="print-page">
    <div v-if="loading" class="state-box">Memuat nota penjualan...</div>
    <div v-else-if="errorMessage" class="state-box error">{{ errorMessage }}</div>

    <div v-else-if="sale">
      <div class="print-actions no-print">
        <button class="btn btn-primary" @click="doPrint">Cetak Nota</button>
        <button class="btn btn-secondary" @click="closeWindow">Tutup</button>
      </div>

      <div class="invoice-paper">
        <div class="header">
          <div class="company-name">PT. CENTRA AGRO PRATAMA</div>
          <div class="title">NOTA PENJUALAN</div>
        </div>

        <div class="info-grid">
          <div class="info-row"><span class="label">Nomor Nota</span><span class="colon">:</span><span class="value">SO-{{ sale.id }}</span></div>
          <div class="info-row"><span class="label">Tanggal</span><span class="colon">:</span><span class="value">{{ fmtDate(sale.date) }}</span></div>
          <div class="info-row"><span class="label">Customer</span><span class="colon">:</span><span class="value">{{ sale.customer?.name || '-' }}</span></div>
          <div class="info-row"><span class="label">Alamat</span><span class="colon">:</span><span class="value">{{ sale.customer?.address || '-' }}</span></div>
          <div class="info-row"><span class="label">Sales</span><span class="colon">:</span><span class="value">{{ sale.salesman ? `${sale.salesman.code} - ${sale.salesman.name}` : '-' }}</span></div>
          <div class="info-row"><span class="label">No Polisi</span><span class="colon">:</span><span class="value">{{ sale.license_plate || '-' }}</span></div>
        </div>

        <table class="doc-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 52px;">No</th>
              <th>Nama Produk</th>
              <th class="text-right" style="width: 90px;">Qty</th>
              <th class="text-right" style="width: 140px;">Harga</th>
              <th class="text-right" style="width: 160px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!sale.details?.length">
              <td colspan="5" class="text-center text-muted">Data item tidak tersedia</td>
            </tr>
            <tr v-else v-for="(d, idx) in sale.details" :key="d.id || idx">
              <td class="text-center">{{ idx + 1 }}</td>
              <td>{{ d.product?.name || '-' }}</td>
              <td class="text-right">{{ fmtQty(d.qty) }}</td>
              <td class="text-right">{{ fmtCurrency(d.price) }}</td>
              <td class="text-right">{{ fmtCurrency(d.subtotal) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="text-right total-label">TOTAL</td>
              <td class="text-right total-value">{{ fmtCurrency(sale.total_amount) }}</td>
            </tr>
          </tfoot>
        </table>

        <div class="notes">
          <div class="notes-label">Keterangan:</div>
          <div class="notes-value">{{ sale.description || '-' }}</div>
        </div>

        <div class="signature-grid">
          <div class="signature-box">
            <div class="signature-label">Dibuat oleh,</div>
            <div class="signature-space"></div>
            <div class="signature-name">{{ sale.creator?.name || '-' }}</div>
          </div>
          <div class="signature-box">
            <div class="signature-label">Diterima oleh,</div>
            <div class="signature-space"></div>
            <div class="signature-name">(...........................)</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const loading = ref(true)
const sale = ref(null)
const errorMessage = ref('')

const fmtCurrency = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`
const fmtQty = (n) => Number(n || 0).toLocaleString('id-ID')
const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

const loadData = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const id = route.params.id
    if (!id) {
      errorMessage.value = 'ID penjualan tidak ditemukan.'
      return
    }
    const res = await api.get(`/sales/${id}/print`)
    sale.value = res.data.data
    if (!sale.value?.details?.length) {
      errorMessage.value = 'Detail penjualan kosong, nota tidak dapat dicetak.'
      return
    }
    setTimeout(() => window.print(), 300)
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Gagal memuat nota penjualan.'
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

.invoice-paper { max-width: 794px; margin: 0 auto; background: #fff; padding: 26px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); }
.header { border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 14px; }
.company-name { font-size: 19px; font-weight: 700; letter-spacing: 0.2px; }
.title { margin-top: 4px; font-size: 17px; font-weight: 700; text-transform: uppercase; }

.info-grid { margin-bottom: 14px; font-size: 13px; }
.info-row { display: flex; margin-bottom: 4px; }
.label { width: 95px; }
.colon { width: 16px; text-align: center; }
.value { font-weight: 600; }

.doc-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.doc-table th, .doc-table td { border: 1px solid #111827; padding: 7px 8px; vertical-align: top; }
.doc-table th { background: #f8fafc; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-muted { color: #64748b; }
.total-label, .total-value { font-weight: 700; background: #f8fafc; }

.notes { margin-top: 12px; font-size: 13px; }
.notes-label { font-weight: 700; margin-bottom: 4px; }
.notes-value { min-height: 24px; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; }

.signature-grid { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; }
.signature-box { text-align: center; }
.signature-label { margin-bottom: 50px; }
.signature-name { border-top: 1px solid #111827; padding-top: 6px; font-size: 13px; }

@media print {
  @page { size: A4 portrait; margin: 12mm; }
  .no-print { display: none !important; }
  .print-page { background: #fff; padding: 0; min-height: auto; }
  .invoice-paper { box-shadow: none; max-width: 100%; margin: 0; padding: 0; }
}
</style>
