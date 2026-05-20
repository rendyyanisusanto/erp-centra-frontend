<template>
  <select class="form-control" :value="modelValue" @change="$emit('update:modelValue', normalizeVal($event.target.value))" :disabled="disabled">
    <option value="">-- Pilih Satuan --</option>
    <option v-for="c in conversions" :key="c.id" :value="c.unit_id">
      {{ c.unit?.name }} (x{{ Number(c.conversion_qty || 0).toLocaleString('id-ID') }})
    </option>
  </select>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '@/services/api'

const props = defineProps({
  modelValue: { type: [Number, String], default: '' },
  itemType: { type: String, required: true },
  itemId: { type: [Number, String], default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'conversion-change'])
const conversions = ref([])

const normalizeVal = (v) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : ''
}

const load = async () => {
  if (!props.itemId) {
    conversions.value = []
    emit('conversion-change', null)
    return
  }
  try {
    const r = await api.get('/master/item-unit-conversions', { params: { item_type: props.itemType, item_id: props.itemId } })
    conversions.value = r.data.data || []
    const selected = conversions.value.find(c => Number(c.unit_id) === Number(props.modelValue))
      || conversions.value.find(c => Number(c.is_base) === 1)
      || conversions.value[0]
    if (selected) {
      if (!props.modelValue || Number(props.modelValue) !== Number(selected.unit_id)) emit('update:modelValue', selected.unit_id)
      emit('conversion-change', selected)
    }
  } catch {
    conversions.value = []
    emit('conversion-change', null)
  }
}

watch(() => [props.itemType, props.itemId], load, { immediate: true })
watch(() => props.modelValue, () => {
  const selected = conversions.value.find(c => Number(c.unit_id) === Number(props.modelValue)) || null
  emit('conversion-change', selected)
})
</script>
