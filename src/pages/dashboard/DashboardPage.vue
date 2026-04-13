<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">Selamat datang kembali, {{ auth.user?.name }}</div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">{{ fmt(stats.totalSales) }}</div>
        <div class="stat-label">Total Penjualan (Bulan Ini)</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon warning">🛒</div>
        <div class="stat-value">{{ fmt(stats.totalPurchases) }}</div>
        <div class="stat-label">Total Pembelian (Bulan Ini)</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-icon danger">🔴</div>
        <div class="stat-value">{{ fmt(stats.outstandingPayables) }}</div>
        <div class="stat-label">Sisa Hutang</div>
      </div>
      <div class="stat-card info">
        <div class="stat-icon info">🟢</div>
        <div class="stat-value">{{ fmt(stats.outstandingReceivables) }}</div>
        <div class="stat-label">Sisa Piutang</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-value">{{ fmt(stats.netProfit) }}</div>
        <div class="stat-label">Laba Bersih (Bulan Ini)</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="fw-600">Aksi Cepat</span></div>
      <div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap">
        <router-link to="/purchase/orders" class="btn btn-primary" v-if="auth.can('purchase.create')">🛒 Tambah Pembelian</router-link>
        <router-link to="/sales" class="btn btn-primary" v-if="auth.can('sales.create')">💰 Tambah Penjualan</router-link>
        <router-link to="/finance/cash" class="btn btn-secondary" v-if="auth.can('journal.read')">🏦 Transaksi Kas</router-link>
        <router-link to="/finance/journals" class="btn btn-secondary" v-if="auth.can('journal.read')">📔 Jurnal</router-link>
        <router-link to="/reports/profit-loss" class="btn btn-secondary" v-if="auth.can('report.profit-loss')">📈 Laporan Laba Rugi</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const auth = useAuthStore()
const stats = ref({ totalSales: 0, totalPurchases: 0, outstandingPayables: 0, outstandingReceivables: 0, netProfit: 0 })

const fmt = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

const now = new Date()
const dateDari = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
const dateSampai = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

onMounted(async () => {
  try {
    if (auth.can('report.profit-loss') && auth.can('report.payables') && auth.can('report.receivables')) {
      const [pl, pay, rec] = await Promise.all([
        api.get('/reports/profit-loss', { params: { date_from: dateDari, date_to: dateSampai } }),
        api.get('/reports/payables'),
        api.get('/reports/receivables'),
      ])
      stats.value.netProfit = pl.data.data?.net_profit || 0
      stats.value.totalSales = pl.data.data?.total_revenue || 0
      stats.value.outstandingPayables = pay.data.data?.reduce((s, r) => s + Number(r.remaining), 0) || 0
      stats.value.outstandingReceivables = rec.data.data?.reduce((s, r) => s + Number(r.remaining), 0) || 0
    }
  } catch {}
})
</script>
