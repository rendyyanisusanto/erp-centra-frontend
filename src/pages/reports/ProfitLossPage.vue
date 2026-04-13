<template>
  <div>
    <div class="page-header"><div><div class="page-title">Laporan Laba Rugi</div><div class="page-subtitle">Dihitung dari entri jurnal</div></div></div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="margin:0"><label class="form-label">Dari</label><input class="form-control" type="date" v-model="dateDari" /></div>
        <div class="form-group" style="margin:0"><label class="form-label">Sampai</label><input class="form-control" type="date" v-model="dateSampai" /></div>
        <button class="btn btn-primary" :disabled="loading" @click="fetchReport"><span v-if="loading" class="spinner"></span><span v-else>Buat Laporan</span></button>
      </div>
    </div>
    <div class="card" v-if="report">
      <div class="card-header"><span class="fw-600">Laporan Laba Rugi</span><span class="text-muted">{{ report.period?.from }} s.d. {{ report.period?.to }}</span></div>
      <div class="card-body">
        <table style="width:100%;border-collapse:collapse">
          <tr style="border-bottom:1px solid var(--color-border)"><td style="padding:10px">Total Pendapatan</td><td class="text-right fw-600 text-success" style="padding:10px">{{ fmt(report.total_revenue) }}</td></tr>
          <tr style="border-bottom:1px solid var(--color-border)"><td style="padding:10px">Total Biaya</td><td class="text-right fw-600 text-danger" style="padding:10px">{{ fmt(report.total_expenses) }}</td></tr>
          <tr style="background:var(--color-bg)"><td style="padding:12px;font-weight:700;font-size:16px">LABA BERSIH</td><td :class="report.net_profit>=0?'text-success':'text-danger'" style="padding:12px;text-align:right;font-weight:700;font-size:16px">{{ fmt(report.net_profit) }}</td></tr>
        </table>
      </div>
    </div>
    <div class="empty-state" v-else-if="!loading"><div class="empty-state-icon">📈</div><h3>Pilih rentang tanggal lalu klik Buat Laporan</h3></div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useToastStore } from '@/stores/toast'; import api from '@/services/api'
const toast=useToastStore()
const now=new Date();const y=now.getFullYear();const m=String(now.getMonth()+1).padStart(2,'0')
const dateDari=ref(`${y}-${m}-01`);const dateSampai=ref(`${y}-${m}-31`);const report=ref(null);const loading=ref(false)
const fmt=n=>'Rp '+Number(n||0).toLocaleString('id-ID')
const fetchReport=async()=>{loading.value=true;try{const r=await api.get('/reports/profit-loss',{params:{date_from:dateDari.value,date_to:dateSampai.value}});report.value=r.data.data}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{loading.value=false}}
</script>
