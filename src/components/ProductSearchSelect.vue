<template>
  <div class="prod-select-wrap" ref="wrapRef">
    <!-- Trigger -->
    <div
      class="prod-select-trigger"
      :class="{ open: open, 'has-value': selectedItem }"
      @click="toggle"
      tabindex="0"
      @keydown.esc="close"
    >
      <span class="prod-select-value">{{ selectedItem ? selectedItem.name : placeholder }}</span>
      <svg class="prod-select-arrow" :class="{ rotated: open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>

    <!-- Teleported dropdown -->
    <teleport to="body">
      <div v-if="open" class="prod-select-dropdown" :style="dropdownStyle" ref="dropdownRef">
        <!-- Search -->
        <div class="prod-select-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref="searchRef" v-model="query" placeholder="Cari produk..." @keydown.esc="close" class="prod-search-input" />
        </div>

        <!-- Options -->
        <div class="prod-select-options">
          <div v-if="filteredItem.length === 0 && query" class="prod-select-empty">
            Tidak ditemukan "{{ query }}"
          </div>
          <div v-if="filteredItem.length === 0 && !query" class="prod-select-empty">
            Tidak ada produk tersedia
          </div>
          <div
            v-for="p in filteredItem" :key="p.id"
            class="prod-select-option"
            :class="{ selected: modelValue === p.id }"
            @click="select(p)"
          >
            <span>{{ p.name }}</span>
            <span class="prod-stock-badge" :class="{ low: p.stock <= (p.min_stock || 0) }">
              Stok: {{ p.stock ?? 0 }}
            </span>
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
  placeholder: { type: String, default: '-- Pilih Produk --' },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const query = ref('')
const products = ref([])
const wrapRef = ref(null)
const dropdownRef = ref(null)
const searchRef = ref(null)
const dropdownStyle = ref({})

const selectedItem = computed(() => products.value.find(p => p.id === props.modelValue) || null)
const filteredItem = computed(() => {
  if (!query.value) return products.value
  return products.value.filter(p => p.name.toLowerCase().includes(query.value.toLowerCase()))
})

const load = async () => {
  try {
    const r = await api.get('/master/products', { params: { limit: 500 } })
    products.value = r.data.data?.data || []
  } catch {}
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
    width: Math.max(rect.width, 220) + 'px',
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
const select = (p) => { emit('update:modelValue', p.id); close() }

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
.prod-select-wrap { position: relative; width: 100%; }
.prod-select-trigger {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; height: 38px; border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px; background: white; cursor: pointer; font-size: 14px;
  color: #94a3b8; transition: border-color .15s, box-shadow .15s; user-select: none;
}
.prod-select-trigger.has-value { color: var(--text-primary, #1e293b); }
.prod-select-trigger:hover, .prod-select-trigger.open { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.prod-select-arrow { width: 16px; height: 16px; transition: transform .2s; flex-shrink: 0; color: #94a3b8; }
.prod-select-arrow.rotated { transform: rotate(180deg); }
</style>

<style>
.prod-select-dropdown {
  background: white; border: 1.5px solid #e2e8f0; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15); overflow: hidden; min-width: 200px;
}
.prod-select-search {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
}
.prod-search-input { flex: 1; border: none; outline: none; font-size: 13px; background: transparent; color: #1e293b; }
.prod-select-options { max-height: 220px; overflow-y: auto; }
.prod-select-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px; cursor: pointer; font-size: 13.5px; transition: background .12s;
}
.prod-select-option:hover { background: #f8fafc; }
.prod-select-option.selected { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.prod-select-empty { padding: 10px 14px; font-size: 13px; color: #94a3b8; }
.prod-stock-badge {
  font-size: 11px; font-weight: 500; color: #16a34a;
  background: #f0fdf4; border-radius: 4px; padding: 1px 6px; white-space: nowrap;
}
.prod-stock-badge.low { color: #dc2626; background: #fef2f2; }
</style>
