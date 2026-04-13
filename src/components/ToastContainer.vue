<template>
  <teleport to="body">
    <div class="toast-container">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
      >
        <span>{{ typeIcon(toast.type) }}</span>
        <span>{{ toast.message }}</span>
        <button @click="toastStore.remove(toast.id)" style="margin-left:auto;background:none;border:none;cursor:pointer;color:inherit;font-size:16px;">✕</button>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { useToastStore } from '@/stores/toast'
const toastStore = useToastStore()
const typeIcon = (type) => ({ success: '✅', error: '❌', warning: '⚠️' })[type] || 'ℹ️'
</script>
