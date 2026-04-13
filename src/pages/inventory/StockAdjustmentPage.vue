<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Penyesuaian Stok</div>
        <div class="page-subtitle">Catat stok fisik dan sesuaikan kuantitas persediaan</div>
      </div>
      <button class="btn btn-primary" v-if="auth.can('stock-adjustment.create')" @click="openCreate">+ Tambah Penyesuaian</button>
    </div>

    <div class="card">
      <div class="card-header">
        <input class="form-control" type="date" v-model="dateDari" @change="fetchItems" style="width:150px" />
        <input class="form-control" type="date" v-model="dateSampai" @change="fetchItems" style="width:150px" />
      </div>
      <div class="table-wrapper"><table>
        <thead><tr><th>#</th><th>Tanggal</th><th>Item</th><th>Dibuat Oleh</th><th>Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 5" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon">📦</div><h3>Tidak ada data penyesuaian stok</h3><button class="btn btn-primary" v-if="auth.can('stock-adjustment.create')" @click="openCreate">Tambah Penyesuaian</button></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id" @click="openDetail(item)" style="cursor:pointer">
            <td class="fw-600">#{{ item.id }}</td>
            <td>{{ item.date }}</td>
            <td>{{ item.details?.length || 0 }} item</td>
            <td>{{ item.creator?.name }}</td>
            <td @click.stop><div class="action-btns">
              <button class="btn btn-sm btn-secondary" @click="openDetail(item)">👁 Detail</button>
              <button class="btn btn-sm btn-danger" v-if="auth.can('stock-adjustment.create')" @click="confirmDelete(item)">🗑</button>
            </div></td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination"><span class="pagination-info">Total: {{ total }}</span><button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button><button class="page-btn" v-for="p in Math.ceil(total/15)||1" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button><button class="page-btn" :disabled="page>=Math.ceil(total/15)" @click="changePage(page+1)">›</button></div>
    </div>

    <!-- Create Modal -->
    <BaseModal v-if="showForm" title="Tambah Penyesuaian Stok" size="xl" @close="showForm=false">
      <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="date" v-model="form.date" required /></div>
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><label class="form-label" style="margin:0">Item</label><button type="button" class="btn btn-sm btn-secondary" @click="addRow">+ Tambah Baris</button></div>
        <table class="detail-table"><thead><tr><th>Jenis</th><th>Item</th><th>Qty System</th><th>Qty Real</th><th>Difference</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(d,i) in form.details" :key="i">
              <td><select class="form-control" v-model="d.item_type" @change="d.item_id=''"><option value="RAW">Bahan Baku</option><option value="PRODUCT">Produk</option></select></td>
              <td><select class="form-control" v-model="d.item_id">
                <option value="">-- Pilih --</option>
                <template v-if="d.item_type==='RAW'"><option v-for="r in rawMaterials" :key="r.id" :value="r.id">{{ r.name }} (stock: {{ r.stock }})</option></template>
                <template v-else><option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (stock: {{ p.stock }})</option></template>
              </select></td>
              <td><input class="form-control" type="number" v-model="d.qty_system" min="0" step="0.01" /></td>
              <td><input class="form-control" type="number" v-model="d.qty_real" min="0" step="0.01" /></td>
              <td class="fw-600" :style="diff(d) < 0 ? 'color:#e74c3c' : diff(d) > 0 ? 'color:#27ae60' : ''">{{ diff(d) >= 0 ? '+' : '' }}{{ diff(d) }}</td>
              <td><button type="button" class="btn btn-sm btn-danger" @click="removeRow(i)">✕</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Simpan</span></button></template>
    </BaseModal>

    <!-- Detail Modal -->
    <BaseModal v-if="showDetail && selectedItem" :title="`Adjustment #${selectedItem.id} — ${selectedItem.date}`" size="lg" @close="showDetail=false">
      <div class="detail-info-grid" style="margin-bottom:16px">
        <div class="detail-info-item"><label>Tanggal</label><p>{{ selectedItem.date }}</p></div>
        <div class="detail-info-item"><label>Dibuat Oleh</label><p>{{ selectedItem.creator?.name }}</p></div>
        <div class="detail-info-item"><label>Total Item</label><p>{{ selectedItem.details?.length }}</p></div>
      </div>
      <table class="detail-table"><thead><tr><th>Jenis</th><th>Item</th><th>Qty System</th><th>Qty Real</th><th>Difference</th></tr></thead>
        <tbody>
          <tr v-for="d in selectedItem.details" :key="d.id">
            <td><span class="badge" :class="d.item_type==='RAW'?'badge-info':'badge-success'">{{ d.item_type }}</span></td>
            <td class="fw-600">{{ d.item_name }}</td>
            <td>{{ d.qty_system }}</td>
            <td>{{ d.qty_real }}</td>
            <td class="fw-600" :style="Number(d.difference) < 0 ? 'color:#e74c3c' : Number(d.difference) > 0 ? 'color:#27ae60' : ''">
              {{ Number(d.difference) >= 0 ? '+' : '' }}{{ d.difference }}
            </td>
          </tr>
        </tbody>
      </table>
    </BaseModal>

    <!-- Delete Confirm -->
    <BaseModal v-if="showDelete && deleteTarget" title="Konfirmasi Hapus" @close="showDelete=false">
      <p>Apakah Anda yakin ingin menghapus penyesuaian <strong>#{{ deleteTarget.id }}</strong> tanggal <strong>{{ deleteTarget.date }}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
      <template #footer><button class="btn btn-secondary" @click="showDelete=false">Batal</button><button class="btn btn-danger" :disabled="deleting" @click="doDelete"><span v-if="deleting" class="spinner"></span><span v-else>Hapus</span></button></template>
    </BaseModal>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'; import api from '@/services/api'
