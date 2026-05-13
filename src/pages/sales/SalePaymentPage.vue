<template>
  <div>
    <div class="page-header"><div><div class="page-title">Pembayaran Penjualan</div></div><button class="btn btn-primary" v-if="auth.can('sales.create')" @click="openCreate">+ Catat Pembayaran</button></div>
    <div class="card">
      <div class="table-wrapper"><table>
        <thead><tr><th>No Pembayaran</th><th>Pelanggan</th><th>Status</th><th>Tanggal</th><th>Total Pembayaran</th><th>Akun</th><th>Aksi</th></tr></thead>
        <tbody>
          <template v-if="loading"><tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 7" :key="j"><div class="skeleton-cell"></div></td></tr></template>
          <template v-else-if="items.length===0"><tr><td colspan="7"><div class="empty-state"><h3>Tidak ada data pembayaran</h3></div></td></tr></template>
          <tr v-else v-for="item in items" :key="item.id">
            <td class="fw-600">{{ item.payment_number || ('SP-' + String(item.id).padStart(6, '0')) }}</td>
            <td>{{ item.customer?.name }}</td>
            <td><StatusBadge :status="item.status" /></td>
            <td>{{ fmtDate(item.date) }}</td>
            <td class="fw-600">{{ fmt(item.total_amount) }}</td>
            <td>{{ item.account?.name }}</td>
            <td class="action-btns">
              <button class="btn btn-sm btn-secondary" @click="openPrint(item.id)">Cetak</button>
              <button class="btn btn-sm btn-secondary" v-if="item.status==='DRAFT'" @click="openEdit(item)">Ubah</button>
              <button class="btn btn-sm btn-danger" v-if="item.status==='DRAFT'" @click="removeItem(item)">Hapus</button>
              <button class="btn btn-sm btn-primary" v-if="item.status==='DRAFT'" @click="approveItem(item)">Setujui</button>
              <button class="btn btn-sm btn-secondary" v-if="item.status==='APPROVED'" @click="cancelItem(item)">Batalkan</button>
            </td>
          </tr>
        </tbody>
      </table></div>
    </div>

    <BaseModal v-if="showForm" :title="isEdit ? 'Ubah Pembayaran Penjualan' : 'Catat Pembayaran Penjualan'" size="xl" @close="showForm=false">
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Pelanggan</label><CustomerSearchSelect v-model="form.customer_id" /></div>
        <div class="form-group"><label class="form-label required">Tanggal</label><input class="form-control" type="date" v-model="form.date" /></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Akun Penerimaan (Kas/Bank)</label><COASearchSelect v-model="form.account_id" type="ASSET" /></div>
        <div class="form-group"><label class="form-label">Catatan</label><input class="form-control" v-model="form.note" /></div>
      </div>

      <div class="card" style="padding:12px">
        <div class="fw-600" style="margin-bottom:8px">Daftar Invoice Belum Lunas</div>
        <div v-if="loadingOutstanding" class="text-muted">Memuat data outstanding...</div>
        <div v-else-if="!form.customer_id" class="text-muted">Pilih pelanggan terlebih dahulu.</div>
        <div v-else-if="outstanding.length===0" class="text-muted">Tidak ada piutang outstanding untuk pelanggan ini.</div>
        <div v-else class="table-wrapper"><table>
          <thead><tr><th>No</th><th>Invoice</th><th>Tanggal</th><th>Total Penjualan</th><th>Sudah Dibayar</th><th>Sisa Piutang</th><th>Dibayar Sekarang</th></tr></thead>
          <tbody>
            <tr v-for="(row, idx) in outstanding" :key="row.sale_id">
              <td>{{ idx + 1 }}</td>
              <td>{{ row.sale_number || ('SO-' + String(row.sale_id).padStart(6, '0')) }}</td>
              <td>{{ fmtDate(row.date) }}</td>
              <td>{{ fmt(row.total_amount) }}</td>
              <td>{{ fmt(row.total_paid) }}</td>
              <td>{{ fmt(row.remaining_amount) }}</td>
              <td><input class="form-control" type="number" min="0" :max="row.remaining_amount" step="0.01" v-model.number="row.amount_paid" @input="onAmountInput(row)" /></td>
            </tr>
          </tbody>
        </table></div>
      </div>

      <div class="text-right fw-700" style="margin-top:10px">Total Pembayaran: {{ fmt(totalAllocated) }}</div>
      <template #footer><button class="btn btn-secondary" @click="showForm=false">Batal</button><button class="btn btn-primary" :disabled="saving" @click="save"><span v-if="saving" class="spinner"></span><span v-else>Simpan</span></button></template>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'
import CustomerSearchSelect from '@/components/CustomerSearchSelect.vue'
import COASearchSelect from '@/components/COASearchSelect.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import api from '@/services/api'

