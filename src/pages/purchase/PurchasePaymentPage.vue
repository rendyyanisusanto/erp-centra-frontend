<template>
  <div>
    <div class="page-header"><div><div class="page-title">Pembayaran Pembelian</div></div><button class="btn btn-primary" v-if="auth.can('purchase-payment.create')" @click="openCreate">+ Catat Pembayaran</button></div>
    <div class="card">
      <div class="table-wrapper"><table>
        <thead><tr><th>Pembelian Supplier</th><th>Status PO</th><th>Tanggal</th><th>Jumlah</th><th>Akun</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 5" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">💳</div><h3>Tidak ada data pembayaran</h3></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id">
            <td class="fw-600">{{ item.purchase?.supplier?.name }}</td>
            <td><StatusBadge :status="item.purchase?.status" /></td>
            <td>{{ item.date }}</td><td class="fw-600">{{ fmt(item.amount) }}</td><td>{{ item.account?.name }}</td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>
    <BaseModal v-if="showForm" title="Catat Pembayaran Pembelian" @close="showForm=false">
      <div class="form-group"><label class="form-label required">Pembelian</label>
        <POSearchSelect v-model="form.purchase_id" @po-selected="onPOSelected" placeholder="-- Pilih PO --" />
      </div>
      <!-- PO summary -->
      <div v-if="selectedPOInfo" class="po-info-bar" style="margin-bottom:12px">
        <span>🏭 <strong>{{ selectedPOInfo.supplier?.name }}</strong></span>
        <span>Total: <strong>{{ fmt(selectedPOInfo.total_amount) }}</strong></span>
      </div>
      <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="date" v-model="form.date" required /></div>
      <div class="form-group"><label class="form-label required">Jumlah</label><input class="form-control" type="number" v-model="form.amount" min="1" required /></div>
      <div class="form-group"><label class="form-label required">Akun Pembayaran (Kas/Bank)</label>
        <COASearchSelect v-model="form.account_id" type="ASSET" placeholder="-- Pilih Akun --" />
      </div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Simpan</span></button></template>
    </BaseModal>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'; import StatusBadge from '@/components/StatusBadge.vue'
import POSearchSelect from '@/components/POSearchSelect.vue'
import COASearchSelect from '@/components/COASearchSelect.vue'
import api from '@/services/api'
const auth=useAuthStore();const toast=useToastStore()
const items=ref([]);const total=ref(0);const page=ref(1);const loading=ref(false);const showForm=ref(false);const saving=ref(false)
const selectedPOInfo=ref(null)
const form=ref({purchase_id:'',date:'',amount:0,account_id:''})
const fmt=n=>'Rp '+Number(n||0).toLocaleString('id-ID')
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/purchase/payments/list',{params:{page:page.value,limit:15}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}
const openCreate=()=>{selectedPOInfo.value=null;form.value={purchase_id:'',date:new Date().toISOString().split('T')[0],amount:0,account_id:''};showForm.value=true}
const onPOSelected=(po)=>{selectedPOInfo.value=po;form.value.amount=Number(po.total_amount)||0}
const save=async()=>{saving.value=true;try{await api.post('/purchase/payments',form.value);toast.success('Pembayaran berhasil dicatat');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
onMounted(()=>{fetchItems()})
</script>
