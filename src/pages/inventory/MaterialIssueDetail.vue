<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Detail Bukti Pengeluaran Gudang</div>
        <div class="page-subtitle">{{ item?.issue_number || '-' }}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" @click="goBack">Back</button>
        <button class="btn btn-secondary" v-if="item?.status === 'DRAFT' && auth.can('material-issue.create')" @click="goEdit">Edit</button>
        <button class="btn btn-primary" v-if="item?.status === 'DRAFT' && auth.can('material-issue.approve')" :disabled="actionLoading" @click="openAction('approve')">Setujui</button>
        <button class="btn btn-secondary" v-if="item?.status !== 'APPROVED' && item?.status !== 'CANCELLED' && auth.can('material-issue.approve')" :disabled="actionLoading" @click="openAction('cancel')">Batal</button>
      </div>
    </div>

    <div class="card" v-if="loading">
      <div class="empty-state"><div class="empty-state-icon">⏳</div><h3>Memuat...</h3></div>
    </div>

    <div class="card" v-else-if="!item">
      <div class="empty-state"><div class="empty-state-icon">❌</div><h3>Data not found</h3></div>
    </div>

    <div class="card" v-else>
      <div class="detail-info-grid" style="margin-bottom:16px">
        <div class="detail-info-item"><label>Nomor Bukti</label><p class="fw-700">{{ item.issue_number }}</p></div>
        <div class="detail-info-item"><label>Status</label><p><span class="badge" :class="statusClass(item.status)">{{ item.status }}</span></p></div>
        <div class="detail-info-item"><label>Tanggal</label><p>{{ fmtDate(item.date) }}</p></div>
        <div class="detail-info-item"><label>Bagian</label><p>{{ item.department }}</p></div>
        <div class="detail-info-item"><label>Penerima</label><p>{{ item.recipientEmployee?.name || '-' }}</p></div>
        <div class="detail-info-item"><label>Jabatan</label><p>{{ item.recipientEmployee?.position?.name || '-' }}</p></div>
        <div class="detail-info-item"><label>Dibuat Oleh</label><p>{{ item.creator?.name || '-' }}</p></div>
        <div class="detail-info-item"><label>Disetujui By</label><p>{{ item.approver?.name || '-' }}</p></div>
        <div class="detail-info-item"><label>Disetujui At</label><p>{{ fmtDate(item.approved_at) }}</p></div>
        <div class="detail-info-item"><label>Keterangan</label><p>{{ item.description || '-' }}</p></div>
      </div>

      <table class="detail-table">
        <thead>
          <tr>
            <th>Bahan Baku</th>
            <th>Satuan</th>
            <th>Qty</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in item.details" :key="d.id">
            <td>{{ d.rawMaterial?.name || d.raw_material_id }}</td>
            <td>{{ d.unit?.name || d.unit_id }}</td>
            <td>{{ d.qty }}</td>
            <td>{{ d.note || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog
      v-if="showConfirm"
      :loading="actionLoading"
      :message="confirmMessage"
      @confirm="handleAction"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const item = ref(null)
const loading = ref(false)

const showConfirm = ref(false)
const actionLoading = ref(false)
const actionType = ref('')

const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID')
}

const statusClass = (s) => ({ DRAFT: 'badge-info', APPROVED: 'badge-success', CANCELLED: 'badge-danger' }[s] || 'badge-gray')

const confirmMessage = computed(() => actionType.value === 'approve'
  ? 'Setujui dokumen ini? Stok bahan baku akan berkurang.'
  : 'Batalkan dokumen ini?')

const fetchDetail = async () => {
  loading.value = true
  try {
    const r = await api.get(`/material-issues/${route.params.id}`)
    item.value = r.data.data
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data detail')
    item.value = null
  } finally {
    loading.value = false
  }
}

const goBack = () => router.push('/inventory/material-issues')
const goEdit = () => router.push(`/inventory/material-issues/${route.params.id}/edit`)

const openAction = (type) => {
  actionType.value = type
  showConfirm.value = true
}

const handleAction = async () => {
  actionLoading.value = true
  try {
    if (actionType.value === 'approve') {
      await api.post(`/material-issues/${route.params.id}/approve`)
      toast.success('Disetujui')
    }
    if (actionType.value === 'cancel') {
      await api.post(`/material-issues/${route.params.id}/cancel`)
      toast.success('Cancelled')
    }
    showConfirm.value = false
    fetchDetail()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Aksi gagal')
  } finally {
    actionLoading.value = false
  }
}

onMounted(fetchDetail)
</script>