const auth = useAuthStore(); const toast = useToastStore()
const items = ref([]); const loading = ref(false)
const showForm = ref(false); const saving = ref(false)
const loadingOutstanding = ref(false); const outstanding = ref([])
const isEdit = ref(false); const editId = ref(null)
const form = ref({ customer_id: '', date: '', account_id: '', note: '' })

const fmt = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')
const fmtDate = d => d ? new Date(d).toLocaleDateString('id-ID') : '-'
const totalAllocated = computed(() => outstanding.value.reduce((s, r) => s + Number(r.amount_paid || 0), 0))

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/sales/payments', { params: { page: 1, limit: 100 } })
    items.value = r.data.data.data || []
  } catch { toast.error('Terjadi kesalahan') } finally { loading.value = false }
}

const fetchOutstanding = async (customerId) => {
  if (!customerId) return
  loadingOutstanding.value = true
  try {
    const r = await api.get(`/sales/payments/customer/${customerId}/outstanding`)
    const mapEdit = new Map(outstanding.value.map(x => [x.sale_id, Number(x.amount_paid || 0)]))
    outstanding.value = (r.data.data || []).map(x => ({ ...x, amount_paid: mapEdit.get(x.sale_id) || 0 }))
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal memuat outstanding') } finally { loadingOutstanding.value = false }
}

watch(() => form.value.customer_id, async (customerId, oldCustomerId) => {
  if (!customerId) {
    outstanding.value = []
    return
  }
  if (customerId !== oldCustomerId) await fetchOutstanding(customerId)
})

const onAmountInput = (row) => {
  const max = Number(row.remaining_amount || 0)
  if (Number(row.amount_paid || 0) > max) {
    row.amount_paid = max
    toast.error('Jumlah dibayar tidak boleh melebihi sisa piutang.')
  }
  if (Number(row.amount_paid || 0) < 0) row.amount_paid = 0
}

const buildPayload = () => {
  const details = outstanding.value.filter(r => Number(r.amount_paid || 0) > 0).map(r => ({ sale_id: r.sale_id, amount_paid: Number(r.amount_paid) }))
  return {
    customer_id: form.value.customer_id,
    date: form.value.date,
    account_id: form.value.account_id,
    note: form.value.note,
    total_amount: Number(totalAllocated.value || 0),
    details,
  }
}

const openCreate = () => {
  isEdit.value = false; editId.value = null
  form.value = { customer_id: '', date: new Date().toISOString().split('T')[0], account_id: '', note: '' }
  outstanding.value = []
  showForm.value = true
}

const openEdit = async (item) => {
  try {
    const r = await api.get(`/sales/payments/${item.id}`)
    const data = r.data.data
    isEdit.value = true
    editId.value = item.id
    form.value = { customer_id: data.customer_id, date: data.date, account_id: data.account_id, note: data.note || '' }
    showForm.value = true
    await fetchOutstanding(data.customer_id)
    const alloc = new Map((data.details || []).map(d => [d.sale_id, Number(d.amount_paid || 0)]))
    outstanding.value = outstanding.value.map(o => ({ ...o, amount_paid: alloc.get(o.sale_id) || 0 }))
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal memuat detail pembayaran') }
}

const removeItem = async (item) => {
  if (!confirm('Hapus pembayaran ini?')) return
  try {
    await api.delete(`/sales/payments/${item.id}`)
    toast.success('Pembayaran berhasil dihapus')
    fetchItems()
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal menghapus data') }
}

const approveItem = async (item) => {
  if (!confirm('Setujui pembayaran ini?')) return
  try {
    await api.post(`/sales/payments/${item.id}/approve`)
    toast.success('Pembayaran disetujui')
    fetchItems()
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal menyetujui pembayaran') }
}

const cancelItem = async (item) => {
  const cancel_reason = prompt('Alasan pembatalan:')
  if (cancel_reason === null) return
  try {
    await api.post(`/sales/payments/${item.id}/cancel`, { cancel_reason })
    toast.success('Pembayaran dibatalkan')
    fetchItems()
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal membatalkan pembayaran') }
}

const openPrint = (id) => window.open(`/print/sales-payment/${id}`, '_blank')

const save = async () => {
  const payload = buildPayload()
  if (!payload.details.length) return toast.error('Total alokasi pembayaran tidak boleh kosong.')
  if (Number(payload.total_amount) <= 0) return toast.error('Total pembayaran harus lebih besar dari 0.')
  saving.value = true
  try {
    if (isEdit.value) await api.put(`/sales/payments/${editId.value}`, payload)
    else await api.post('/sales/payments', payload)
    toast.success('Pembayaran berhasil disimpan')
    showForm.value = false
    fetchItems()
  } catch (e) { toast.error(e.response?.data?.message || 'Terjadi kesalahan') } finally { saving.value = false }
}

onMounted(fetchItems)
</script>
