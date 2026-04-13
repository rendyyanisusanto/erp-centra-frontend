<template>
  <div class="rm-select-wrap" ref="wrapRef">
    <!-- Trigger -->
    <div
      class="rm-select-trigger"
      :class="{ open: open, 'has-value': selectedItem }"
      @click="toggle"
      tabindex="0"
      @keydown.esc="close"
    >
      <span class="rm-select-value">{{ selectedItem ? selectedItem.name : placeholder }}</span>
      <div style="display:flex; align-items:center; gap:4px">
        <svg v-if="selectedItem" @click.stop="clearSelection" viewBox="0 0 24 24" fill="none" class="rm-clear-btn"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <svg class="rm-select-arrow" :class="{ rotated: open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>

    <!-- Teleported dropdown -->
    <teleport to="body">
      <div v-if="open" class="rm-select-dropdown" :style="dropdownStyle" ref="dropdownRef">
        <!-- Search -->
        <div class="rm-select-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref="searchRef" v-model="query" placeholder="Cari bahan baku..." @keydown.esc="close" class="rm-search-input" />
        </div>

        <!-- Options -->
        <div class="rm-select-options">
          <div v-if="!adding && filteredItem.length === 0 && query" class="rm-select-empty">
            Tidak ditemukan "{{ query }}"
          </div>
          <div v-if="!adding">
            <div
              v-for="rm in filteredItem" :key="rm.id"
              class="rm-select-option"
              :class="{ selected: modelValue === rm.id }"
              @click="select(rm)"
            >
              <span>{{ rm.name }}</span>
              <span v-if="rm.unit?.name" class="rm-unit-badge">{{ rm.unit.name }}</span>
            </div>
          </div>
        </div>

        <!-- Footer: add new -->
        <div class="rm-select-footer">
          <template v-if="!adding">
            <button class="rm-add-btn" type="button" @click="startAdd">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Bahan Baku Baru
            </button>
          </template>
          <template v-else>
            <div class="rm-add-form">
              <input
                ref="newNameRef"
                v-model="newName"
                placeholder="Nama bahan baku..."
                class="rm-search-input"
                @keydown.enter.prevent="saveNew"
                @keydown.esc="cancelAdd"
              />
              <div class="rm-add-actions">
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
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const props = defineProps({
  modelValue: { type: [Number, String], default: '' },
  placeholder: { type: String, default: '-- Pilih Bahan Baku --' },
})
const emit = defineEmits(['update:modelValue', 'item-added'])
const toast = useToastStore()

const open = ref(false)
const query = ref('')
const adding = ref(false)
const newName = ref('')
const savingNew = ref(false)
const rawMaterials = ref([])
const wrapRef = ref(null)
const dropdownRef = ref(null)
const searchRef = ref(null)
const newNameRef = ref(null)
const dropdownStyle = ref({})

const selectedItem = computed(() => rawMaterials.value.find(r => r.id === props.modelValue) || null)
const filteredItem = computed(() => {
  if (!query.value) return rawMaterials.value
  return rawMaterials.value.filter(r => r.name.toLowerCase().includes(query.value.toLowerCase()))
})

const load = async () => {
  try {
    const r = await api.get('/master/raw-materials', { params: { limit: 500 } })
    rawMaterials.value = r.data.data?.data || []
  } catch {}
}

const updateDropdownPosition = () => {
  if (!wrapRef.value) return
  const rect = wrapRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top
  const dropdownHeight = 300

  const style = {
    position: 'fixed',
    left: rect.left + 'px',
    width: rect.width + 'px',
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
const select = (rm) => { emit('update:modelValue', rm.id); close() }
const clearSelection = () => { emit('update:modelValue', ''); }

const startAdd = () => {
  adding.value = true
  newName.value = query.value
  nextTick(() => newNameRef.value?.focus())
}
const cancelAdd = () => { adding.value = false; newName.value = ''; nextTick(() => searchRef.value?.focus()) }

const saveNew = async () => {
  if (!newName.value.trim()) return
  savingNew.value = true
  try {
    const r = await api.post('/master/raw-materials', { name: newName.value.trim() })
    const created = r.data.data
    await load()
    emit('update:modelValue', created.id)
    emit('item-added', created)
    toast.success(`Bahan baku "${created.name}" ditambahkan`)
    close()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Gagal menambah bahan baku')
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
.rm-select-wrap { position: relative; width: 100%; }
.rm-select-trigger {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; height: 38px; border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px; background: white; cursor: pointer; font-size: 14px;
  color: #94a3b8; transition: border-color .15s, box-shadow .15s; user-select: none;
}
.rm-select-trigger.has-value { color: var(--text-primary, #1e293b); }
.rm-select-trigger:hover, .rm-select-trigger.open { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.rm-select-arrow { width: 16px; height: 16px; transition: transform .2s; flex-shrink: 0; color: #94a3b8; }
.rm-select-arrow.rotated { transform: rotate(180deg); }
.rm-clear-btn { width: 16px; height: 16px; color: #94a3b8; cursor: pointer; border-radius: 4px; padding: 2px; transition: background .15s, color .15s; }
.rm-clear-btn:hover { background: #fee2e2; color: #ef4444; }
</style>

<style>
.rm-select-dropdown {
  background: white; border: 1.5px solid #e2e8f0; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15); overflow: hidden; min-width: 180px;
}
.rm-select-search {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
}
.rm-search-input { flex: 1; border: none; outline: none; font-size: 13px; background: transparent; color: #1e293b; }
.rm-select-options { max-height: 200px; overflow-y: auto; }
.rm-select-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px; cursor: pointer; font-size: 13.5px; transition: background .12s;
}
.rm-select-option:hover { background: #f8fafc; }
.rm-select-option.selected { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.rm-select-empty { padding: 10px 14px; font-size: 13px; color: #94a3b8; }
.rm-unit-badge {
  font-size: 11px; font-weight: 500; color: #64748b;
  background: #f1f5f9; border-radius: 4px; padding: 1px 6px;
}
.rm-select-footer { border-top: 1px solid #f1f5f9; padding: 8px 10px; }
.rm-add-btn {
  display: flex; align-items: center; gap: 6px; background: none; border: none;
  color: #6366f1; font-size: 13px; font-weight: 500; cursor: pointer; padding: 4px 2px; width: 100%;
}
.rm-add-btn:hover { color: #4f46e5; }
.rm-add-form { display: flex; flex-direction: column; gap: 8px; }
.rm-add-actions { display: flex; gap: 6px; justify-content: flex-end; }
</style>
