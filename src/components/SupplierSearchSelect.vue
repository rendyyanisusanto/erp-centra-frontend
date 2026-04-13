<template>
  <div class="sup-select-wrap" ref="wrapRef">
    <!-- Trigger -->
    <div
      class="sup-select-trigger"
      :class="{ open: open, 'has-value': selectedItem }"
      @click="toggle"
      tabindex="0"
      @keydown.esc="close"
    >
      <span class="sup-select-value">{{ selectedItem ? selectedItem.name : placeholder }}</span>
      <svg class="sup-select-arrow" :class="{ rotated: open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>

    <!-- Teleported dropdown -->
    <teleport to="body">
      <div v-if="open" class="sup-select-dropdown" :style="dropdownStyle" ref="dropdownRef">

        <!-- Search (hidden when adding) -->
        <div v-if="!adding" class="sup-select-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref="searchRef" v-model="query" placeholder="Cari supplier..." @keydown.esc="close" class="sup-search-input" />
        </div>

        <!-- Options list -->
        <div v-if="!adding" class="sup-select-options">
          <div v-if="filteredItem.length === 0 && query" class="sup-select-empty">
            Tidak ditemukan "{{ query }}"
          </div>
          <div
            v-for="s in filteredItem" :key="s.id"
            class="sup-select-option"
            :class="{ selected: modelValue === s.id }"
            @click="select(s)"
          >
            <span>{{ s.name }}</span>
            <span v-if="s.phone" class="sup-phone">{{ s.phone }}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="sup-select-footer">
          <!-- Add trigger -->
          <template v-if="!adding">
            <button class="sup-add-btn" type="button" @click="startAdd">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Supplier Baru
            </button>
          </template>

          <!-- Add form -->
          <template v-else>
            <div class="sup-add-form">
              <div class="sup-add-field">
                <label class="sup-add-label">Nama <span style="color:#ef4444">*</span></label>
                <input ref="newNameRef" v-model="newForm.name" placeholder="Nama supplier..." class="sup-search-input sup-add-input" @keydown.esc="cancelAdd" />
              </div>
              <div class="sup-add-field">
                <label class="sup-add-label">Telepon</label>
                <input v-model="newForm.phone" placeholder="Nomor telepon..." class="sup-search-input sup-add-input" @keydown.esc="cancelAdd" />
              </div>
              <div class="sup-add-field">
                <label class="sup-add-label">Alamat</label>
                <input v-model="newForm.address" placeholder="Alamat..." class="sup-search-input sup-add-input" @keydown.esc="cancelAdd" />
              </div>
              <div class="sup-add-actions">
                <button type="button" class="btn btn-sm btn-secondary" @click="cancelAdd">Batal</button>
                <button type="button" class="btn btn-sm btn-primary" :disabled="savingNew || !newForm.name.trim()" @click="saveNew">
                  <span v-if="savingNew" class="spinner" style="width:12px;height:12px"></span>
                  <span v-else>Simpan</span>
                </button>
              </div>
            </div>
          </template>
        </div>

      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const props = defineProps({
  modelValue: { type: [Number, String], default: '' },
  placeholder: { type: String, default: '-- Pilih Supplier --' },
})
const emit = defineEmits(['update:modelValue', 'supplier-added'])
const toast = useToastStore()

const open = ref(false)
const query = ref('')
const adding = ref(false)
const savingNew = ref(false)
const newForm = ref({ name: '', phone: '', address: '' })
const suppliers = ref([])
const wrapRef = ref(null)
const dropdownRef = ref(null)
const searchRef = ref(null)
const newNameRef = ref(null)
const dropdownStyle = ref({})

const selectedItem = computed(() => suppliers.value.find(s => s.id === props.modelValue) || null)
const filteredItem = computed(() => {
  if (!query.value) return suppliers.value
  return suppliers.value.filter(s => s.name.toLowerCase().includes(query.value.toLowerCase()))
})

const load = async () => {
  try {
    const r = await api.get('/master/suppliers', { params: { limit: 500 } })
    suppliers.value = r.data.data?.data || []
  } catch {}
}

