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

    <BaseModal v-if="showForm" :title="editing ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'" size="lg" @close="showForm = false">
      <div class="form-group"><label class="form-label required">Nama</label><input class="form-control" v-model="form.name" required /></div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label required">Base Unit</label><UnitSearchSelect v-model="form.base_unit_id" /></div>
        <div class="form-group"><label class="form-label">Min Stock</label><input class="form-control" type="number" v-model="form.min_stock" /></div>
      </div>

      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label class="form-label" style="margin:0">Konversi Satuan</label>
          <button type="button" class="btn btn-sm btn-secondary" @click="addConversion">+ Tambah Konversi</button>
        </div>
        <table class="detail-table" style="table-layout:fixed;width:100%">
          <thead><tr><th style="width:45%">Satuan</th><th style="width:25%">Nilai Konversi</th><th style="width:18%">Base</th><th style="width:48px"></th></tr></thead>
          <tbody>
            <tr v-for="(c,i) in form.conversions" :key="i">
              <td><UnitSearchSelect v-model="c.unit_id" /></td>
              <td><input class="form-control" type="number" min="0.01" step="0.01" v-model="c.conversion_qty" :disabled="Number(c.unit_id)===Number(form.base_unit_id)" /></td>
              <td class="text-center"><input type="radio" :checked="Number(c.unit_id)===Number(form.base_unit_id)" disabled /></td>
              <td><button type="button" class="btn btn-sm btn-danger" @click="removeConversion(i)">✕</button></td>
            </tr>
          </tbody>
        </table>
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
import { ref, onMounted, computed, watch } from 'vue'
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
const form = ref({ name: '', base_unit_id: '', min_stock: 0, conversions: [] })
const showDeleteConfirm = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1)

let debounceTimer
const debouncedFetch = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => { page.value = 1; fetchItems() }, 300) }

watch(() => form.value.base_unit_id, (baseUnitId) => {
  if (!baseUnitId) return
  const idx = form.value.conversions.findIndex(c => Number(c.unit_id) === Number(baseUnitId))
  if (idx < 0) form.value.conversions.unshift({ unit_id: baseUnitId, conversion_qty: 1, is_base: true })
  form.value.conversions = form.value.conversions.map(c => ({
    ...c,
    is_base: Number(c.unit_id) === Number(baseUnitId),
    conversion_qty: Number(c.unit_id) === Number(baseUnitId) ? 1 : Number(c.conversion_qty || 0),
  }))
})

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

const openCreate = () => { editing.value = null; form.value = { name: '', base_unit_id: '', min_stock: 0, conversions: [] }; showForm.value = true }
const openEdit = async (item) => {
  editing.value = item
  form.value = { name: item.name, base_unit_id: item.base_unit_id || item.unit_id || '', min_stock: item.min_stock, conversions: [] }
  try {
    const r = await api.get('/master/item-unit-conversions', { params: { item_type: 'RAW_MATERIAL', item_id: item.id } })
    form.value.conversions = (r.data.data || []).map(c => ({ unit_id: c.unit_id, conversion_qty: Number(c.conversion_qty), is_base: !!c.is_base }))
  } catch {}
  showForm.value = true
}
const openDelete = (item) => { deleteTarget.value = item; showDeleteConfirm.value = true }

const addConversion = () => form.value.conversions.push({ unit_id: '', conversion_qty: 1, is_base: false })
const removeConversion = (idx) => form.value.conversions.splice(idx, 1)

const validate = () => {
  if (!form.value.name?.trim()) return 'Nama wajib diisi.'
  if (!form.value.base_unit_id) return 'Base unit wajib diisi.'
  const rows = form.value.conversions.filter(c => c.unit_id)
  if (!rows.length) return 'Minimal 1 konversi satuan wajib diisi.'
  const seen = new Set()
  for (const c of rows) {
    const key = Number(c.unit_id)
    if (seen.has(key)) return 'Duplikasi satuan tidak diperbolehkan.'
    seen.add(key)
    if (Number(c.unit_id) !== Number(form.value.base_unit_id) && !(Number(c.conversion_qty) > 0)) return 'conversion_qty harus > 0.'
  }
  return ''
}

const save = async () => {
  const err = validate(); if (err) return toast.error(err)
  saving.value = true
  try {
    const conversions = form.value.conversions
      .filter(c => c.unit_id)
      .map(c => ({
        unit_id: Number(c.unit_id),
        conversion_qty: Number(c.unit_id) === Number(form.value.base_unit_id) ? 1 : Number(c.conversion_qty),
        is_base: Number(c.unit_id) === Number(form.value.base_unit_id),
      }))

    const payload = {
      name: form.value.name,
      base_unit_id: Number(form.value.base_unit_id),
      min_stock: Number(form.value.min_stock || 0),
      conversions,
    }

    if (editing.value) await api.put(`/master/raw-materials/${editing.value.id}`, payload)
    else await api.post('/master/raw-materials', payload)
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
