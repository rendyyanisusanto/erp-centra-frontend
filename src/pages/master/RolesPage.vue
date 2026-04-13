<template>
  <div>
    <div class="page-header"><div><div class="page-title">Peran & Hak Akses</div></div><button class="btn btn-primary" v-if="auth.can('role.create')" @click="openCreate">+ Tambah Peran</button></div>
    <div class="card">
      <div class="table-wrapper"><table>
        <thead><tr><th>#</th><th>Nama Peran</th><th>Hak Akses</th><th v-if="auth.can('role.create')">Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 4" :key="i"><td v-for="j in 3" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="4"><div class="empty-state"><div class="empty-state-icon">🔐</div><h3>Tidak ada peran</h3></div></td></tr></template>
          <tr v-else v-for="(item,i) in items" :key="item.id">
            <td class="text-muted">{{ i+1 }}</td><td class="fw-600">{{ item.name }}</td>
            <td><div style="display:flex;flex-wrap:wrap;gap:4px">
              <span class="badge badge-info" v-for="p in item.permissions" :key="p.id">{{ displayPermission(p.name) }}</span>
              <span class="text-muted" v-if="!item.permissions?.length">Tidak ada hak akses</span>
            </div></td>
            <td v-if="auth.can('role.create')"><div class="action-btns"><button class="btn btn-sm btn-secondary" @click="openEdit(item)">✏️ Kelola</button><button class="btn btn-sm btn-danger" @click="openDelete(item)">🗑️</button></div></td>
          </tr>
        </tbody>
      </table></div>
    </div>
    <BaseModal v-if="showForm" :title="editing?'Edit Peran':'Tambah Peran'" size="lg" @close="showForm=false">
      <div class="form-group"><label class="form-label required">Nama Peran</label><input class="form-control" v-model="form.name" required /></div>
      <div class="form-group"><label class="form-label">Hak Akses</label>
        <div style="max-height:300px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius);padding:12px">
          <div v-for="(grp, mod) in groupedPermissions" :key="mod" style="margin-bottom:12px">
            <div class="fw-600" style="margin-bottom:6px;text-transform:capitalize;color:var(--color-primary)">{{ displayModule(mod) }}</div>
            <div v-for="p in grp" :key="p.id" style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <input type="checkbox" :value="p.id" v-model="form.permissionIds" :id="`p-${p.id}`" />
              <label :for="`p-${p.id}`" style="cursor:pointer">{{ displayPermission(p.name) }}</label>
            </div>
          </div>
        </div>
      </div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Simpan</span></button></template>
    </BaseModal>
    <ConfirmDialog v-if="showDeleteConfirm" :loading="deleting" @confirm="doDelete" @cancel="showDeleteConfirm=false" />
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'; import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'; import ConfirmDialog from '@/components/ConfirmDialog.vue'; import api from '@/services/api'
const auth=useAuthStore();const toast=useToastStore()
const items=ref([]);const allPerms=ref([]);const loading=ref(false);const showForm=ref(false);const saving=ref(false);const editing=ref(null)
const form=ref({name:'',permissionIds:[]});const showDeleteConfirm=ref(false);const deleteTarget=ref(null);const deleting=ref(false)
const groupedPermissions=computed(()=>{const g={};allPerms.value.forEach(p=>{if(!g[p.module])g[p.module]=[];g[p.module].push(p)});return g})
const moduleLabelMap={
  master:'Master Data',
  purchase:'Pembelian',
  sales:'Penjualan',
  finance:'Keuangan',
  inventory:'Gudang',
  'material-issues':'Pengeluaran Bahan Baku',
  'production-plans':'Rencana Produksi',
  'production-realizations':'Realisasi Produksi',
  'finished-goods-receipts':'Penerimaan Barang Jadi',
  reports:'Laporan',
}
const permissionLabelMap={
  'role.read':'Lihat peran',
  'role.create':'Kelola peran',
  'user.read':'Lihat pengguna',
  'user.create':'Kelola pengguna',
  'unit.read':'Lihat satuan',
  'unit.create':'Kelola satuan',
  'product.read':'Lihat produk',
  'product.create':'Kelola produk',
  'raw-material.read':'Lihat bahan baku',
  'raw-material.create':'Kelola bahan baku',
  'supplier.read':'Lihat supplier',
  'supplier.create':'Kelola supplier',
  'customer.read':'Lihat pelanggan',
  'customer.create':'Kelola pelanggan',
  'salesman.read':'Lihat sales',
  'salesman.create':'Kelola sales',
  'position.read':'Lihat jabatan',
  'position.create':'Kelola jabatan',
  'employee.read':'Lihat karyawan',
  'employee.create':'Kelola karyawan',
  'coa.read':'Lihat daftar akun',
  'coa.create':'Kelola daftar akun',
  'purchase.read':'Lihat pembelian',
  'purchase.create':'Buat pembelian',
  'purchase.approve':'Setujui pembelian',
  'goods-receipt.read':'Lihat penerimaan pembelian',
  'goods-receipt.create':'Buat penerimaan pembelian',
  'purchase-payment.read':'Lihat pembayaran pembelian',
  'purchase-payment.create':'Buat pembayaran pembelian',
  'sales.read':'Lihat penjualan',
  'sales.create':'Buat penjualan',
  'journal.read':'Lihat jurnal',
  'journal.create':'Buat jurnal',
  'stock-adjustment.read':'Lihat penyesuaian stok',
  'stock-adjustment.create':'Kelola penyesuaian stok',
  'stock-movement.read':'Lihat mutasi stok',
  'material-issue.read':'Lihat pengeluaran bahan baku',
  'material-issue.create':'Buat pengeluaran bahan baku',
  'material-issue.approve':'Setujui pengeluaran bahan baku',
  'production-plan.read':'Lihat rencana produksi',
  'production-plan.create':'Buat rencana produksi',
  'production-plan.approve':'Setujui rencana produksi',
  'production-realization.read':'Lihat realisasi produksi',
  'production-realization.update':'Ubah realisasi produksi',
  'finished-goods-receipt.read':'Lihat penerimaan barang jadi',
  'finished-goods-receipt.create':'Buat penerimaan barang jadi',
  'finished-goods-receipt.approve':'Setujui penerimaan barang jadi',
  'report.profit-loss':'Lihat laporan laba rugi',
  'report.payables':'Lihat laporan hutang',
  'report.receivables':'Lihat laporan piutang',
  'report.ledger':'Lihat buku besar',
  'report.raw-material-stock-card':'Lihat kartu stok bahan baku',
  'report.stock-opname':'Lihat laporan stok opname',
  'report.purchase-order-recap':'Lihat laporan rekap pembelian',
  'report.supplier-payable-statement':'Lihat kartu hutang supplier',
  'report.stock-opname-product':'Lihat laporan stok opname barang jadi',
  'report.fg-monthly-stock':'Lihat laporan stok bulanan barang jadi',
  'report.material-issues':'Lihat laporan pengeluaran bahan baku',
  'report.production':'Lihat laporan produksi',
}
const displayModule=(moduleName)=>moduleLabelMap[moduleName]||moduleName
const displayPermission=(permissionName)=>permissionLabelMap[permissionName]||permissionName
const fetchItems=async()=>{loading.value=true;try{const r=await api.get('/master/roles',{params:{limit:100}});items.value=r.data.data.data}catch(e){toast.error('Terjadi kesalahan')}finally{loading.value=false}}
const openCreate=()=>{editing.value=null;form.value={name:'',permissionIds:[]};showForm.value=true}
const openEdit=item=>{editing.value=item;form.value={name:item.name,permissionIds:item.permissions?.map(p=>p.id)||[]};showForm.value=true}
const openDelete=item=>{deleteTarget.value=item;showDeleteConfirm.value=true}
const save=async()=>{saving.value=true;try{if(editing.value)await api.put(`/master/roles/${editing.value.id}`,form.value);else await api.post('/master/roles',form.value);toast.success('Data berhasil disimpan');showForm.value=false;fetchItems()}catch(e){toast.error(e.response?.data?.message||'Terjadi kesalahan')}finally{saving.value=false}}
const doDelete=async()=>{deleting.value=true;try{await api.delete(`/master/roles/${deleteTarget.value.id}`);toast.success('Data berhasil dihapus');showDeleteConfirm.value=false;fetchItems()}catch(e){toast.error('Terjadi kesalahan')}finally{deleting.value=false}}
onMounted(async()=>{const p=await api.get('/master/permissions');allPerms.value=p.data.data||[];fetchItems()})
</script>
