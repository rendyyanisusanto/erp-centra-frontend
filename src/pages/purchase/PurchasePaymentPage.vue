<template>
  <div>
    <div class="page-header">
      <div><div class="page-title">Pembayaran Pembelian</div></div>
      <button class="btn btn-primary" v-if="auth.can('purchase-payment.create')" @click="openCreate">+ Catat Pembayaran</button>
    </div>

    <div class="card">
      <div class="table-wrapper"><table>
        <thead><tr><th>No Pembayaran</th><th>Supplier</th><th>Status</th><th>Tanggal</th><th>Total Pembayaran</th><th>Akun</th><th>Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 7" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="7"><div class="empty-state"><h3>Tidak ada data pembayaran</h3></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id">
            <td class="fw-600">{{ item.payment_number || ('PP-' + String(item.id).padStart(6, '0')) }}</td>
            <td>{{ item.supplier?.name }}</td>
            <td><StatusBadge :status="item.status" /></td>
            <td>{{ fmtDate(item.date) }}</td>
            <td class="fw-600">{{ fmt(item.total_amount) }}</td>
            <td>{{ item.account?.name }}</td>
            <td class="action-btns">
              <button class="btn btn-sm btn-secondary" @click="openDetail(item)">Detail</button>
              <button class="btn btn-sm btn-secondary" v-if="item.status==='DRAFT'" @click="openEdit(item)">Ubah</button>
              <button class="btn btn-sm btn-danger" v-if="item.status==='DRAFT'" @click="removeItem(item)">Hapus</button>
              <button class="btn btn-sm btn-primary" v-if="item.status==='DRAFT'" @click="approveItem(item)">Setujui</button>
              <button class="btn btn-sm btn-secondary" v-if="item.status==='APPROVED'" @click="cancelItem(item)">Batalkan</button>
            </td>
          </tr>
        </tbody>
      </table></div>
    </div>

    <BaseModal v-if="showForm" :title="isEdit ? 'Ubah Pembayaran Pembelian' : 'Catat Pembayaran Pembelian'" size="xl" @close="showForm=false">
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Supplier</label><SupplierSearchSelect v-model="form.supplier_id" /></div>
        <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="date" v-model="form.date" /></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Akun Pembayaran (Kas/Bank)</label><COASearchSelect v-model="form.account_id" type="ASSET" /></div>
        <div class="form-group"><label class="form-label">Catatan</label><input class="form-control" v-model="form.note" /></div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label required">Mode Alokasi</label>
          <select class="form-control" v-model="form.allocation_mode">
            <option value="AUTO_FIFO">Otomatis FIFO</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label required">Total Pembayaran</label><input class="form-control" type="number" min="0" step="0.01" v-model.number="form.total_amount" /></div>
      </div>

      <div class="detail-info-grid" v-if="form.supplier_id" style="margin: 0 0 12px 0;">
        <div class="detail-info-item"><label>Total Hutang</label><p class="fw-700">{{ fmt(summary.total_hutang) }}</p></div>
        <div class="detail-info-item"><label>PO Belum Lunas</label><p class="fw-700">{{ summary.jumlah_po }}</p></div>
        <div class="detail-info-item"><label>PO Tertua</label><p class="fw-700">{{ summary.po_tertua }}</p></div>
        <div class="detail-info-item"><label>Estimasi Alokasi</label><p class="fw-700">{{ fmt(estimatedAllocated) }}</p></div>
      </div>

      <div class="card" style="padding:12px">
        <div class="fw-600" style="margin-bottom:8px">Daftar PO Belum Lunas</div>
        <div v-if="loadingOutstanding" class="text-muted">Memuat data outstanding...</div>
        <div v-else-if="!form.supplier_id" class="text-muted">Pilih supplier terlebih dahulu.</div>
        <div v-else-if="outstanding.length===0" class="text-muted">Tidak ada tagihan outstanding untuk supplier ini.</div>

        <div v-else-if="form.allocation_mode==='AUTO_FIFO'" class="table-wrapper"><table>
          <thead><tr><th>No</th><th>PO</th><th>Tanggal</th><th>Sisa Hutang</th><th>Alokasi FIFO</th></tr></thead>
          <tbody>
            <tr v-for="(row, idx) in fifoPreview" :key="row.purchase_id">
              <td>{{ idx + 1 }}</td>
              <td>{{ row.purchase_number || ('PO-' + String(row.purchase_id).padStart(6, '0')) }}</td>
              <td>{{ fmtDate(row.date) }}</td>
              <td>{{ fmt(row.remaining_amount) }}</td>
              <td>{{ fmt(row.amount_paid) }}</td>
            </tr>
          </tbody>
        </table></div>

        <div v-else class="table-wrapper"><table>
          <thead><tr><th>No</th><th>PO</th><th>Tanggal</th><th>Total PO</th><th>Sudah Dibayar</th><th>Sisa Hutang</th><th>Dibayar Sekarang</th></tr></thead>
          <tbody>
            <tr v-for="(row, idx) in outstanding" :key="row.purchase_id">
              <td>{{ idx + 1 }}</td>
              <td>{{ row.purchase_number || ('PO-' + String(row.purchase_id).padStart(6, '0')) }}</td>
              <td>{{ fmtDate(row.date) }}</td>
              <td>{{ fmt(row.total_amount) }}</td>
              <td>{{ fmt(row.total_paid) }}</td>
              <td>{{ fmt(row.remaining_amount) }}</td>
              <td><input class="form-control" type="number" min="0" :max="row.remaining_amount" step="0.01" v-model.number="row.amount_paid" @input="onAmountInput(row)" /></td>
            </tr>
          </tbody>
        </table></div>
      </div>

      <div class="text-right fw-700" style="margin-top:10px">Total Alokasi: {{ fmt(estimatedAllocated) }}</div>
      <template #footer>
        <button class="btn btn-secondary" @click="showForm=false">Batal</button>
        <button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Simpan</span></button>
      </template>
    </BaseModal>

    <BaseModal v-if="showDetail && detailItem" :title="`Detail Pembayaran ${detailItem.payment_number || ('PP-' + String(detailItem.id).padStart(6, '0'))}`" size="lg" @close="showDetail=false">
      <div class="detail-info-grid" style="margin-bottom:16px">
        <div class="detail-info-item"><label>Supplier</label><p>{{ detailItem.supplier?.name || '-' }}</p></div>
        <div class="detail-info-item"><label>Status</label><p><StatusBadge :status="detailItem.status" /></p></div>
        <div class="detail-info-item"><label>Tanggal</label><p>{{ fmtDate(detailItem.date) }}</p></div>
        <div class="detail-info-item"><label>Akun</label><p>{{ detailItem.account?.name || '-' }}</p></div>
        <div class="detail-info-item"><label>Total Pembayaran</label><p class="fw-700">{{ fmt(detailItem.total_amount) }}</p></div>
        <div class="detail-info-item"><label>Catatan</label><p>{{ detailItem.note || '-' }}</p></div>
      </div>

      <div class="fw-600" style="margin-bottom:8px">Detail Alokasi per PO</div>
      <table class="detail-table">
        <thead>
          <tr><th>PO</th><th>Tanggal PO</th><th>Total PO</th><th>Nominal Dibayar</th><th>Status PO Setelah Pembayaran</th></tr>
        </thead>
        <tbody>
          <tr v-if="!(detailItem.details||[]).length"><td colspan="5" class="text-center text-muted">Tidak ada alokasi pembayaran</td></tr>
          <tr v-for="d in detailItem.details||[]" :key="d.id">
            <td>{{ d.purchase ? ('PO-' + String(d.purchase.id).padStart(6, '0')) : ('PO-' + String(d.purchase_id).padStart(6, '0')) }}</td>
            <td>{{ fmtDate(d.purchase?.date) }}</td>
            <td>{{ fmt(d.purchase?.total_amount) }}</td>
            <td>{{ fmt(d.amount_paid) }}</td>
            <td><StatusBadge :status="d.purchase?.payment_status || '-' " /></td>
          </tr>
        </tbody>
      </table>
      <template #footer>
        <button class="btn btn-secondary" @click="showDetail=false">Tutup</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import SupplierSearchSelect from '@/components/SupplierSearchSelect.vue'
