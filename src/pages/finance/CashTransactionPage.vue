<template>
  <div>
    <div class="page-header"><div><div class="page-title">Transaksi Kas Masuk / Keluar</div><div class="page-subtitle">Catat transaksi kas dengan posting jurnal otomatis</div></div><button class="btn btn-primary" v-if="auth.can('journal.create')" @click="openCreate">+ Tambah Transaksi</button></div>
    <div class="card">
      <div class="card-header">
        <select class="form-control" style="width:140px" v-model="typeFilter" @change="fetchItems"><option value="">Semua Jenis</option><option value="IN">Kas Masuk</option><option value="OUT">Kas Keluar</option></select>
        <input class="form-control" type="date" v-model="dateDari" @change="fetchItems" style="width:150px" />
        <input class="form-control" type="date" v-model="dateSampai" @change="fetchItems" style="width:150px" />
      </div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Tanggal</th><th>Jenis</th><th>Keterangan</th><th>Jumlah</th><th>Akun Debit</th><th>Akun Kredit</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 6" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🏦</div><h3>No cash transactions</h3></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id">
            <td>{{ item.date }}</td>
            <td><span class="badge" :class="item.type==='IN'?'badge-success':'badge-danger'">{{ item.type }}</span></td>
            <td>{{ item.description }}</td><td class="fw-600">{{ fmt(item.amount) }}</td><td>{{ item.debitAkun?.name }}</td><td>{{ item.creditAkun?.name }}</td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>
    <BaseModal v-if="showForm" title="Tambah Transaksi Kas" @close="showForm=false">
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="date" v-model="form.date" required /></div>
        <div class="form-group"><label class="form-label required">Jenis</label><select class="form-control" v-model="form.type"><option value="IN">Kas Masuk</option><option value="OUT">Kas Keluar</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">Keterangan</label><textarea class="form-control" v-model="form.description"></textarea></div>
      <div class="form-group"><label class="form-label required">Jumlah</label><input class="form-control" type="number" v-model="form.amount" min="1" required /></div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Akun Debit</label><select class="form-control" v-model="form.account_debit_id" required><option value="">--</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} - {{ a.name }}</option></select></div>
        <div class="form-group"><label class="form-label required">Akun Kredit</label><select class="form-control" v-model="form.account_credit_id" required><option value="">--</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} - {{ a.name }}</option></select></div>
      </div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Simpan</span></button></template>
    </BaseModal>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'; import api from '@/services/api'
const auth=useAuthStore()
const toast=useToastStore()
const items=ref([]);const total=ref(0);const page=ref(1);const typeFilter=ref('');const dateDari=ref('');const dateSampai=ref('')
const loading=ref(false);const showForm=ref(false);const saving=ref(false);const accounts=ref([])
const form=ref({date:'',type:'IN',description:'',amount:0,account_debit_id:'',account_credit_id:''})
const fmt=n=>'Rp '+Number(n||0).toLocaleString('id-ID')
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/finance/cash',{params:{page:page.value,limit:15,type:typeFilter.value,date_from:dateDari.value,date_to:dateSampai.value}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}
const openCreate=()=>{form.value={date:new Date().toISOString().split('T')[0],type:'IN',description:'',amount:0,account_debit_id:'',account_credit_id:''};showForm.value=true}
const save=async()=>{saving.value=true;try{await api.post('/finance/cash',form.value);toast.success('Transaksi berhasil disimpan');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
onMounted(async()=>{const a=await api.get('/master/coa',{params:{limit:200}});accounts.value=a.data.data?.data||[];fetchItems()})
</script>
