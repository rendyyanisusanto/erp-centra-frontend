<template>
  <teleport to="body">
    <div class="modal-overlay" @click.self="$emit('cancel')">
      <div class="modal-box" style="max-width:400px">
        <div class="modal-header">
          <h3 class="modal-title">⚠️ {{ title || 'Konfirmasi' }}</h3>
          <button class="modal-close" @click="$emit('cancel')">✕</button>
        </div>
        <div class="modal-body">
          <p>{{ message || 'Apakah Anda yakin ingin melanjutkan aksi ini?' }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('cancel')">{{ cancelText || 'Batal' }}</button>
          <button class="btn" :class="confirmButtonClass || 'btn-danger'" :disabled="loading" @click="$emit('confirm')">
            <span v-if="loading" class="spinner"></span>
            <span v-else>{{ confirmText || 'Hapus' }}</span>
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
defineProps({
  title: String,
  message: String,
  loading: Boolean,
  confirmText: String,
  cancelText: String,
  confirmButtonClass: String,
})
defineEmits(['confirm', 'cancel'])
</script>
