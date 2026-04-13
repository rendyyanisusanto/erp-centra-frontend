<template>
  <div class="so-select-wrap" ref="wrapRef">
    <!-- Trigger -->
    <div
      class="so-select-trigger"
      :class="{ open: open, 'has-value': selectedSO }"
      @click="toggle"
      tabindex="0"
      @keydown.esc="close"
    >
      <span class="so-select-value">
        {{ selectedSO ? `SO#${selectedSO.id} — ${selectedSO.customer?.name}` : placeholder }}
      </span>
      <svg class="so-select-arrow" :class="{ rotated: open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>

    <!-- Teleported dropdown -->
    <teleport to="body">
      <div v-if="open" class="so-select-dropdown" :style="dropdownStyle" ref="dropdownRef">
        <!-- Search -->
        <div class="so-select-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref="searchRef" v-model="query" placeholder="Cari SO atau customer..." @keydown.esc="close" class="so-search-input" />
        </div>

        <!-- Options -->
        <div class="so-select-options">
          <div v-if="loadingData" class="so-select-empty">Memuat...</div>
          <div v-else-if="filteredSOs.length === 0" class="so-select-empty">
            {{ query ? `Tidak ditemukan "${query}"` : 'Tidak ada SO yang belum lunas' }}
          </div>
          <div
            v-for="so in filteredSOs" :key="so.id"
            class="so-select-option"
            :class="{ selected: modelValue === so.id }"
            @click="select(so)"
          >
            <div class="so-option-main">
              <span class="so-option-number">SO #{{ so.id }}</span>
              <span class="so-option-customer">{{ so.customer?.name }}</span>
            </div>
            <div class="so-option-meta">
              <span class="so-option-amount">{{ fmt(so.total_amount) }}</span>
              <span class="so-option-status" :class="so.status?.toLowerCase()">{{ so.status }}</span>
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
  placeholder: { type: String, default: '-- Pilih Penjualan --' },
})
const emit = defineEmits(['update:modelValue', 'so-selected'])

const open = ref(false)
const query = ref('')
const loadingData = ref(false)
const sales = ref([])
const wrapRef = ref(null)
const dropdownRef = ref(null)
const searchRef = ref(null)
const dropdownStyle = ref({})

const fmt = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID')

const selectedSO = computed(() => sales.value.find(s => s.id === props.modelValue) || null)
const filteredSOs = computed(() => {
  if (!query.value) return sales.value
  const q = query.value.toLowerCase()
  return sales.value.filter(s =>
    String(s.id).includes(q) ||
    (s.customer?.name || '').toLowerCase().includes(q)
  )
})

const load = async () => {
  loadingData.value = true
  try {
    const [r1, r2] = await Promise.all([
      api.get('/sales', { params: { status: 'UNPAID', limit: 500 } }),
      api.get('/sales', { params: { status: 'PARTIAL', limit: 500 } }),
    ])
    sales.value = [
      ...(r1.data.data?.data || []),
      ...(r2.data.data?.data || []),
    ]
  } catch {} finally { loadingData.value = false }
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

const select = (so) => {
  emit('update:modelValue', so.id)
  emit('so-selected', so)
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
.so-select-wrap { position: relative; width: 100%; }
.so-select-trigger {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; height: 38px; border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px; background: white; cursor: pointer; font-size: 14px;
  color: #94a3b8; transition: border-color .15s, box-shadow .15s; user-select: none;
}
.so-select-trigger.has-value { color: var(--text-primary, #1e293b); }
.so-select-trigger:hover, .so-select-trigger.open { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.so-select-arrow { width: 16px; height: 16px; transition: transform .2s; flex-shrink: 0; color: #94a3b8; }
.so-select-arrow.rotated { transform: rotate(180deg); }
</style>

<style>
.so-select-dropdown {
  background: white; border: 1.5px solid #e2e8f0; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15); overflow: hidden; min-width: 280px;
}
.so-select-search {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
}
.so-search-input { flex: 1; border: none; outline: none; font-size: 13px; background: transparent; color: #1e293b; }
.so-select-options { max-height: 240px; overflow-y: auto; }
.so-select-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; cursor: pointer; transition: background .12s; gap: 12px;
}
.so-select-option:hover { background: #f8fafc; }
.so-select-option.selected { background: #eef2ff; }
.so-select-empty { padding: 12px 14px; font-size: 13px; color: #94a3b8; text-align: center; }
.so-option-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.so-option-number { font-size: 13px; font-weight: 600; color: #1e293b; }
.so-select-option.selected .so-option-number { color: #4f46e5; }
.so-option-customer { font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.so-option-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.so-option-amount { font-size: 12px; font-weight: 600; color: #1e293b; }
.so-option-status { font-size: 10px; font-weight: 600; letter-spacing: .3px; padding: 1px 6px; border-radius: 4px; }
.so-option-status.unpaid { background: #fef2f2; color: #dc2626; }
.so-option-status.partial { background: #fef9c3; color: #b45309; }
</style>
