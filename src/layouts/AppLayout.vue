<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <h2>Centra ERP</h2>
        <p>PT. Centra Agro Pratama</p>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-section-title">Utama</div>
          <router-link to="/dashboard" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </router-link>
        </div>

        <div class="nav-section" v-if="can('raw-material.read') || can('product.read') || can('supplier.read') || can('customer.read') || can('salesman.read') || can('position.read') || can('employee.read') || can('unit.read') || can('coa.read') || can('role.read') || can('user.read')">
          <div class="nav-section-title">Master Data</div>
          <router-link v-if="can('raw-material.read')" to="/master/raw-materials" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            Bahan Baku
          </router-link>
          <router-link v-if="can('product.read')" to="/master/products" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.91 8.84L8.56 2.23a1.93 1.93 0 00-1.12 0L3.1 4.13a2 2 0 00-1.1 1.76v8.21a2 2 0 001.1 1.76l4.42 2.45"/><path d="M12 22V12"/><path d="M22 12l-10 5.5L2 12"/><path d="M22 8l-10 5.5L2 8"/></svg>
            Produk
          </router-link>
          <router-link v-if="can('supplier.read')" to="/master/suppliers" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
            Supplier
          </router-link>
          <router-link v-if="can('customer.read')" to="/master/customers" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            Pelanggan
          </router-link>
          <router-link v-if="can('salesman.read')" to="/master/salesmen" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>
            Sales
          </router-link>
          <router-link v-if="can('position.read')" to="/master/positions" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9h8"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>
            Jabatan
          </router-link>
          <router-link v-if="can('employee.read')" to="/master/employees" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M17 11h6"/></svg>
            Karyawan
          </router-link>
          <router-link v-if="can('unit.read')" to="/master/units" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            Satuan
          </router-link>
          <router-link v-if="can('coa.read')" to="/master/coa" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            Daftar Akun
          </router-link>
          <router-link v-if="can('role.read')" to="/master/roles" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Peran
          </router-link>
          <router-link v-if="can('user.read')" to="/master/users" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Pengguna
          </router-link>
        </div>

        <div class="nav-section" v-if="can('purchase.read')">
          <div class="nav-section-title">Pembelian</div>
          <router-link to="/purchase/requests" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            Permintaan Pembelian
          </router-link>
          <router-link to="/purchase/orders" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.99-1.78l1.54-8.22H6"/></svg>
            Pembelian
          </router-link>
          <router-link v-if="can('goods-receipt.read')" to="/purchase/goods-receipts" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>
            Penerimaan Barang
          </router-link>
          <router-link v-if="can('purchase-payment.read')" to="/purchase/payments" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Pembayaran Pembelian
          </router-link>
        </div>

        <div class="nav-section" v-if="can('sales.read')">
          <div class="nav-section-title">Penjualan</div>
          <router-link to="/sales" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            Penjualan
          </router-link>
          <router-link to="/sales/payments" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            Pembayaran Penjualan
          </router-link>
        </div>

        <div class="nav-section" v-if="can('journal.read')">
          <div class="nav-section-title">Keuangan</div>
          <router-link to="/finance/cash" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M12 12a3 3 0 100-6 3 3 0 000 6z"/><path d="M2 10h20M2 14h20"/></svg>
            Transaksi Kas
          </router-link>
          <router-link to="/finance/journals" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="9" x2="15" y2="9"/><line x1="8" y1="13" x2="15" y2="13"/></svg>
            Jurnal
          </router-link>
        </div>

        <div class="nav-section" v-if="can('stock-adjustment.read') || can('stock-movement.read') || can('material-issue.read')">
          <div class="nav-section-title">Gudang</div>
          <router-link v-if="can('stock-adjustment.read')" to="/inventory/adjustments" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/><rect x="2" y="17" width="20" height="5" rx="1"/><line x1="6" y1="5.5" x2="6.01" y2="5.5"/><line x1="6" y1="12.5" x2="6.01" y2="12.5"/><line x1="6" y1="19.5" x2="6.01" y2="19.5"/></svg>
            Penyesuaian Stok
          </router-link>
          <router-link v-if="can('stock-movement.read')" to="/inventory/stock-movements" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            Mutasi Stok
          </router-link>
          <router-link v-if="can('material-issue.read')" to="/inventory/material-issues" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
            Pengeluaran Bahan Baku
          </router-link>
        </div>

        <div class="nav-section" v-if="can('production-plan.read') || can('production-realization.read') || can('finished-goods-receipt.read')">
          <div class="nav-section-title">Produksi</div>
          <router-link v-if="can('production-plan.read')" to="/inventory/production-plans" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
            Rencana Produksi
          </router-link>
          <router-link v-if="can('production-realization.read')" to="/inventory/production-realizations" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>
            Realisasi Produksi
          </router-link>
          <router-link v-if="can('finished-goods-receipt.read')" to="/inventory/finished-goods-receipts" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3h18v7H3z"/><path d="M5 10v11h14V10"/><path d="M9 14h6"/></svg>
            Penerimaan Barang Jadi
          </router-link>
        </div>

        <div class="nav-section" v-if="can('report.profit-loss') || can('report.payables') || can('report.receivables') || can('report.ledger') || can('report.raw-material-stock-card') || can('report.stock-opname') || can('report.purchase-order-recap') || can('report.supplier-payable-statement') || can('report.stock-opname-product') || can('report.fg-monthly-stock') || can('report.material-issues') || can('report.production')">
          <div class="nav-section-title">Laporan</div>
          <router-link v-if="can('report.profit-loss')" to="/reports/profit-loss" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            Laporan Laba Rugi
          </router-link>
          <router-link v-if="can('report.payables')" to="/reports/payables" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>
            Laporan Hutang
          </router-link>
          <router-link v-if="can('report.receivables')" to="/reports/receivables" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
            Laporan Piutang
          </router-link>
          <router-link v-if="can('report.ledger')" to="/reports/ledger" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Buku Besar
          </router-link>
          <router-link v-if="can('report.raw-material-stock-card')" to="/reports/raw-material-stock-card" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Kartu Stok Bahan Baku
          </router-link>
          <router-link v-if="can('report.stock-opname')" to="/reports/stock-opname" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Laporan Stok Opname
          </router-link>
          <router-link v-if="can('report.stock-opname-product')" to="/reports/stock-opname-product" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/><rect x="2" y="17" width="20" height="5" rx="1"/><line x1="6" y1="5.5" x2="6.01" y2="5.5"/><line x1="6" y1="12.5" x2="6.01" y2="12.5"/><line x1="6" y1="19.5" x2="6.01" y2="19.5"/></svg>
            Laporan Stok Opname Barang Jadi
          </router-link>
          <router-link v-if="can('report.fg-monthly-stock')" to="/reports/fg-monthly-stock" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-5"/></svg>
            Laporan Stok Bulanan Barang Jadi
          </router-link>
          <router-link v-if="can('report.material-issues')" to="/reports/material-issues" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
            Laporan Pengeluaran BB
          </router-link>
          <router-link v-if="can('report.production')" to="/reports/production" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 2 4-5"/></svg>
            Laporan Produksi
          </router-link>
          <router-link v-if="can('report.purchase-order-recap')" to="/reports/purchase-order-recap" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Laporan Rekap Pembelian
          </router-link>
          <router-link v-if="can('report.supplier-payable-statement')" to="/reports/supplier-payable-statement" class="nav-item" active-class="active">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Kartu Hutang Supplier
          </router-link>
        </div>
      </nav>

      <!-- Bottom user card -->
      <div class="sidebar-user-card">
        <div class="sidebar-user-info">
          <div class="sidebar-user-avatar">{{ userInitials }}</div>
          <div class="sidebar-user-text">
            <div class="sidebar-user-name">{{ auth.user?.name }}</div>
            <div class="sidebar-user-role">{{ auth.user?.role }}</div>
          </div>
        </div>
        <button class="sidebar-logout-btn" @click="handleLogout">Logout</button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="main-container">
      <header class="topbar">
        <span class="topbar-title">{{ pageTitle }}</span>
      </header>
      <main class="page-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_TITLE_MAP } from '@/constants/ui-labels'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const can = (perm) => auth.can(perm)
const userInitials = computed(() => auth.user?.name?.substring(0, 2).toUpperCase() || 'U')
const pageTitle = computed(() => ROUTE_TITLE_MAP[route.name] || route.name || 'Dashboard')

async function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>
