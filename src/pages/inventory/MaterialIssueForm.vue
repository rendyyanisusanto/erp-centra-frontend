<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">{{ isEdit ? 'Edit Bukti Pengeluaran Gudang' : 'Buat Bukti Pengeluaran Gudang' }}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" @click="goBack">Back</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          <span v-if="saving" class="spinner"></span>
          <span v-else>{{ isEdit ? 'Update' : 'Simpan Draft' }}</span>
        </button>
      </div>
    </div>

    <div class="card" v-if="loading">
      <div class="empty-state"><div class="empty-state-icon">⏳</div><h3>Memuat...</h3></div>
    </div>

    <div class="card" v-else>
      <div class="grid-3">
        <div class="form-group">
          <label class="form-label required">Tanggal</label>
          <input class="form-control" type="datetime-local" v-model="form.date" />
        </div>
        <div class="form-group">
          <label class="form-label required">Bulan</label>
          <input class="form-control" type="number" min="1" max="12" v-model="form.month" />
        </div>
        <div class="form-group">
          <label class="form-label required">Tahun</label>
          <input class="form-control" type="number" min="1900" v-model="form.year" />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label required">Bagian</label>
          <input class="form-control" v-model="form.department" />
        </div>
        <div class="form-group">
          <label class="form-label required">Penerima</label>
          <select class="form-control" v-model="form.recipient_employee_id" @change="syncRecipientInfo">
            <option value="">-- Pilih Karyawan --</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.employee_code }} - {{ e.name }}</option>
          </select>
          <div class="text-muted" style="margin-top:6px" v-if="selectedEmployee">
            <div>Nama: <strong>{{ selectedEmployee.name }}</strong></div>
            <div>Jabatan: <strong>{{ selectedEmployee.position_name || selectedEmployee.position?.name || '-' }}</strong></div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Keterangan</label>
        <textarea class="form-control" v-model="form.description"></textarea>
      </div>

      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label class="form-label" style="margin:0">Detail Item</label>
          <button type="button" class="btn btn-sm btn-secondary" @click="addDetail">+ Tambah Item</button>
        </div>
        <table class="detail-table" style="table-layout:fixed;width:100%">
          <thead>
            <tr>
              <th style="width:30%">Bahan Baku</th>
              <th style="width:18%">Satuan</th>
              <th style="width:14%">Qty</th>
              <th>Note</th>
              <th style="width:48px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in form.details" :key="i">
              <td>
                <select class="form-control" v-model="d.raw_material_id" @change="onRawMaterialChange(d)">
                  <option value="">-- Pilih Bahan Baku --</option>
                  <option v-for="rm in rawMaterials" :key="rm.id" :value="rm.id">{{ rm.name }}</option>
                </select>
              </td>
              <td>
                <select class="form-control" v-model="d.unit_id">
                  <option value="">-- Pilih Unit --</option>
                  <option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }}</option>
                </select>
              </td>
              <td><input class="form-control" type="number" min="0.01" step="0.01" v-model="d.qty" /></td>
              <td><input class="form-control" v-model="d.note" /></td>
              <td><button type="button" class="btn btn-sm btn-danger" @click="removeDetail(i)">✕</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const isEdit = computed(() => !!route.params.id)

const loading = ref(false)
const saving = ref(false)

const employees = ref([])
const rawMaterials = ref([])
const units = ref([])

const form = ref({
  date: '',
  month: '',
  year: '',
  department: '',
  recipient_employee_id: '',
  description: '',
  details: [{ raw_material_id: '', unit_id: '', qty: 1, note: '' }],
})

const selectedEmployee = computed(() => employees.value.find(e => e.id === Number(form.value.recipient_employee_id)) || null)

const toDateTimeLocal = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const fetchMasters = async () => {
  try {
    const [empRes, rmRes, unitRes] = await Promise.all([
      api.get('/master/employees', { params: { limit: 500 } }),
      api.get('/master/raw-materials', { params: { limit: 500 } }),
      api.get('/master/units', { params: { limit: 500 } }),
    ])
    employees.value = empRes.data.data?.data || []
    rawMaterials.value = rmRes.data.data?.data || []
    units.value = unitRes.data.data?.data || []
  } catch (e) {
    toast.error('Gagal memuat data master data')
  }
}

const fetchDetail = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const r = await api.get(`/material-issues/${route.params.id}`)
    const data = r.data.data

    if (data.status !== 'DRAFT') {
      toast.error('Hanya dokumen DRAFT yang dapat diedit')
      return goBack()
    }

    form.value = {
      date: toDateTimeLocal(data.date),
      month: data.month,
      year: data.year,
      department: data.department || '',
      recipient_employee_id: data.recipient_employee_id || '',
      description: data.description || '',
      details: (data.details || []).map(d => ({
        raw_material_id: d.raw_material_id,
        unit_id: d.unit_id,
        qty: d.qty,
        note: d.note || '',
      })),
    }
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal memuat data detail')
    goBack()
  } finally {
    loading.value = false
  }
}

const onRawMaterialChange = (detail) => {
  const raw = rawMaterials.value.find(r => r.id === Number(detail.raw_material_id))
  if (raw?.unit_id) {
    detail.unit_id = raw.unit_id
  }
}

const syncRecipientInfo = () => {}

const addDetail = () => {
  form.value.details.push({ raw_material_id: '', unit_id: '', qty: 1, note: '' })
}

const removeDetail = (idx) => {
  form.value.details.splice(idx, 1)
}

const validateForm = () => {
  if (!form.value.date) return 'Tanggal wajib diisi'
  if (!form.value.month) return 'Bulan wajib diisi'
  if (!form.value.year) return 'Tahun wajib diisi'
  if (!form.value.department?.trim()) return 'Bagian wajib diisi'
  if (!form.value.recipient_employee_id) return 'Penerima wajib dipilih'
  if (!form.value.details.length) return 'Minimal 1 detail item'

  for (const d of form.value.details) {
    if (!d.raw_material_id) return 'Bahan baku wajib dipilih'
    if (!d.unit_id) return 'Satuan wajib dipilih'
    if (!Number(d.qty) || Number(d.qty) <= 0) return 'Qty harus > 0'
  }

  return ''
}

const save = async () => {
  const err = validateForm()
  if (err) return toast.error(err)

  saving.value = true
  try {
    const payload = {
      date: form.value.date,
      month: Number(form.value.month),
      year: Number(form.value.year),
      department: form.value.department.trim(),
      recipient_employee_id: Number(form.value.recipient_employee_id),
      description: form.value.description || null,
      details: form.value.details.map(d => ({
        raw_material_id: Number(d.raw_material_id),
        unit_id: Number(d.unit_id),
        qty: Number(d.qty),
        note: d.note || null,
      })),
    }

    if (isEdit.value) await api.put(`/material-issues/${route.params.id}`, payload)
    else await api.post('/material-issues', payload)

    toast.success(isEdit.value ? 'Data berhasil diperbarui' : 'Data berhasil ditambahkan')
    goBack()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan data')
  } finally {
    saving.value = false
  }
}

const goBack = () => router.push('/inventory/material-issues')

onMounted(async () => {
  const now = new Date()
  if (!isEdit.value) {
    form.value.date = toDateTimeLocal(now)
    form.value.month = now.getMonth() + 1
    form.value.year = now.getFullYear()
  }

  await fetchMasters()
  await fetchDetail()
})
</script>
