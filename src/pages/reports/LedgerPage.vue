<template>
  <div>
    <div class="page-header"><div><div class="page-title">General Ledger</div><div class="page-subtitle">Akun-based ledger with running balance</div></div></div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="margin:0"><label class="form-label">Akun</label>
          <select class="form-control" v-model="accountId" style="min-width:220px"><option value="">-- Select Akun --</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} - {{ a.name }}</option></select>
        </div>
        <div class="form-group" style="margin:0"><label class="form-label">Dari</label><input class="form-control" type="date" v-model="dateDari" /></div>
        <div class="form-group" style="margin:0"><label class="form-label">Sampai</label><input class="form-control" type="date" v-model="dateSampai" /></div>
        <button class="btn btn-primary" :disabled="loading||!accountId" @click="fetchReport"><span v-if="loading" class="spinner"></span><span v-else>Buat Laporan</span></button>
      </div>
    </div>
    <div class="card" v-if="report">
      <div class="card-header"><span class="fw-600">{{ report.account?.code }} - {{ report.account?.name }}</span><span class="badge badge-info">{{ report.account?.type }}</span></div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Tanggal</th><th>Keterangan</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Balance</th></tr></thead>
        <tbody>
          <template v-if="!report.ledger?.length"><tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📋</div><h3>No transactions</h3></div></td></tr></template>
          <tr v-else v-for="(r,i) in report.ledger" :key="i">
            <td>{{ r.date }}</td><td>{{ r.description }}</td>
            <td class="text-right">{{ r.debit>0?fmt(r.debit):'' }}</td>
            <td class="text-right">{{ r.credit>0?fmt(r.credit):'' }}</td>
            <td class="text-right fw-600" :class="r.balance>=0?'text-success':'text-danger'">{{ fmt(Math.abs(r.balance)) }}</td>
          </tr>
        </tbody>
      </table></div>
    </div>
    <div class="empty-state" v-else-if="!loading"><div class="empty-state-icon">📋</div><h3>Select an account and date range</h3></div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'; import api from '@/services/api'
const toast=useToastStore()
const accountId=ref('');const dateDari=ref('');const dateSampai=ref('');const report=ref(null);const loading=ref(false);const accounts=ref([])
const fmt=n=>'Rp '+Number(n||0).toLocaleString('id-ID')
const fetchReport=async()=>{if(!accountId.value)return;loading.value=true;try{const r=await api.get('/reports/ledger',{params:{account_id:accountId.value,date_from:dateDari.value,date_to:dateSampai.value}});report.value=r.data.data}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{loading.value=false}}
onMounted(async()=>{const a=await api.get('/master/coa',{params:{limit:200}});accounts.value=a.data.data?.data||[]})
</script>