import COASearchSelect from '@/components/COASearchSelect.vue'
import api from '@/services/api'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const items = ref([])
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const loadingOutstanding = ref(false)
const outstanding = ref([])
const isEdit = ref(false)
const editId = ref(null)
const showDetail = ref(false)
const detailItem = ref(null)
const form = ref({ supplier_id: '', date: '', account_id: '', note: '', total_amount: 0, allocation_mode: 'AUTO_FIFO' })

const fmt = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const fmtDate = d => d ? new Date(d).toLocaleDateString('id-ID') : '-'
const totalAllocatedManual = computed(() => outstanding.value.reduce((s, r) => s + Number(r.amount_paid || 0), 0))

const fifoPreview = computed(() => {
  let remaining = Number(form.value.total_amount || 0)
  if (!(remaining > 0)) return outstanding.value.map(r => ({ ...r, amount_paid: 0 }))
  return outstanding.value.map(r => {
    const alloc = Math.max(Math.min(remaining, Number(r.remaining_amount || 0)), 0)
    remaining = remaining - alloc
    return { ...r, amount_paid: alloc }
  })
})

const estimatedAllocated = computed(() => {
  if (form.value.allocation_mode === 'AUTO_FIFO') return fifoPreview.value.reduce((s, r) => s + Number(r.amount_paid || 0), 0)
  return totalAllocatedManual.value
})

