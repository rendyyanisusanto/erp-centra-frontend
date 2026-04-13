<template>
  <div>
    <div class="page-header">
      <div>
        <div class="page-title">Stock Movements</div>
        <div class="page-subtitle">Track all raw material stock changes</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input class="form-control" v-model="search" placeholder="Search item, note, or type..." @input="debouncedFetch" />
        </div>
        <select class="form-control" v-model="filterRefType" @change="fetchItems" style="width:170px">
          <option value="">Semua Jeniss</option>
          <option value="PURCHASE">Purchase</option>
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="OPENING_BALANCE">Opening Balance</option>
        </select>
        <input class="form-control" type="date" v-model="dateDari" @change="fetchItems" style="width:150px" />
        <input class="form-control" type="date" v-model="dateSampai" @change="fetchItems" style="width:150px" />
      </div>
      <div class="table-wrapper"><table>
        <thead><tr>
          <th>Tanggal</th><th>Jenis</th><th>Item</th><th>Reference</th><th>Qty In</th><th>Qty Out</th><th>Note</th>
        </tr></thead>
        <tbody>
          <template v-if="loading">
            <tr class="skeleton-row" v-for="i in 5" :key="i"><td v-for="j in 7" :key="j"><div class="skeleton-cell"></div></td></tr>
          </template>
          <template v-else-if="items.length===0">
            <tr><td colspan="7">
              <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>No stock movements found</h3>
                <p>Stock movements are recorded automatically from goods receipts, stock adjustments, and raw material creation.</p>
              </div>
            </td></tr>
          </template>
          <tr v-else v-for="item in items" :key="item.id">
            <td>{{ formatDate(item.transaction_date) }}</td>
            <td><span class="badge" :class="badgeClass(item.reference_type)">{{ item.reference_type }}</span></td>
            <td class="fw-600">{{ item.item_name }}</td>
            <td><span class="badge badge-neutral">{{ item.item_type }}</span></td>
            <td :class="Number(item.qty_in) > 0 ? 'text-success fw-600' : 'text-muted'">
              {{ Number(item.qty_in) > 0 ? '+' + fmtQty(item.qty_in) : '-' }}
            </td>
            <td :class="Number(item.qty_out) > 0 ? 'text-danger fw-600' : 'text-muted'">
              {{ Number(item.qty_out) > 0 ? '-' + fmtQty(item.qty_out) : '-' }}
            </td>
            <td class="text-muted">{{ item.note || '-' }}</td>
          </tr>
        </tbody>
      </table></div>
      <div class="pagination">
        <span class="pagination-info">Total: {{ total }}</span>
        <button class="page-btn" :disabled="page<=1" @click="changePage(page-1)">‹</button>
        <button class="page-btn" v-for="p in totalPages" :key="p" :class="{active:p===page}" @click="changePage(p)">{{ p }}</button>
        <button class="page-btn" :disabled="page>=totalPages" @click="changePage(page+1)">›</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'

const auth = useAuthStore()
const toast = useToastStore()
const items = ref([])
const total = ref(0)
const page = ref(1)
const limit = ref(15)
const search = ref('')
const dateDari = ref('')
const dateSampai = ref('')
const filterRefType = ref('')
const loading = ref(false)

const totalPages = computed(() => Math.ceil(total.value / limit.value) || 1)

let dt
const debouncedFetch = () => { clearTimeout(dt); dt = setTimeout(() => { page.value = 1; fetchItems() }, 300) }

const fetchItems = async () => {
  loading.value = true
  try {
    const r = await api.get('/inventory/stock-movements', {
      params: {
        page: page.value,
        limit: limit.value,
        search: search.value,
        reference_type: filterRefType.value,
        date_from: dateDari.value,
        date_to: dateSampai.value,
      }
    })
    items.value = r.data.data.data
    total.value = r.data.data.total
  } catch (e) {
    toast.error('Gagal memuat mutasi stok')
  } finally {
    loading.value = false
  }
}

const changePage = (p) => { page.value = p; fetchItems() }

const formatDate = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
}

const fmtQty = (n) => Number(n || 0).toLocaleString('id-ID')

const badgeClass = (type) => {
  const map = {
    'PURCHASE': 'badge-success',
    'ADJUSTMENT': 'badge-warning',
    'OPENING_BALANCE': 'badge-info',
    'SALES': 'badge-danger',
    'ISSUE': 'badge-neutral',
  }
  return map[type] || 'badge-neutral'
}

onMounted(() => { fetchItems() })
</script>

<style scoped>
.text-success { color: #27ae60; }
.text-danger { color: #e74c3c; }
.text-muted { color: #94a3b8; }
.badge-neutral { background: #e2e8f0; color: #475569; }
</style>
