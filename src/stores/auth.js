import { defineStore } from 'pinia'
import api from '@/services/api'

const safeJSON = (key, fallback) => {
    try {
        const val = localStorage.getItem(key)
        if (val === null || val === 'undefined') return fallback
        return JSON.parse(val) ?? fallback
    } catch {
        return fallback
    }
}

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: localStorage.getItem('token') || null,
        user: safeJSON('user', null),
        permissions: safeJSON('permissions', []),
        profileSynced: false,
    }),
    getters: {
        isAuthenticated: (s) => !!s.token,
        can: (s) => (permission) => {
            if (s.permissions.includes(permission)) return true

            // Backward compatibility for old permission keys still stored in DB/session
            if (s.permissions.includes('report.view') && permission.startsWith('report.')) return true
            if (s.permissions.includes('inventory.read') && ['stock-adjustment.read', 'stock-movement.read'].includes(permission)) return true
            if (s.permissions.includes('inventory.create') && permission === 'stock-adjustment.create') return true

            return false
        },
    },
    actions: {
        async login(email, password) {
            const res = await api.post('/auth/login', { email, password })
            const { token, user } = res.data.data
            this.token = token
            this.user = user
            this.permissions = user.permissions || []
            this.profileSynced = true
            localStorage.setItem('token', token)
            localStorage.setItem('user', JSON.stringify(user))
            localStorage.setItem('permissions', JSON.stringify(this.permissions))
        },
        async syncProfile() {
            if (!this.token) return
            const res = await api.get('/auth/profile')
            const profile = res.data?.data || {}
            this.user = {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                role: profile.role,
            }
            this.permissions = profile.permissions || []
            this.profileSynced = true
            localStorage.setItem('user', JSON.stringify(this.user))
            localStorage.setItem('permissions', JSON.stringify(this.permissions))
        },
        logout() {
            this.token = null
            this.user = null
            this.permissions = []
            this.profileSynced = false
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('permissions')
        },
    },
})
