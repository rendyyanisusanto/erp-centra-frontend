<template>
  <div class="sm-select-wrap" ref="wrapRef">
    <div
      class="sm-select-trigger"
      :class="{ open, 'has-value': selectedItem }"
      @click="toggle"
      tabindex="0"
      @keydown.esc="close"
    >
      <span class="sm-select-value">{{ selectedItem ? `${selectedItem.code} - ${selectedItem.name}` : placeholder }}</span>
      <svg class="sm-select-arrow" :class="{ rotated: open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>

    <teleport to="body">
      <div v-if="open" class="sm-select-dropdown" :style="dropdownStyle" ref="dropdownRef">
        <div v-if="!adding" class="sm-select-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref="searchRef" v-model="query" placeholder="Cari sales..." @keydown.esc="close" class="sm-search-input" />
        </div>

        <div v-if="!adding" class="sm-select-options">
          <div class="sm-select-option no-salesman" :class="{ selected: !modelValue }" @click="selectNull">
            <span>No salesman</span>
          </div>
          <div v-if="filteredItem.length === 0 && query" class="sm-select-empty">
            Data tidak ditemukan untuk "{{ query }}"
          </div>
          <div
            v-for="s in filteredItem" :key="s.id"
            class="sm-select-option"
            :class="{ selected: Number(modelValue) === s.id }"
            @click="select(s)"
          >
            <div class="sm-main">
              <strong>{{ s.code }}</strong>
              <span>{{ s.name }}</span>
            </div>
            <span v-if="s.phone" class="sm-phone">{{ s.phone }}</span>
          </div>
        </div>

        <div class="sm-select-footer">
          <template v-if="!adding">
            <button class="sm-add-btn" type="button" @click="startAdd">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create salesman
            </button>
          </template>

          <template v-else>
            <div class="sm-add-form">
              <div class="sm-add-field">
                <label class="sm-add-label">Code <span style="color:#ef4444">*</span></label>
                <input ref="newCodeRef" v-model="newForm.code" placeholder="SM-001" class="sm-search-input sm-add-input" @keydown.esc="cancelAdd" />
              </div>
              <div class="sm-add-field">
                <label class="sm-add-label">Name <span style="color:#ef4444">*</span></label>
                <input v-model="newForm.name" placeholder="Nama sales" class="sm-search-input sm-add-input" @keydown.esc="cancelAdd" />
              </div>
              <div class="sm-add-field">
                <label class="sm-add-label">No. HP</label>
                <input v-model="newForm.phone" placeholder="No. HP" class="sm-search-input sm-add-input" @keydown.esc="cancelAdd" />
              </div>
              <div class="sm-add-field">
                <label class="sm-add-label">Alamat</label>
                <input v-model="newForm.address" placeholder="Address" class="sm-search-input sm-add-input" @keydown.esc="cancelAdd" />
              </div>
              <div class="sm-add-actions">
                <button type="button" class="btn btn-sm btn-secondary" @click="cancelAdd">Batal</button>
                <button type="button" class="btn btn-sm btn-primary" :disabled="savingNew || !newForm.code.trim() || !newForm.name.trim()" @click="saveNew">
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
  modelValue: { type: [Number, String, null], default: null },
  placeholder: { type: String, default: '-- Select Salesman (Optional) --' },
})

const emit = defineEmits(['update:modelValue', 'salesman-added'])
const toast = useToastStore()

const open = ref(false)
const query = ref('')
const adding = ref(false)
const savingNew = ref(false)
const salesmen = ref([])
const newForm = ref({ code: '', name: '', phone: '', address: '', is_active: true })
const wrapRef = ref(null)
const dropdownRef = ref(null)
const searchRef = ref(null)
const newCodeRef = ref(null)
const dropdownStyle = ref({})

const selectedItem = computed(() => salesmen.value.find(s => s.id === Number(props.modelValue)) || null)
const filteredItem = computed(() => {
  if (!query.value) return salesmen.value
  const q = query.value.toLowerCase()
  return salesmen.value.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.code.toLowerCase().includes(q) ||
    (s.phone || '').toLowerCase().includes(q),
  )
})

