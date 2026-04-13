<template>
  <div class="coa-select-wrap" ref="wrapRef">
    <div
      class="coa-select-trigger"
      :class="{ open: open, 'has-value': selectedItem }"
      @click="toggle"
      tabindex="0"
      @keydown.esc="close"
    >
      <span class="coa-select-value">{{ selectedItem ? `${selectedItem.code} - ${selectedItem.name}` : placeholder }}</span>
      <svg class="coa-select-arrow" :class="{ rotated: open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>

    <teleport to="body">
      <div v-if="open" class="coa-select-dropdown" :style="dropdownStyle" ref="dropdownRef">
        <div class="coa-select-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref="searchRef" v-model="query" placeholder="Cari kode atau nama akun..." @keydown.esc="close" class="coa-search-input" />
        </div>
        <div class="coa-select-options">
          <div v-if="filteredItem.length === 0" class="coa-select-empty">
            {{ query ? `Tidak ditemukan "${query}"` : 'Tidak ada data' }}
          </div>
          <div
            v-for="a in filteredItem" :key="a.id"
            class="coa-select-option"
            :class="{ selected: modelValue === a.id }"
            @click="select(a)"
          >
            <span class="coa-code">{{ a.code }}</span>
            <span class="coa-name">{{ a.name }}</span>
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
  placeholder: { type: String, default: '-- Pilih Akun --' },
  type: { type: String, default: 'ASSET' }, // filter by COA type
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const query = ref('')
const accounts = ref([])
const wrapRef = ref(null)
const dropdownRef = ref(null)
const searchRef = ref(null)
const dropdownStyle = ref({})

const selectedItem = computed(() => accounts.value.find(a => a.id === props.modelValue) || null)
const filteredItem = computed(() => {
  if (!query.value) return accounts.value
  const q = query.value.toLowerCase()
  return accounts.value.filter(a =>
    a.code?.toLowerCase().includes(q) ||
    a.name?.toLowerCase().includes(q)
  )
})

const load = async () => {
  try {
    const r = await api.get('/master/coa', { params: { type: props.type, limit: 500 } })
    accounts.value = r.data.data?.data || []
  } catch {}
}

const updateDropdownPosition = () => {
  if (!wrapRef.value) return
  const rect = wrapRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top
  const dropdownHeight = 260
  const style = {
    position: 'fixed',
    left: rect.left + 'px',
    width: Math.max(rect.width, 260) + 'px',
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
const select = (a) => { emit('update:modelValue', a.id); close() }

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
.coa-select-wrap { position: relative; width: 100%; }
.coa-select-trigger {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; height: 38px; border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px; background: white; cursor: pointer; font-size: 14px;
  color: #94a3b8; transition: border-color .15s, box-shadow .15s; user-select: none;
}
.coa-select-trigger.has-value { color: var(--text-primary, #1e293b); }
.coa-select-trigger:hover, .coa-select-trigger.open { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.coa-select-arrow { width: 16px; height: 16px; transition: transform .2s; flex-shrink: 0; color: #94a3b8; }
.coa-select-arrow.rotated { transform: rotate(180deg); }
</style>

<style>
.coa-select-dropdown {
  background: white; border: 1.5px solid #e2e8f0; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15); overflow: hidden; min-width: 240px;
}
.coa-select-search {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
}
.coa-search-input { flex: 1; border: none; outline: none; font-size: 13px; background: transparent; color: #1e293b; }
.coa-select-options { max-height: 220px; overflow-y: auto; }
.coa-select-option {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 14px; cursor: pointer; font-size: 13.5px; transition: background .12s;
}
.coa-select-option:hover { background: #f8fafc; }
.coa-select-option.selected { background: #eef2ff; }
.coa-select-empty { padding: 10px 14px; font-size: 13px; color: #94a3b8; }
.coa-code { font-size: 12px; font-weight: 600; color: #6366f1; background: #eef2ff; border-radius: 4px; padding: 1px 6px; flex-shrink: 0; }
.coa-select-option.selected .coa-code { background: #c7d2fe; }
.coa-name { color: #1e293b; font-size: 13.5px; }
.coa-select-option.selected .coa-name { color: #4f46e5; font-weight: 600; }
</style>
