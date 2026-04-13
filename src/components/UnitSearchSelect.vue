<template>
  <div class="unit-select-wrap" ref="wrapRef">
    <!-- Trigger button -->
    <div
      class="unit-select-trigger"
      :class="{ open: open, 'has-value': selectedUnit }"
      @click="toggle"
      tabindex="0"
      @keydown.esc="close"
    >
      <span class="unit-select-value">{{ selectedUnit ? selectedUnit.name : placeholder }}</span>
      <svg class="unit-select-arrow" :class="{ rotated: open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>

    <!-- Dropdown via Teleport to avoid modal overflow clipping -->
    <teleport to="body">
      <div
        v-if="open"
        class="unit-select-dropdown"
        :style="dropdownStyle"
        ref="dropdownRef"
      >
        <!-- Search -->
        <div class="unit-select-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref="searchRef" v-model="query" placeholder="Cari satuan..." @keydown.esc="close" class="unit-search-input" />
        </div>

        <!-- Options -->
        <div class="unit-select-options">
          <div v-if="!adding && filteredUnits.length === 0 && query" class="unit-select-empty">Tidak ditemukan "{{ query }}"</div>
          <div v-if="!adding">
            <div
              v-for="u in filteredUnits" :key="u.id"
              class="unit-select-option"
              :class="{ selected: modelValue === u.id }"
              @click="select(u)"
            >{{ u.name }}</div>
          </div>
        </div>

        <!-- Add new unit -->
        <div class="unit-select-footer">
          <template v-if="!adding">
            <button class="unit-add-btn" type="button" @click="startAdd">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Satuan Baru
            </button>
          </template>
          <template v-else>
            <div class="unit-add-form">
              <input ref="newUnitRef" v-model="newName" placeholder="Nama satuan..." class="unit-search-input" @keydown.enter.prevent="saveNew" @keydown.esc="cancelAdd" />
              <div class="unit-add-actions">
                <button type="button" class="btn btn-sm btn-secondary" @click="cancelAdd">Batal</button>
                <button type="button" class="btn btn-sm btn-primary" :disabled="savingNew || !newName.trim()" @click="saveNew">
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
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const props = defineProps({
  modelValue: { type: [Number, String], default: '' },
  placeholder: { type: String, default: '-- Pilih Satuan --' },
})
const emit = defineEmits(['update:modelValue', 'unit-added'])
const toast = useToastStore()

const open = ref(false)
const query = ref('')
const adding = ref(false)
const newName = ref('')
const savingNew = ref(false)
const units = ref([])
const wrapRef = ref(null)
const dropdownRef = ref(null)
const searchRef = ref(null)
const newUnitRef = ref(null)

// Position for the teleported dropdown
const dropdownStyle = ref({})

const selectedUnit = computed(() => units.value.find(u => u.id === props.modelValue) || null)
const filteredUnits = computed(() => {
  if (!query.value) return units.value
  return units.value.filter(u => u.name.toLowerCase().includes(query.value.toLowerCase()))
})

const updateDropdownPosition = () => {
  if (!wrapRef.value) return
  const rect = wrapRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top
  const dropdownHeight = 280 // approximate max height

  let top
  if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
    // open downward
    top = rect.bottom + window.scrollY + 4
  } else {
    // open upward
    top = rect.top + window.scrollY - dropdownHeight - 4
  }

  dropdownStyle.value = {
    position: 'fixed',
    top: (rect.bottom + 4) + 'px',
    left: rect.left + 'px',
    width: rect.width + 'px',
    zIndex: 99999,
  }

  // recalculate if should open upward
  if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
    dropdownStyle.value.top = 'auto'
    dropdownStyle.value.bottom = (viewportHeight - rect.top + 4) + 'px'
  }
}

const loadUnits = async () => {
  try {
    const r = await api.get('/master/units', { params: { limit: 500 } })
    units.value = r.data.data?.data || []
  } catch {}
}

const toggle = () => {
  open.value = !open.value
  if (open.value) {
    query.value = ''
    adding.value = false
    nextTick(() => {
      updateDropdownPosition()
      searchRef.value?.focus()
    })
  }
}
const close = () => { open.value = false; adding.value = false }
const select = (u) => { emit('update:modelValue', u.id); close() }

const startAdd = () => {
  adding.value = true
  newName.value = query.value
  nextTick(() => newUnitRef.value?.focus())
}
const cancelAdd = () => { adding.value = false; newName.value = ''; nextTick(() => searchRef.value?.focus()) }

const saveNew = async () => {
  if (!newName.value.trim()) return
  savingNew.value = true
  try {
    const r = await api.post('/master/units', { name: newName.value.trim() })
    const created = r.data.data
    await loadUnits()
    emit('update:modelValue', created.id)
    emit('unit-added', created)
    toast.success(`Satuan "${created.name}" ditambahkan`)
    close()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal menambah satuan')
  } finally {
    savingNew.value = false
  }
}

// click outside to close
const onClickOutside = (e) => {
  if (
    wrapRef.value && !wrapRef.value.contains(e.target) &&
    dropdownRef.value && !dropdownRef.value.contains(e.target)
  ) close()
}

// scroll/resize reposition
const onScrollOrResize = () => { if (open.value) updateDropdownPosition() }

onMounted(() => {
  loadUnits()
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
.unit-select-wrap { position: relative; width: 100%; }

.unit-select-trigger {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; height: 38px; border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px; background: white; cursor: pointer; font-size: 14px;
  color: #94a3b8; transition: border-color .15s, box-shadow .15s;
  user-select: none;
}
.unit-select-trigger.has-value { color: var(--text-primary, #1e293b); }
.unit-select-trigger:hover, .unit-select-trigger.open { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.unit-select-arrow { width: 16px; height: 16px; transition: transform .2s; flex-shrink: 0; color: #94a3b8; }
.unit-select-arrow.rotated { transform: rotate(180deg); }
</style>

<!-- Global styles for teleported dropdown (not scoped) -->
<style>
.unit-select-dropdown {
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
  overflow: hidden;
  min-width: 160px;
}
.unit-select-search {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
}
.unit-search-input {
  flex: 1; border: none; outline: none; font-size: 13px; background: transparent;
  color: #1e293b;
}
.unit-select-options { max-height: 180px; overflow-y: auto; }
.unit-select-option {
  padding: 9px 14px; cursor: pointer; font-size: 13.5px; transition: background .12s;
}
.unit-select-option:hover { background: #f8fafc; }
.unit-select-option.selected { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.unit-select-empty { padding: 10px 14px; font-size: 13px; color: #94a3b8; }
.unit-select-footer { border-top: 1px solid #f1f5f9; padding: 8px 10px; }
.unit-add-btn {
  display: flex; align-items: center; gap: 6px; background: none; border: none;
  color: #6366f1; font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 2px;
  width: 100%;
}
.unit-add-btn:hover { color: #4f46e5; }
.unit-add-form { display: flex; flex-direction: column; gap: 8px; }
.unit-add-actions { display: flex; gap: 6px; justify-content: flex-end; }
</style>
