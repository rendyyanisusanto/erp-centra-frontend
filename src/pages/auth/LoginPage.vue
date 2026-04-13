<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <h1>🌿 Centra ERP</h1>
        <p>PT. Centra Agro Pratama — Sistem Internal</p>
      </div>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label required">Email</label>
          <input v-model="form.email" type="email" class="form-control" placeholder="admin@centra.com" required />
        </div>
        <div class="form-group">
          <label class="form-label required">Password</label>
          <input v-model="form.password" type="password" class="form-control" placeholder="••••••••" required />
        </div>
        <p class="form-error" v-if="error">{{ error }}</p>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>Login</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const form = ref({ email: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(form.value.email, form.value.password)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.message || 'Login gagal. Silakan periksa kembali email dan password.'
  } finally {
    loading.value = false
  }
}
</script>
