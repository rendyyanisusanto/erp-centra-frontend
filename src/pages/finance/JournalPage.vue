<template>
  <div>
    <div class="page-header"><div><div class="page-title">Jurnal</div><div class="page-subtitle">Jurnal manual double-entry (Debit harus sama dengan Kredit)</div></div><button class="btn btn-primary" v-if="auth.can('journal.create')" @click="openCreate">+ Tambah Jurnal</button></div>
    <div class="card">
      <div class="card-header"><input class="form-control" type="date" v-model="dateDari" @change="fetchItems" style="width:150px" /><input class="form-control" type="date" v-model="dateSampai" @change="fetchItems" style="width:150px" /></div>
      <div class="table-wrapper"><table>
        <thead><tr><th>Tanggal</th><th>Keterangan</th><th>Jenis</th><th>Entri</th><th>Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 5" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📔</div><h3>No journal entries</h3></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id">
            <td>{{ item.date }}</td><td>{{ item.description }}</td><td><span class="badge badge-gray">{{ item.reference_type }}</span></td>
            <td>{{ item.details?.length }} entries</td>
            <td><button class="btn btn-sm btn-secondary" @click="openDetail(item)">👁 Detail</button></td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>

    <!-- Create Journal -->
    <BaseModal v-if="showForm" title="Tambah Jurnal Manual" size="xl" @close="showForm=false">
      <div class="grid-2"><div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="date" v-model="form.date" required /></div></div>
      <div class="form-group"><label class="form-label">Keterangan</label><input class="form-control" v-model="form.description" /></div>
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label class="form-label" style="margin:0">Baris Jurnal</label>
          <button type="button" class="btn btn-sm btn-secondary" @click="addLine">+ Add Line</button>
        </div>
        <table class="detail-table"><thead><tr><th>Akun</th><th>Debit (Rp)</th><th>Credit (Rp)</th><th></th></tr></thead>
          <tbody><tr v-for="(d,i) in form.details" :key="i">
            <td><select class="form-control" v-model="d.account_id"><option value="">-- Akun --</option><option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} - {{ a.name }}</option></select></td>
            <td><input class="form-control" type="number" v-model="d.debit" min="0" @input="d.credit=0" /></td>
            <td><input class="form-control" type="number" v-model="d.credit" min="0" @input="d.debit=0" /></td>
            <td><button type="button" class="btn btn-sm btn-danger" @click="removeLine(i)">✕</button></td>
          </tr></tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;gap:24px;margin-top:12px;padding:12px;background:var(--color-bg);border-radius:var(--radius)">
          <span>Total Debit: <strong :class="balanced?'text-success':'text-danger'">{{ fmt(totalDebit) }}</strong></span>
          <span>Total Kredit: <strong :class="balanced?'text-success':'text-danger'">{{ fmt(totalCredit) }}</strong></span>
          <span v-if="!balanced" class="text-danger">⚠ Not balanced!</span>
          <span v-else class="text-success">✓ Seimbang</span>
        </div>
      </div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving||!balanced" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Posting Jurnal</span></button></template>
    </BaseModal>

    <!-- Detail Modal -->
    <BaseModal v-if="showDetail && selectedItem" :title="`Journal #${selectedItem.id}`" size="lg" @close="showDetail=false">
      <div class="detail-info-grid" style="margin-bottom:16px">
        <div class="detail-info-item"><label>Tanggal</label><p>{{ selectedItem.date }}</p></div>
        <div class="detail-info-item"><label>Keterangan</label><p>{{ selectedItem.description }}</p></div>
        <div class="detail-info-item"><label>Jenis</label><p>{{ selectedItem.reference_type }}</p></div>
        <div class="detail-info-item"><label>Dibuat Oleh</label><p>{{ selectedItem.creator?.name }}</p></div>
      </div>
      <table class="detail-table"><thead><tr><th>Akun</th><th class="text-right">Debit</th><th class="text-right">Credit</th></tr></thead>
        <tbody>
          <tr v-for="d in selectedItem.details" :key="d.id">
            <td>{{ d.account?.code }} - {{ d.account?.name }}</td>
            <td class="text-right fw-600">{{ d.debit>0?fmt(d.debit):'-' }}</td>
            <td class="text-right fw-600">{{ d.credit>0?fmt(d.credit):'-' }}</td>
          </tr>
          <tr style="background:var(--color-bg);font-weight:700">
            <td>TOTAL</td><td class="text-right">{{ fmt(selectedItem.details?.reduce((s,d)=>s+Number(d.debit),0)) }}</td><td class="text-right">{{ fmt(selectedItem.details?.reduce((s,d)=>s+Number(d.credit),0)) }}</td>
          </tr>
        </tbody>
      </table>
    </BaseModal>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'; import api from '@/services/api'
const auth=useAuthStore()
const toast=useToastStore()
const items=ref([]);const total=ref(0);const page=ref(1);const dateDari=ref('');const dateSampai=ref('')
const loading=ref(false);const showForm=ref(false);const saving=ref(false);const showDetail=ref(false);const selectedItem=ref(null)
const accounts=ref([])
const form=ref({date:'',description:'',details:[{account_id:'',debit:0,credit:0},{account_id:'',debit:0,credit:0}]})
const totalDebit=computed(()=>form.value.details.reduce((s,d)=>s+Number(d.debit||0),0))
const totalCredit=computed(()=>form.value.details.reduce((s,d)=>s+Number(d.credit||0),0))
const balanced=computed(()=>totalDebit.value>0&&Math.abs(totalDebit.value-totalCredit.value)<0.01)
const fmt=n=>'Rp '+Number(n||0).toLocaleString('id-ID')
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/finance/journals',{params:{page:page.value,limit:15,date_from:dateDari.value,date_to:dateSampai.value}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}
const openCreate=()=>{form.value={date:new Date().toISOString().split('T')[0],description:'',details:[{account_id:'',debit:0,credit:0},{account_id:'',debit:0,credit:0}]};showForm.value=true}
const openDetail=async item=>{try{const r=await api.get(`/finance/journals/${item.id}`);selectedItem.value=r.data.data;showDetail.value=true}catch(e){toast.error('Terjadi kesalahan')}}
const addLine=()=>form.value.details.push({account_id:'',debit:0,credit:0})
const removeLine=i=>form.value.details.splice(i,1)
const save=async()=>{if(!balanced.value)return toast.warning('Debit harus sama dengan Kredit');saving.value=true;try{await api.post('/finance/journals',form.value);toast.success('Jurnal berhasil diposting');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
onMounted(async()=>{const a=await api.get('/master/coa',{params:{limit:200}});accounts.value=a.data.data?.data||[];fetchItems()})
</script>