const summary = computed(() => {
  const totalHutang = outstanding.value.reduce((s, r) => s + Number(r.remaining_amount || 0), 0)
  return {
    total_hutang: totalHutang,
    jumlah_po: outstanding.value.length,
    po_tertua: outstanding.value[0]?.purchase_number || '-',
  }
})

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/purchase/payments/list', { params: { page: 1, limit: 100 } })
    items.value = r.data.data.data || []
  } catch (e) { toast.error('Terjadi kesalahan') } finally { loading.value = false }
}

const fetchOutstanding = async (supplierId) => {
  if (!supplierId) return
  loadingOutstanding.value = true
  try {
    const r = await api.get(`/purchase/payments/supplier/${supplierId}/outstanding`)
    const mapEdit = new Map(outstanding.value.map(x => [x.purchase_id, Number(x.amount_paid || 0)]))
    outstanding.value = (r.data.data || []).map(x => ({ ...x, amount_paid: mapEdit.get(x.purchase_id) || 0 }))
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal memuat outstanding') } finally { loadingOutstanding.value = false }
}

watch(() => form.value.supplier_id, async (supplierId, oldSupplierId) => {
  if (!supplierId) {
    outstanding.value = []
    return
  }
  if (supplierId !== oldSupplierId) await fetchOutstanding(supplierId)
})

const onAmountInput = (row) => {
  const max = Number(row.remaining_amount || 0)
  if (Number(row.amount_paid || 0) > max) {
    row.amount_paid = max
    toast.error('Jumlah dibayar tidak boleh melebihi sisa hutang.')
  }
  if (Number(row.amount_paid || 0) < 0) row.amount_paid = 0
}

const buildPayload = () => {
  const mode = form.value.allocation_mode || 'AUTO_FIFO'
  if (mode === 'AUTO_FIFO') {
    return {
      supplier_id: form.value.supplier_id,
      date: form.value.date,
      account_id: form.value.account_id,
      note: form.value.note,
      total_amount: Number(form.value.total_amount || 0),
      allocation_mode: mode,
    }
  }
  const details = outstanding.value
    .filter(r => Number(r.amount_paid || 0) > 0)
    .map(r => ({ purchase_id: r.purchase_id, amount_paid: Number(r.amount_paid) }))
  return {
    supplier_id: form.value.supplier_id,
    date: form.value.date,
    account_id: form.value.account_id,
    note: form.value.note,
    total_amount: Number(form.value.total_amount || 0),
    allocation_mode: mode,
    details,
  }
}

const openCreate = () => {
  isEdit.value = false
  editId.value = null
  form.value = { supplier_id: '', date: new Date().toISOString().split('T')[0], account_id: '', note: '', total_amount: 0, allocation_mode: 'AUTO_FIFO' }
  outstanding.value = []
  showForm.value = true
}

const openCreateFromPO = async (purchaseId, supplierId) => {
  openCreate()
  form.value.allocation_mode = 'MANUAL'
  if (supplierId) form.value.supplier_id = Number(supplierId)
  await fetchOutstanding(form.value.supplier_id)
  outstanding.value = outstanding.value.map(o => ({ ...o, amount_paid: Number(o.purchase_id) === Number(purchaseId) ? Number(o.remaining_amount || 0) : 0 }))
  form.value.total_amount = Number(outstanding.value.find(o => Number(o.purchase_id) === Number(purchaseId))?.remaining_amount || 0)
}

const openEdit = async (item) => {
  try {
    const r = await api.get(`/purchase/payments/${item.id}`)
    const data = r.data.data
    isEdit.value = true
    editId.value = item.id
    form.value = { supplier_id: data.supplier_id, date: data.date, account_id: data.account_id, note: data.note || '', total_amount: Number(data.total_amount || 0), allocation_mode: 'MANUAL' }
    showForm.value = true
    await fetchOutstanding(data.supplier_id)
    const alloc = new Map((data.details || []).map(d => [d.purchase_id, Number(d.amount_paid || 0)]))
    outstanding.value = outstanding.value.map(o => ({ ...o, amount_paid: alloc.get(o.purchase_id) || 0 }))
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal memuat detail pembayaran') }
}

const openDetail = async (item) => {
  try {
    const r = await api.get(`/purchase/payments/${item.id}`)
    detailItem.value = r.data.data
    showDetail.value = true
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat detail pembayaran')
  }
}

const removeItem = async (item) => {
  if (!confirm('Hapus pembayaran ini?')) return
  try {
    await api.delete(`/purchase/payments/${item.id}`)
    toast.success('Pembayaran berhasil dihapus')
    fetchItems()
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal menghapus data') }
}

const approveItem = async (item) => {
  if (!confirm('Setujui pembayaran ini?')) return
  try {
    await api.post(`/purchase/payments/${item.id}/approve`)
    toast.success('Pembayaran disetujui')
    fetchItems()
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal menyetujui pembayaran') }
}

const cancelItem = async (item) => {
  const cancel_reason = prompt('Alasan pembatalan:')
  if (cancel_reason === null) return
  try {
    await api.post(`/purchase/payments/${item.id}/cancel`, { cancel_reason })
    toast.success('Pembayaran dibatalkan')
    fetchItems()
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal membatalkan pembayaran') }
}

const save = async () => {
  const payload = buildPayload()
  if (!payload.supplier_id) return toast.error('Supplier wajib dipilih.')
  if (!(Number(payload.total_amount) > 0)) return toast.error('Total pembayaran harus lebih besar dari 0.')
  if (Number(payload.total_amount) > Number(summary.value.total_hutang || 0)) return toast.error('Total pembayaran melebihi total hutang supplier.')
  if (payload.allocation_mode === 'MANUAL') {
    if (!payload.details?.length) return toast.error('Alokasi manual minimal 1 baris.')
    const sumManual = Number(totalAllocatedManual.value || 0)
    if (Number(payload.total_amount) !== Number(sumManual)) return toast.error('Total pembayaran harus sama dengan total alokasi manual.')
  }
  saving.value = true
  try {
    if (isEdit.value) await api.put(`/purchase/payments/${editId.value}`, payload)
    else await api.post('/purchase/payments', payload)
    toast.success('Pembayaran berhasil disimpan')
    showForm.value = false
    fetchItems()
  } catch (e) { toast.error(e.response?.data?.message || 'Terjadi kesalahan') } finally { saving.value = false }
}

onMounted(async () => {
  await fetchItems()
  const purchaseId = Number(route.query.purchase_id || 0)
  const supplierId = Number(route.query.supplier_id || 0)
  if (purchaseId && supplierId && auth.can('purchase-payment.create')) {
    await openCreateFromPO(purchaseId, supplierId)
  }
})
</script>