const updateDropdownPosition = () => {
  if (!wrapRef.value) return
  const rect = wrapRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top
  const dropdownHeight = 320
  const style = {
    position: 'fixed',
    left: rect.left + 'px',
    width: Math.max(rect.width, 280) + 'px',
    zIndex: 99999,
  }
  if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
    style.top = (rect.bottom + 4) + 'px'
  } else {
    style.bottom = (viewportHeight - rect.top + 4) + 'px'
    style.top = 'auto'
  }
  dropdownStyle.value = style
}

const toggle = () => {
  open.value = !open.value
  if (open.value) {
    query.value = ''
    adding.value = false
    nextTick(() => { updateDropdownPosition(); searchRef.value?.focus() })
  }
}
const close = () => { open.value = false; adding.value = false }
const select = (s) => { emit('update:modelValue', s.id); close() }

const startAdd = () => {
  adding.value = true
  newForm.value = { name: query.value, phone: '', address: '' }
  nextTick(() => { updateDropdownPosition(); newNameRef.value?.focus() })
}
const cancelAdd = () => { adding.value = false; nextTick(() => { updateDropdownPosition(); searchRef.value?.focus() }) }

const saveNew = async () => {
  if (!newForm.value.name.trim()) return
  savingNew.value = true
  try {
    const r = await api.post('/master/suppliers', newForm.value)
    const created = r.data.data
    await load()
    emit('update:modelValue', created.id)
    emit('supplier-added', created)
    toast.success(`Supplier "${created.name}" ditambahkan`)
    close()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal menambah supplier')
  } finally {
    savingNew.value = false
  }
}

const onClickOutside = (e) => {
  if (
    wrapRef.value && !wrapRef.value.contains(e.target) &&
    dropdownRef.value && !dropdownRef.value.contains(e.target)
  ) close()
}
const onScrollOrResize = () => { if (open.value) updateDropdownPosition() }

onMounted(() => {
  load()
  document.addEventListener('mousedown', onClickOutside)
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
})
</script>

<style scoped>
.sup-select-wrap { position: relative; width: 100%; }
.sup-select-trigger {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; height: 38px; border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px; background: white; cursor: pointer; font-size: 14px;
  color: #94a3b8; transition: border-color .15s, box-shadow .15s; user-select: none;
}
.sup-select-trigger.has-value { color: var(--text-primary, #1e293b); }
.sup-select-trigger:hover, .sup-select-trigger.open { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.sup-select-arrow { width: 16px; height: 16px; transition: transform .2s; flex-shrink: 0; color: #94a3b8; }
.sup-select-arrow.rotated { transform: rotate(180deg); }
</style>

<style>
.sup-select-dropdown {
  background: white; border: 1.5px solid #e2e8f0; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15); overflow: hidden; min-width: 240px;
}
.sup-select-search {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
}
.sup-search-input { flex: 1; border: none; outline: none; font-size: 13px; background: transparent; color: #1e293b; }
.sup-select-options { max-height: 200px; overflow-y: auto; }
.sup-select-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px; cursor: pointer; font-size: 13.5px; transition: background .12s;
}
.sup-select-option:hover { background: #f8fafc; }
.sup-select-option.selected { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.sup-select-empty { padding: 10px 14px; font-size: 13px; color: #94a3b8; }
.sup-phone { font-size: 11px; color: #94a3b8; }
.sup-select-footer { border-top: 1px solid #f1f5f9; padding: 8px 10px; }
.sup-add-btn {
  display: flex; align-items: center; gap: 6px; background: none; border: none;
  color: #6366f1; font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 2px; width: 100%;
}
.sup-add-btn:hover { color: #4f46e5; }
.sup-add-form { display: flex; flex-direction: column; gap: 6px; }
.sup-add-field { display: flex; flex-direction: column; gap: 2px; }
.sup-add-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .4px; }
.sup-add-input { border: 1px solid #e2e8f0 !important; border-radius: 6px; padding: 5px 8px; font-size: 13px; width: 100%; box-sizing: border-box; }
.sup-add-input:focus { border-color: #6366f1 !important; outline: none; }
.sup-add-actions { display: flex; gap: 6px; justify-content: flex-end; margin-top: 2px; }
</style>
