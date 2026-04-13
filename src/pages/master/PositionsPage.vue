<template>
  <div>
    <div class="page-header">
      <div><div class="page-title">Positions</div></div>
      <button class="btn btn-primary" v-if="auth.can('position.create')" @click="openCreate">+ Tambah Jabatan</button>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-control" v-model="search" placeholder="Cari berdasarkan kode atau nama..." @input="debouncedFetch" />
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Kode</th>
              <th>Nama Jabatan</th>
              <th>Deskripsi</th>
              <th>Data berhasil ditambahkan At</th>
              <th v-if="auth.can('position.create')">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 6" :key="j"><div class="skeleton-cell"></div></td></tr>
            </template>
            <template v-else-if="items.length === 0">
              <tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🧾</div><h3>No positions found</h3></div></td></tr>
            </template>
            <tr v-else v-for="(item, i) in items" :key="item.id">
              <td class="text-muted">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="fw-600">{{ item.code }}</td>
              <td class="fw-600">{{ item.name }}</td>
              <td class="text-muted">{{ item.description || '-' }}</td>
              <td>{{ fmtDate(item.created_at) }}</td>
              <td v-if="auth.can('position.create')">
                <div class="action-btns">
                  <button class="btn btn-sm btn-secondary" @click="openEdit(item)">✏️</button>
                  <button class="btn btn-sm btn-danger" @click="openDelete(item)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <span class="pagination-info">Total: {{ total }}</span>
        <button class="page-btn" :disabled="page <= 1" @click="changePage(page - 1)">‹</button>
        <button class="page-btn" v-for="p in totalPages" :key="p" :class="{ active: p === page }" @click="changePage(p)">{{ p }}</button>
        <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">›</button>
      </div>
    </div>

    <BaseModal v-if="showForm" :title="editing ? 'Edit Jabatan' : 'Tambah Jabatan'" @close="showForm = false">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label required">Kode</label>
          <input class="form-control" v-model="form.code" required />
        </div>
        <div class="form-group">
          <label class="form-label required">Nama</label>
          <input class="form-control" v-model="form.name" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Keterangan</label>
        <textarea class="form-control" v-model="form.description"></textarea>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showForm = false">Batal</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          <span v-if="saving" class="spinner"></span>
          <span v-else>Simpan</span>
        </button>
      </template>
    </BaseModal>

    <ConfirmDialog v-if="showDeleteConfirm" :loading="deleting" @confirm="doDelete" @cancel="showDeleteConfirm = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import api from '@/services/api'

const auth = useAuthStore()
const toast = useToastStore()

const items = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(15)
const search = ref('')
const loading = ref(false)

const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const form = ref({ code: '', name: '', description: '' })

const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1)

let timer
const debouncedFetch = () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    fetchItems()
  }, 300)
}

const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID')
}

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/master/positions', { params: { page: page.value, limit: limit.value, search: search.value } })
    items.value = r.data.data?.data || []
    total.value = r.data.data?.total || 0
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data jabatan')
  } finally {
    loading.value = false
  }
}

const changePage = (p) => {
  page.value = p
  fetchItems()
}

const openCreate = () => {
  editing.value = null
  form.value = { code: '', name: '', description: '' }
  showForm.value = true
}

const openEdit = (item) => {
  editing.value = item
  form.value = { code: item.code || '', name: item.name || '', description: item.description || '' }
  showForm.value = true
}

const openDelete = (item) => {
  deleteTarget.value = item
  showDeleteConfirm.value = true
}

const save = async () => {
  if (!form.value.code?.trim()) return toast.error('Kode wajib diisi')
  if (!form.value.name?.trim()) return toast.error('Nama wajib diisi')

  saving.value = true
  try {
    const payload = {
      code: form.value.code.trim(),
      name: form.value.name.trim(),
      description: form.value.description || null,
    }

    if (editing.value) await api.put(`/master/positions/${editing.value.id}`, payload)
    else await api.post('/master/positions', payload)

    toast.success('Data berhasil disimpan')
    showForm.value = false
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan data jabatan')
  } finally {
    saving.value = false
  }
}

const doDelete = async () => {
  deleting.value = true
  try {
    await api.delete(`/master/positions/${deleteTarget.value.id}`)
    toast.success('Data berhasil dihapus')
    showDeleteConfirm.value = false
    fetchItems()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal menghapus data jabatan')
  } finally {
    deleting.value = false
  }
}

onMounted(fetchItems)
</script>
