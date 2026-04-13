import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useMasterStore = defineStore('master', () => {
    const units = ref([])
    const products = ref([])
    const rawMaterials = ref([])
    const suppliers = ref([])
    const customers = ref([])
    const salesmen = ref([])
    const coa = ref([])

    async function fetchUnits() {
        const res = await api.get('/master/units', { params: { limit: 200 } })
        units.value = res.data.data?.data || []
    }
    async function fetchProducts() {
        const res = await api.get('/master/products', { params: { limit: 200 } })
        products.value = res.data.data?.data || []
    }
    async function fetchRawMaterials() {
        const res = await api.get('/master/raw-materials', { params: { limit: 200 } })
        rawMaterials.value = res.data.data?.data || []
    }
    async function fetchSuppliers() {
        const res = await api.get('/master/suppliers', { params: { limit: 200 } })
        suppliers.value = res.data.data?.data || []
    }
    async function fetchCustomers() {
        const res = await api.get('/master/customers', { params: { limit: 200 } })
        customers.value = res.data.data?.data || []
    }
    async function fetchSalesmen() {
        const res = await api.get('/master/salesmen', { params: { limit: 200, is_active: true } })
        salesmen.value = res.data.data?.data || []
    }
    async function fetchCOA() {
        const res = await api.get('/master/coa', { params: { limit: 200 } })
        coa.value = res.data.data?.data || []
    }

    return { units, products, rawMaterials, suppliers, customers, salesmen, coa, fetchUnits, fetchProducts, fetchRawMaterials, fetchSuppliers, fetchCustomers, fetchSalesmen, fetchCOA }
})
