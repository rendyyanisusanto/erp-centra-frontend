<template>
  <div class="report-page">
    <div class="page-header no-print">
      <div>
        <div class="page-title">Laporan Pengeluaran Bahan Baku</div>
        <div class="page-subtitle">Bukti Pengeluaran Barang dari Gudang (Bulanan)</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" @click="printReport" :disabled="!reportData || !reportData.rows?.length">🖨 Cetak Web / PDF</button>
      </div>
    </div>

    <div class="card no-print" style="margin-bottom: 24px;">
      <div class="card-header" style="display:flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: flex-start;">
        <div>
          <label class="form-label required">Bulan</label>
          <select class="form-control" v-model="filter.month" style="width: 140px;">
            <option value="">-- Pilih --</option>
            <option v-for="m in 12" :key="m" :value="String(m).padStart(2, '0')">{{ m }}</option>
          </select>
        </div>
        <div>
          <label class="form-label required">Tahun</label>
          <select class="form-control" v-model="filter.year" style="width: 120px;">
            <option value="">-- Pilih --</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div>
          <button class="btn btn-primary" @click="generateReport" :disabled="loading" style="height: 38px;">
            <span v-if="loading" class="spinner"></span><span v-else>Buat Laporan</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="reportData && reportData.rows?.length" class="card" style="margin-bottom: 24px;">
      <div class="card-body">
        <div class="report-canvas">
          <div class="report-header text-center">
            <h2 style="margin-bottom: 8px;">PT. CENTRA AGRO PRATAMA</h2>
            <h2>BUKTI PENGELUARAN BARANG DARI GUDANG</h2>
            <div style="font-size: 13px; margin-top: 4px;">FM-GD-08-02</div>
          </div>

          <div class="report-info-grid">
            <div class="info-row">
              <span class="info-label">BULAN</span>
              <span class="info-colon">:</span>
              <span class="info-value fw-600">
                {{ monthName(filter.month) }} {{ filter.year }}
              </span>
            </div>
          </div>

          <div class="report-table-wrapper">
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 110px;">Tgl</th>
                  <th>Nama Barang</th>
                  <th style="width: 90px;" class="text-right">Jumlah</th>
                  <th style="width: 90px;">Satuan</th>
                  <th style="width: 150px;">Penerima</th>
                  <th style="width: 130px;">Posisi</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in reportData.rows" :key="`${row.material_issue_id}-${i}`">
                  <td>{{ row.date }}</td>
                  <td>{{ row.raw_material_name }}</td>
                  <td class="text-right">{{ fmtQty(row.qty) }}</td>
                  <td>{{ row.unit_name }}</td>
                  <td>{{ row.recipient_name }}</td>
                  <td>{{ row.position_name }}</td>
                  <td>{{ row.note || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

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
    </div>

    <div v-else-if="reportData && !reportData.rows?.length" class="card text-center" style="padding: 40px;">
      <div style="font-size: 3rem; margin-bottom: 16px;">📄</div>
      <h3 style="color: #475569;">Data tidak ditemukan</h3>
      <p style="color: #64748b;">Tidak ada data APPROVED untuk periode ini.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const toast = useToastStore()
const currentYear = new Date().getFullYear()
const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

const filter = ref({ month: String(new Date().getMonth() + 1).padStart(2, '0'), year: currentYear })
const loading = ref(false)
const reportData = ref(null)

const monthName = (m) => {
  if (!m) return '-'
  return new Date(2000, Number(m) - 1, 1).toLocaleString('id-ID', { month: 'long' }).toUpperCase()
}

const fmtQty = (n) => Number(n || 0).toLocaleString('id-ID')

const generateReport = async () => {
  if (!filter.value.month) return toast.error('Bulan wajib dipilih')
  if (!filter.value.year) return toast.error('Tahun wajib dipilih')

  loading.value = true
  try {
    const r = await api.get('/reports/material-issues/monthly', { params: filter.value })
    reportData.value = r.data.data
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal generate laporan')
  } finally {
    loading.value = false
  }
}

const printReport = () => {
  const q = new URLSearchParams()
  q.set('month', filter.value.month)
  q.set('year', filter.value.year)
  window.open(`/print/material-issues-monthly?${q.toString()}`, '_blank')
}
</script>

<style scoped>
.report-page {
  width: 100%;
  margin: 0 auto;
}

.report-canvas {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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

.info-label {
  width: 80px;
  color: #64748b;
}

.info-colon {
  width: 20px;
}

.info-value {
  color: #0f172a;
}

.report-table-wrapper {
  overflow-x: auto;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.report-table th,
.report-table td {
  border: 1px solid #e2e8f0;
  padding: 10px 12px;
}

.report-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
}

.text-right {
  text-align: right;
}

.fw-600 {
  font-weight: 600;
}

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

@media print {
  .no-print { display: none !important; }
  .report-canvas { box-shadow: none; padding: 0; }
  .report-page { max-width: 100%; margin: 0; padding: 0; }
  body { background: white; }
  .sidebar, .top-navbar { display: none !important; }
  .main-content { margin: 0 !important; padding: 0 !important; }
}
</style>
