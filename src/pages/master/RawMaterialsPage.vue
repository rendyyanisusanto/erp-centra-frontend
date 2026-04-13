<template>
  <div>
    <div class="page-header">
      <div><div class="page-title">Raw Materials</div><div class="page-subtitle">Manage raw material inventory</div></div>
      <button class="btn btn-primary" v-if="auth.can('raw-material.create')" @click="openCreate">+ Tambah Bahan Baku</button>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-control" v-model="search" placeholder="Cari..." @input="debouncedFetch" />
        </div>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>#</th><th>Nama</th><th>Satuan</th><th>Stock</th><th>Min Stock</th><th v-if="auth.can('raw-material.create')">Aksi</th></tr></thead>
          <tbody>
            <template v-if="loading">
              <tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 5" :key="j"><div class="skeleton-cell"></div></td></tr>
            </template>
            <template v-else-if="items.length === 0">
              <tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">🌾</div><h3>No raw materials found</h3><p>Start by adding a new raw material.</p></div></td></tr>
            </template>
            <tr v-else v-for="(item, i) in items" :key="item.id">
              <td class="text-muted">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="fw-600">{{ item.name }}</td>
              <td>{{ item.unit?.name || '-' }}</td>
              <td :class="Number(item.stock) < Number(item.min_stock) ? 'text-danger fw-600' : ''">{{ item.stock }}</td>
              <td>{{ item.min_stock }}</td>
              <td v-if="auth.can('raw-material.create')">
                <div class="action-btns">
                  <button class="btn btn-sm btn-secondary" @click="openEdit(item)">✏️ Edit</button>
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

    <BaseModal v-if="showForm" :title="editing ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'" @close="showForm = false">
      <div class="form-group"><label class="form-label required">Nama</label><input class="form-control" v-model="form.name" required /></div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Satuan</label>
          <UnitSearchSelect v-model="form.unit_id" />
        </div>
        <div class="form-group"><label class="form-label">Min Stock</label><input class="form-control" type="number" v-model="form.min_stock" /></div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showForm = false">Batal</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          <span v-if="saving" class="spinner"></span><span v-else>Simpan</span>
        </button>
      </template>
    </BaseModal>

    <ConfirmDialog v-if="showDeleteConfirm" :loading="deleting" @confirm="doDelete" @cancel="showDeleteConfirm = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseModal from '@/components/BaseModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import UnitSearchSelect from '@/components/UnitSearchSelect.vue'
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
const saving = ref(false)
const editing = ref(null)
const form = ref({ name: '', unit_id: '', min_stock: 0 })
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1)

let debounceTimer
const debouncedFetch = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { page.value = 1; fetchItems() }, 300) }

const fetchItems = async () => {
  loading.value = true
  try {
    const res = await api.get('/master/raw-materials', { params: { page: page.value, limit: limit.value, search: search.value } })
    items.value = res.data.data.data
    total.value = res.data.data.total
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal memuat data') }
  finally { loading.value = false }
}

const changePage = (p) => { page.value = p; fetchItems() }

const openCreate = () => { editing.value = null; form.value = { name: '', unit_id: '', min_stock: 0 }; showForm.value = true }
const openEdit = (item) => { editing.value = item; form.value = { name: item.name, unit_id: item.unit_id || '', min_stock: item.min_stock }; showForm.value = true }
const openDelete = (item) => { deleteTarget.value = item; showDeleteConfirm.value = true }

const save = async () => {
  saving.value = true
  try {
    if (editing.value) await api.put(`/master/raw-materials/${editing.value.id}`, form.value)
    else await api.post('/master/raw-materials', form.value)
    toast.success('Data berhasil disimpan')
    showForm.value = false
    fetchItems()
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal menyimpan data') }
  finally { saving.value = false }
}

const doDelete = async () => {
  deleting.value = true
  try {
    await api.delete(`/master/raw-materials/${deleteTarget.value.id}`)
    toast.success('Data berhasil dihapus')
    showDeleteConfirm.value = false
    fetchItems()
  } catch (e) { toast.error(e.response?.data?.message || 'Gagal menghapus data') }
  finally { deleting.value = false }
}

onMounted(() => {
  fetchItems()
})
</script>
