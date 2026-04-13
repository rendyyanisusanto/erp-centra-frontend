<template>
  <div class="pos-select-wrap" ref="wrapRef">
    <div
      class="pos-select-trigger"
      :class="{ open, 'has-value': selectedItem }"
      @click="toggle"
      tabindex="0"
      @keydown.esc="close"
    >
      <span class="pos-select-value">{{ selectedItem ? `${selectedItem.code} - ${selectedItem.name}` : placeholder }}</span>
      <svg class="pos-select-arrow" :class="{ rotated: open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>

    <teleport to="body">
      <div v-if="open" class="pos-select-dropdown" :style="dropdownStyle" ref="dropdownRef">
        <div class="pos-select-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref="searchRef" v-model="query" placeholder="Cari jabatan..." @keydown.esc="close" class="pos-search-input" />
        </div>

        <div class="pos-select-options">
          <div v-if="allowEmpty" class="pos-select-option" :class="{ selected: modelValue === '' || modelValue === null }" @click="selectNull">
            {{ emptyLabel }}
          </div>
          <div v-if="filteredItem.length === 0 && query" class="pos-select-empty">Data tidak ditemukan untuk "{{ query }}"</div>
          <div
            v-for="p in filteredItem" :key="p.id"
            class="pos-select-option"
            :class="{ selected: Number(modelValue) === p.id }"
            @click="select(p)"
          >
            <div class="pos-main">
              <strong>{{ p.code }}</strong>
              <span>{{ p.name }}</span>
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
  modelValue: { type: [Number, String, null], default: '' },
  placeholder: { type: String, default: '-- Select Position --' },
  allowEmpty: { type: Boolean, default: false },
  emptyLabel: { type: String, default: '-- No Position --' },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const query = ref('')
const items = ref([])
const wrapRef = ref(null)
const dropdownRef = ref(null)
const searchRef = ref(null)
const dropdownStyle = ref({})

const selectedItem = computed(() => items.value.find(i => i.id === Number(props.modelValue)) || null)
const filteredItem = computed(() => {
  if (!query.value) return items.value
  const q = query.value.toLowerCase()
  return items.value.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q))
})

const load = async () => {
  try {
    const r = await api.get('/master/positions/options', { params: { limit: 500 } })
    items.value = r.data.data || []
  } catch {
    try {
      const r = await api.get('/master/positions', { params: { limit: 500 } })
      items.value = r.data.data?.data || []
    } catch {
      items.value = []
    }
  }
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
    width: Math.max(rect.width, 280) + 'px',
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
    nextTick(() => {
      updateDropdownPosition()
      searchRef.value?.focus()
    })
  }
}

const close = () => { open.value = false }
const select = (item) => { emit('update:modelValue', item.id); close() }
const selectNull = () => { emit('update:modelValue', ''); close() }

const onClickOutside = (e) => {
  if (
    wrapRef.value && !wrapRef.value.contains(e.target) &&
    dropdownRef.value && !dropdownRef.value.contains(e.target)
  ) {
    close()
  }
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
.pos-select-wrap { position: relative; width: 100%; }
.pos-select-trigger {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; height: 38px; border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: 8px; background: white; cursor: pointer; font-size: 14px;
  color: #94a3b8; transition: border-color .15s, box-shadow .15s; user-select: none;
}
.pos-select-trigger.has-value { color: var(--text-primary, #1e293b); }
.pos-select-trigger:hover, .pos-select-trigger.open { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.pos-select-arrow { width: 16px; height: 16px; transition: transform .2s; flex-shrink: 0; color: #94a3b8; }
.pos-select-arrow.rotated { transform: rotate(180deg); }
</style>

<style>
.pos-select-dropdown {
  background: white; border: 1.5px solid #e2e8f0; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15); overflow: hidden; min-width: 240px;
}
.pos-select-search {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-bottom: 1px solid #f1f5f9;
}
.pos-search-input { flex: 1; border: none; outline: none; font-size: 13px; background: transparent; color: #1e293b; }
.pos-select-options { max-height: 220px; overflow-y: auto; }
.pos-select-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px; cursor: pointer; font-size: 13.5px; transition: background .12s;
}
.pos-select-option:hover { background: #f8fafc; }
.pos-select-option.selected { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.pos-select-empty { padding: 10px 14px; font-size: 13px; color: #94a3b8; }
.pos-main { display: flex; gap: 8px; align-items: center; }
</style>
