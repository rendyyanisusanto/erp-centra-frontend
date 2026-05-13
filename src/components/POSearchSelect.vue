<template>
  <div class="po-select-wrap" ref="wrapRef">
    <!-- Trigger -->
    <div
      class="po-select-trigger"
      :class="{ open: open, 'has-value': selectedPO }"
      @click="toggle"
      tabindex="0"
      @keydown.esc="close"
    >
      <span class="po-select-value">
        {{ selectedPO ? `PO#${selectedPO.id} — ${selectedPO.supplier?.name}` : placeholder }}
      </span>
      <svg class="po-select-arrow" :class="{ rotated: open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>

    <!-- Teleported dropdown -->
    <teleport to="body">
      <div v-if="open" class="po-select-dropdown" :style="dropdownStyle" ref="dropdownRef">
        <!-- Search -->
        <div class="po-select-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref="searchRef" v-model="query" placeholder="Cari PO atau supplier..." @keydown.esc="close" class="po-search-input" />
        </div>

        <!-- Options -->
        <div class="po-select-options">
          <div v-if="loading" class="po-select-empty">Memuat...</div>
          <div v-else-if="filteredPOs.length === 0" class="po-select-empty">
            {{ query ? `Tidak ditemukan "${query}"` : 'Tidak ada PO yang disetujui' }}
          </div>
          <div
            v-for="po in filteredPOs" :key="po.id"
            class="po-select-option"
            :class="{ selected: modelValue === po.id }"
            @click="select(po)"
          >
            <div class="po-option-main">
              <span class="po-option-number">PO #{{ po.id }}</span>
              <span class="po-option-supplier">{{ po.supplier?.name }}</span>
            </div>
            <div class="po-option-meta">
              <span class="po-option-date">{{ po.date }}</span>
              <span class="po-option-status" :class="po.status?.toLowerCase()">{{ po.status }}</span>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import api from '@/services/api'

const props = defineProps({
  modelValue: { type: [Number, String], default: '' },
  placeholder: { type: String, default: '-- Pilih Pembelian --' },
})
const emit = defineEmits(['update:modelValue', 'po-selected'])

const open = ref(false)
const query = ref('')
const loading = ref(false)
const pos = ref([])
const wrapRef = ref(null)
const dropdownRef = ref(null)
const searchRef = ref(null)
const dropdownStyle = ref({})

const selectedPO = computed(() => pos.value.find(p => p.id === props.modelValue) || null)
const filteredPOs = computed(() => {
  if (!query.value) return pos.value
  const q = query.value.toLowerCase()
  return pos.value.filter(p =>
    String(p.id).includes(q) ||
    (p.supplier?.name || '').toLowerCase().includes(q)
  )
})

const load = async () => {
  loading.value = true
  try {
    const r = await api.get('/purchase', { params: { status: 'APPROVED', limit: 500 } })
    pos.value = r.data.data?.data || []
  } catch {} finally { loading.value = false }
}

const updateDropdownPosition = () => {
  if (!wrapRef.value) return
  const rect = wrapRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top
  const dropdownHeight = 280
  const style = {
    position: 'fixed',
    left: rect.left + 'px',
    width: Math.max(rect.width, 300) + 'px',
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
    nextTick(() => { updateDropdownPosition(); searchRef.value?.focus() })
  }
}
const close = () => { open.value = false }

const select = async (po) => {
  emit('update:modelValue', po.id)
  // fetch PO detail to get items
  try {
    const r = await api.get(`/purchase/${po.id}`)
    emit('po-selected', r.data.data)
  } catch {
    emit('po-selected', po)
  }
  close()
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
.po-select-wrap { position: relative; width: 100%; }
.po-select-trigger {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; height: 38px; border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px; background: white; cursor: pointer; font-size: 14px;
  color: #94a3b8; transition: border-color .15s, box-shadow .15s; user-select: none;
}
.po-select-trigger.has-value { color: var(--text-primary, #1e293b); }
.po-select-trigger:hover, .po-select-trigger.open { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.po-select-arrow { width: 16px; height: 16px; transition: transform .2s; flex-shrink: 0; color: #94a3b8; }
.po-select-arrow.rotated { transform: rotate(180deg); }
</style>

<style>
.po-select-dropdown {
  background: white; border: 1.5px solid #e2e8f0; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15); overflow: hidden; min-width: 280px;
}
.po-select-search {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
}
.po-search-input { flex: 1; border: none; outline: none; font-size: 13px; background: transparent; color: #1e293b; }
.po-select-options { max-height: 240px; overflow-y: auto; }
.po-select-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; cursor: pointer; transition: background .12s; gap: 12px;
}
.po-select-option:hover { background: #f8fafc; }
.po-select-option.selected { background: #eef2ff; }
.po-option-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.po-option-number { font-size: 13px; font-weight: 600; color: #1e293b; }
.po-select-option.selected .po-option-number { color: #4f46e5; }
.po-option-supplier { font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.po-option-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.po-option-date { font-size: 11px; color: #94a3b8; }
.po-option-status { font-size: 10px; font-weight: 600; letter-spacing: .3px; padding: 1px 6px; border-radius: 4px; }
.po-option-status.approved { background: #dcfce7; color: #16a34a; }
.po-option-status.partial { background: #fef9c3; color: #b45309; }
.po-select-empty { padding: 12px 14px; font-size: 13px; color: #94a3b8; text-align: center; }
</style>
