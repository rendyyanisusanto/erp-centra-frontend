<template>
  <span class="badge" :class="badgeClass">{{ statusLabel }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { STATUS_LABEL_MAP } from '@/constants/ui-labels'

const props = defineProps({ status: { type: String, default: '' } })
const map = {
  PAID: 'badge-success', APPROVED: 'badge-success', RECEIVED: 'badge-success',
  ACTIVE: 'badge-success',
  PARTIAL: 'badge-warning',
  PENDING: 'badge-warning',
  UNPAID: 'badge-danger', REJECTED: 'badge-danger', OVERDUE: 'badge-danger', CANCELLED: 'badge-danger',
  OPEN: 'badge-info', DRAFT: 'badge-gray', CLOSED: 'badge-gray', INACTIVE: 'badge-gray',
}
const badgeClass = computed(() => map[props.status] || 'badge-gray')
const statusLabel = computed(() => STATUS_LABEL_MAP[props.status] || props.status)
</script>