const auth=useAuthStore();const toast=useToastStore()
const items=ref([]);const total=ref(0);const page=ref(1);const dateDari=ref('');const dateSampai=ref('')
const loading=ref(false);const showForm=ref(false);const saving=ref(false)
const showDetail=ref(false);const selectedItem=ref(null)
const showDelete=ref(false);const deleteTarget=ref(null);const deleting=ref(false)
const rawMaterials=ref([]);const products=ref([])
const form=ref({date:'',details:[{item_type:'RAW',item_id:'',qty_system:0,qty_real:0}]})
const diff=d=>Number(d.qty_real||0)-Number(d.qty_system||0)
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/inventory/adjustments',{params:{page:page.value,limit:15,date_from:dateDari.value,date_to:dateSampai.value}});items.value=r.data.data.data;total.value=r.data.data.total}catch(e){toast.error('Gagal memuat data penyesuaian')}finally{loading.value=false}}
const changePage=p=>{page.value=p;fetchItems()}
const openCreate=()=>{form.value={date:new Date().toISOString().split('T')[0],details:[{item_type:'RAW',item_id:'',qty_system:0,qty_real:0}]};showForm.value=true}
const addRow=()=>form.value.details.push({item_type:'RAW',item_id:'',qty_system:0,qty_real:0})
const removeRow=i=>form.value.details.splice(i,1)
const save=async()=>{if(!form.value.details.length){toast.error('Tambahkan minimal satu item');return}saving.value=true;try{await api.post('/inventory/adjustments',form.value);toast.success('Penyesuaian stok berhasil disimpan. Stok diperbarui!');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Gagal menyimpan data')}finally{saving.value=false}}
const openDetail=async item=>{try{const r=await api.get(`/inventory/adjustments/${item.id}`);selectedItem.value=r.data.data;showDetail.value=true}catch(e){toast.error('Gagal memuat detail data')}}
const confirmDelete=item=>{deleteTarget.value=item;showDelete.value=true}
const doDelete=async()=>{deleting.value=true;try{await api.delete(`/inventory/adjustments/${deleteTarget.value.id}`);toast.success('Data berhasil dihapus');showDelete.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{deleting.value=false}}
onMounted(async()=>{const[rm,p]=await Promise.all([api.get('/master/raw-materials',{params:{limit:500}}),api.get('/master/products',{params:{limit:500}})]);rawMaterials.value=rm.data.data?.data||[];products.value=p.data.data?.data||[];fetchItems()})
</script>
