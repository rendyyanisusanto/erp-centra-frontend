<template>
  <div class="print-page">
    <div v-if="loading" class="text-center" style="padding: 40px;">Memuat dokumen...</div>

    <div v-if="!loading && item">
      <div class="print-actions no-print">
        <button class="btn btn-primary" @click="doPrint">🖨 Cetak Web / PDF</button>
        <button class="btn btn-secondary" @click="closeWindow">Tutup</button>
      </div>

      <div class="report-canvas">
        <div class="header-top">
          <div class="company-name">PT. CENTRA AGRO PRATAMA</div>
          <div class="form-code">FM-GD-08-02</div>
        </div>
        <div class="title">BUKTI PENGELUARAN BARANG DARI GUDANG</div>

        <div class="report-info-grid">
          <div class="info-row"><span class="info-label">Nomor Bukti</span><span class="info-colon">:</span><span class="info-value">{{ item.issue_number }}</span></div>
          <div class="info-row"><span class="info-label">Tanggal</span><span class="info-colon">:</span><span class="info-value">{{ fmtDate(item.date) }}</span></div>
          <div class="info-row"><span class="info-label">Bagian</span><span class="info-colon">:</span><span class="info-value">{{ item.department }}</span></div>
          <div class="info-row"><span class="info-label">Penerima</span><span class="info-colon">:</span><span class="info-value">{{ item.recipientEmployee?.name || '-' }}</span></div>
          <div class="info-row"><span class="info-label">Posisi</span><span class="info-colon">:</span><span class="info-value">{{ item.recipientEmployee?.position?.name || '-' }}</span></div>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 42px">No</th>
              <th style="width: 95px">Tgl</th>
              <th>Nama Barang</th>
              <th class="text-right" style="width: 80px">Jumlah</th>
              <th class="text-right" style="width: 80px">Base Qty</th>
              <th style="width: 80px">Satuan</th>
              <th style="width: 130px">Penerima</th>
              <th style="width: 120px">Posisi</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!item.details?.length"><td colspan="9" class="text-center text-muted">No detail items</td></tr>
            <tr v-else v-for="(d, i) in item.details" :key="d.id">
              <td class="text-center">{{ i + 1 }}</td>
              <td>{{ fmtDate(item.date, true) }}</td>
              <td>{{ d.rawMaterial?.name || d.raw_material_id }}</td>
              <td class="text-right">{{ fmtQty(d.qty) }}</td>
              <td class="text-right">{{ fmtQty(d.base_qty || d.qty) }}</td>
              <td>{{ d.unit?.name || d.unit_id }}</td>
              <td>{{ item.recipientEmployee?.name || '-' }}</td>
              <td>{{ item.recipientEmployee?.position?.name || '-' }}</td>
              <td>{{ d.note || item.description || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="!loading && !item" class="text-center" style="padding: 40px; color: #64748b;">
      Dokumen belum APPROVED atau data tidak ditemukan.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const loading = ref(true)
const item = ref(null)

const fmtDate = (v, dateOnly = false) => {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  if (dateOnly) return d.toISOString().split('T')[0]
  return d.toLocaleString('id-ID')
}
const fmtQty = (v) => Number(v || 0).toLocaleString('id-ID')

const loadData = async () => {
  try {
    const id = route.query.id
    if (!id) throw new Error('ID tidak ditemukan')
    const r = await api.get(`/reports/material-issues/${id}/print`)
    item.value = r.data.data

    setTimeout(() => {
      window.print()
    }, 400)
  } catch {
    item.value = null
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
.print-actions { display: flex; gap: 12px; justify-content: center; margin-bottom: 24px; }
.btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; font-size: 14px; }
.btn-primary { background: #4f46e5; color: #fff; }
.btn-secondary { background: #e2e8f0; color: #475569; }

.report-canvas { background: #fff; max-width: 794px; margin: 0 auto; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,.1); }
.header-top { display: flex; justify-content: space-between; align-items: center; border: 1px solid #111827; padding: 8px 12px; }
.company-name { font-weight: 700; font-size: 16px; letter-spacing: .2px; }
.form-code { font-size: 12px; font-weight: 600; }
.title { border: 1px solid #111827; border-top: none; text-align: center; font-weight: 700; font-size: 16px; padding: 10px; margin-bottom: 12px; }

.report-info-grid { margin-bottom: 12px; font-size: 13px; }
.info-row { display: flex; margin-bottom: 4px; }
.info-label { width: 84px; }
.info-colon { width: 16px; }
.info-value { font-weight: 600; }

.report-table { width: 100%; border-collapse: collapse; font-size: 11.8px; }
.report-table th, .report-table td { border: 1px solid #111827; padding: 6px 8px; vertical-align: top; }
.report-table th { background: #f3f4f6; font-weight: 700; text-align: center; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: #64748b; }

@media print {
  .no-print { display: none !important; }
  .print-page { background: #fff; padding: 0; }
  .report-canvas { box-shadow: none; margin: 0; max-width: 100%; padding: 0; }
}
</style>