const load = async () => {
  try {
    const r = await api.get('/master/salesmen', { params: { limit: 500, is_active: true } })
    salesmen.value = r.data.data?.data || []
  } catch {}
}

const updateDropdownPosition = () => {
  if (!wrapRef.value) return
  const rect = wrapRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top
  const dropdownHeight = 360
  const style = {
    position: 'fixed',
    left: rect.left + 'px',
    width: Math.max(rect.width, 320) + 'px',
    zIndex: 99999,
  }
  if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
    style.top = `${rect.bottom + 4}px`
  } else {
    style.bottom = `${viewportHeight - rect.top + 4}px`
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
const selectNull = () => { emit('update:modelValue', null); close() }

const startAdd = () => {
  adding.value = true
  newForm.value = { code: '', name: query.value, phone: '', address: '', is_active: true }
  nextTick(() => { updateDropdownPosition(); newCodeRef.value?.focus() })
}
const cancelAdd = () => { adding.value = false; nextTick(() => { updateDropdownPosition(); searchRef.value?.focus() }) }

const saveNew = async () => {
  if (!newForm.value.code.trim() || !newForm.value.name.trim()) return
  savingNew.value = true
  try {
    const r = await api.post('/master/salesmen', newForm.value)
    const created = r.data.data
    await load()
    emit('update:modelValue', created.id)
    emit('salesman-added', created)
    toast.success(`Salesman "${created.name}" created`)
    close()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal menambah sales')
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
.sm-select-wrap { position: relative; width: 100%; }
.sm-select-trigger {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; height: 38px; border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px; background: white; cursor: pointer; font-size: 14px;
  color: #94a3b8; transition: border-color .15s, box-shadow .15s; user-select: none;
}
.sm-select-trigger.has-value { color: var(--text-primary, #1e293b); }
.sm-select-trigger:hover, .sm-select-trigger.open { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.sm-select-arrow { width: 16px; height: 16px; transition: transform .2s; flex-shrink: 0; color: #94a3b8; }
.sm-select-arrow.rotated { transform: rotate(180deg); }
</style>

<style>
.sm-select-dropdown {
  background: white; border: 1.5px solid #e2e8f0; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15); overflow: hidden; min-width: 280px;
}
.sm-select-search {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
}
.sm-search-input { flex: 1; border: none; outline: none; font-size: 13px; background: transparent; color: #1e293b; }
.sm-select-options { max-height: 220px; overflow-y: auto; }
.sm-select-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px; cursor: pointer; font-size: 13.5px; transition: background .12s;
}
.sm-select-option:hover { background: #f8fafc; }
.sm-select-option.selected { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.sm-select-option.no-salesman { border-bottom: 1px solid #f1f5f9; color: #64748b; }
.sm-select-empty { padding: 10px 14px; font-size: 13px; color: #94a3b8; }
.sm-main { display: flex; gap: 8px; align-items: center; }
.sm-phone { font-size: 11px; color: #94a3b8; }
.sm-select-footer { border-top: 1px solid #f1f5f9; padding: 8px 10px; }
.sm-add-btn {
  display: flex; align-items: center; gap: 6px; background: none; border: none;
  color: #6366f1; font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 2px; width: 100%;
}
.sm-add-btn:hover { color: #4f46e5; }
.sm-add-form { display: flex; flex-direction: column; gap: 6px; }
.sm-add-field { display: flex; flex-direction: column; gap: 2px; }
.sm-add-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .4px; }
.sm-add-input { border: 1px solid #e2e8f0 !important; border-radius: 6px; padding: 5px 8px; font-size: 13px; width: 100%; box-sizing: border-box; }
.sm-add-input:focus { border-color: #6366f1 !important; outline: none; }
.sm-add-actions { display: flex; gap: 6px; justify-content: flex-end; margin-top: 2px; }
</style>
