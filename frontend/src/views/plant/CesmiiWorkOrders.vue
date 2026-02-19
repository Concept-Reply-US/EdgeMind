<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/app'
import type { CesmiiWorkOrder } from '@/types'

const appStore = useAppStore()

const loading = ref(true)
const error = ref<string | null>(null)
const stats = ref({
  received: 0,
  validated: 0,
  failed: 0,
  published: 0
})
const profiles = ref<any[]>([])
const demoStatus = ref({
  running: false,
  orderCount: 0
})
const expandedOrders = ref<Set<string>>(new Set())
const enterpriseFilter = ref<string>('ALL')
const historicalOrders = ref<CesmiiWorkOrder[]>([])

let statsInterval: number | null = null

const allWorkOrders = computed(() => {
  const realtimeOrders = appStore.cesmiiWorkOrders || []
  const combined = [...realtimeOrders, ...historicalOrders.value]

  // Deduplicate by id
  const seen = new Set<string>()
  const unique = combined.filter(wo => {
    if (seen.has(wo.id)) return false
    seen.add(wo.id)
    return true
  })

  return unique.sort((a, b) => {
    const ta = new Date(a.receivedAt || 0).getTime()
    const tb = new Date(b.receivedAt || 0).getTime()
    return tb - ta
  })
})

const filteredWorkOrders = computed(() => {
  if (enterpriseFilter.value === 'ALL') return allWorkOrders.value
  return allWorkOrders.value.filter(wo => wo.enterprise === enterpriseFilter.value)
})

function toggleExpanded(orderId: string): void {
  if (expandedOrders.value.has(orderId)) {
    expandedOrders.value.delete(orderId)
  } else {
    expandedOrders.value.add(orderId)
  }
}

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return 'Unknown'
  try {
    const d = new Date(timestamp)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return 'Invalid date'
  }
}

function getStatusClass(status?: string): string {
  const s = (status || '').toLowerCase()
  if (s.includes('validated') || s.includes('valid')) return 'validated'
  if (s.includes('failed') || s.includes('error')) return 'failed'
  if (s.includes('pending') || s.includes('processing')) return 'pending'
  return 'unknown'
}

function extractKeyFields(payload: Record<string, unknown> | undefined): Array<{ key: string, value: string }> {
  if (!payload) return []

  const priority = ['workOrderId', 'orderId', 'title', 'priority', 'status', 'type', 'description', 'assignee']
  const fields: Array<{ key: string, value: string }> = []

  for (const key of priority) {
    if (key in payload && payload[key] !== undefined && payload[key] !== null) {
      fields.push({
        key,
        value: String(payload[key])
      })
    }
  }

  // Add other fields
  for (const [key, value] of Object.entries(payload)) {
    if (!priority.includes(key) && value !== undefined && value !== null) {
      if (typeof value === 'object') {
        fields.push({ key, value: JSON.stringify(value, null, 2) })
      } else {
        fields.push({ key, value: String(value) })
      }
    }
  }

  return fields.slice(0, 10) // Limit to 10 fields
}

async function fetchStats(): Promise<void> {
  try {
    const res = await fetch('/api/cesmii/stats')
    if (res.ok) {
      const data = await res.json()
      stats.value = data
    }
  } catch (err) {
    console.error('CESMII stats fetch error:', err)
  }
}

async function fetchProfiles(): Promise<void> {
  try {
    const res = await fetch('/api/cesmii/profiles')
    if (res.ok) {
      const data = await res.json()
      profiles.value = data.profiles || []
    }
  } catch (err) {
    console.error('CESMII profiles fetch error:', err)
  }
}

async function fetchDemoStatus(): Promise<void> {
  try {
    const res = await fetch('/api/cesmii/demo/status')
    if (res.ok) {
      const data = await res.json()
      demoStatus.value = data
    }
  } catch (err) {
    console.error('CESMII demo status fetch error:', err)
  }
}

async function fetchHistoricalWorkOrders(): Promise<void> {
  try {
    const params = new URLSearchParams({ limit: '50' })
    if (enterpriseFilter.value !== 'ALL') {
      params.append('enterprise', enterpriseFilter.value)
    }

    const res = await fetch(`/api/cesmii/work-orders?${params}`)
    if (res.ok) {
      const data = await res.json()
      historicalOrders.value = data.workOrders || []
    }
  } catch (err) {
    console.error('CESMII work orders fetch error:', err)
  }
}

async function startDemo(): Promise<void> {
  try {
    const res = await fetch('/api/cesmii/demo/start', { method: 'POST' })
    if (res.ok) {
      await fetchDemoStatus()
    } else {
      const data = await res.json()
      console.error('Demo start failed:', data.error || 'Unknown error')
    }
  } catch (err) {
    console.error('Demo start error:', err)
  }
}

async function stopDemo(): Promise<void> {
  try {
    const res = await fetch('/api/cesmii/demo/stop', { method: 'POST' })
    if (res.ok) {
      await fetchDemoStatus()
    }
  } catch (err) {
    console.error('Demo stop error:', err)
  }
}

async function fetchAll(): Promise<void> {
  try {
    error.value = null
    if (allWorkOrders.value.length === 0) {
      loading.value = true
    }

    await Promise.all([
      fetchStats(),
      fetchProfiles(),
      fetchDemoStatus(),
      fetchHistoricalWorkOrders()
    ])
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load CESMII data'
    console.error('CESMII fetch error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAll()
  statsInterval = window.setInterval(fetchStats, 30000)
})

onBeforeUnmount(() => {
  if (statsInterval) {
    clearInterval(statsInterval)
    statsInterval = null
  }
})
</script>

<template>
  <div class="cesmii-view">
    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-label">Received</div>
        <div class="stat-value">{{ stats.received }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Validated</div>
        <div class="stat-value validated">{{ stats.validated }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Failed</div>
        <div class="stat-value failed">{{ stats.failed }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Published</div>
        <div class="stat-value">{{ stats.published }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">SM Profiles</div>
        <div class="stat-value">{{ profiles.length }}</div>
      </div>
    </div>

    <!-- Demo Controls -->
    <div class="demo-controls">
      <div class="demo-status">
        <div class="status-indicator" :class="{ running: demoStatus.running }"></div>
        <span class="status-text">
          {{ demoStatus.running ? 'Demo Running' : 'Demo Stopped' }}
        </span>
        <span v-if="demoStatus.running" class="order-count">
          ({{ demoStatus.orderCount }} orders published)
        </span>
      </div>
      <div class="demo-buttons">
        <button
          class="demo-btn start-btn"
          :disabled="demoStatus.running"
          @click="startDemo"
        >
          Start Demo
        </button>
        <button
          class="demo-btn stop-btn"
          :disabled="!demoStatus.running"
          @click="stopDemo"
        >
          Stop Demo
        </button>
      </div>
    </div>

    <!-- Enterprise Filter -->
    <div class="filter-controls">
      <div class="filter-label">Filter by Enterprise:</div>
      <div class="filter-buttons">
        <button
          class="filter-btn"
          :class="{ active: enterpriseFilter === 'ALL' }"
          @click="enterpriseFilter = 'ALL'; fetchHistoricalWorkOrders()"
        >
          All
        </button>
        <button
          class="filter-btn"
          :class="{ active: enterpriseFilter === 'Enterprise A' }"
          @click="enterpriseFilter = 'Enterprise A'; fetchHistoricalWorkOrders()"
        >
          Enterprise A
        </button>
        <button
          class="filter-btn"
          :class="{ active: enterpriseFilter === 'Enterprise B' }"
          @click="enterpriseFilter = 'Enterprise B'; fetchHistoricalWorkOrders()"
        >
          Enterprise B
        </button>
        <button
          class="filter-btn"
          :class="{ active: enterpriseFilter === 'Enterprise C' }"
          @click="enterpriseFilter = 'Enterprise C'; fetchHistoricalWorkOrders()"
        >
          Enterprise C
        </button>
      </div>
    </div>

    <!-- Work Orders List -->
    <div class="work-orders-container">
      <div v-if="loading" class="view-loading">
        Loading CESMII work orders...
      </div>

      <div v-else-if="error" class="view-error">
        {{ error }}
      </div>

      <div v-else-if="filteredWorkOrders.length === 0" class="view-empty">
        No CESMII work orders received yet
      </div>

      <div v-else class="work-orders-list">
        <div
          v-for="order in filteredWorkOrders"
          :key="order.id"
          class="work-order-card"
          :class="{ expanded: expandedOrders.has(order.id) }"
        >
          <div class="work-order-header" @click="toggleExpanded(order.id)">
            <div class="header-left">
              <span class="profile-badge">{{ order.type || 'Unknown Profile' }}</span>
              <span v-if="order.enterprise" class="enterprise-tag">{{ order.enterprise }}</span>
              <span v-if="order.site" class="site-tag">{{ order.site }}</span>
            </div>
            <div class="header-right">
              <span class="timestamp">{{ formatTimestamp(order.receivedAt) }}</span>
              <span v-if="order.status" class="status-badge" :class="`status-${getStatusClass(order.status)}`">
                {{ order.status }}
              </span>
              <button class="expand-btn" :class="{ expanded: expandedOrders.has(order.id) }">
                ▼
              </button>
            </div>
          </div>

          <div class="work-order-body">
            <div class="key-fields">
              <div
                v-for="field in extractKeyFields(order.payload)"
                :key="field.key"
                class="field-row"
              >
                <span class="field-key">{{ field.key }}:</span>
                <span class="field-value">{{ field.value }}</span>
              </div>
            </div>

            <div v-if="expandedOrders.has(order.id)" class="raw-json">
              <div class="raw-json-header">Raw JSON Payload:</div>
              <pre class="json-content">{{ JSON.stringify(order.payload, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cesmii-view {
  height: 100%;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.view-loading,
.view-error,
.view-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--text-dim);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
}

.view-error {
  color: var(--accent-red);
}

/* Stats Bar */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 20px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 16px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 0.7rem;
  color: #777;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'Share Tech Mono', monospace;
  color: var(--accent-cyan);
}

.stat-value.validated {
  color: var(--accent-green);
}

.stat-value.failed {
  color: var(--accent-red);
}

/* Demo Controls */
.demo-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.demo-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #666;
  transition: all 0.3s ease;
}

.status-indicator.running {
  background: var(--accent-green);
  box-shadow: 0 0 10px var(--accent-green);
  animation: pulse-dot 2s ease-in-out infinite;
}

.status-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: #ccc;
}

.order-count {
  font-size: 0.75rem;
  color: #777;
  font-family: 'Share Tech Mono', monospace;
}

.demo-buttons {
  display: flex;
  gap: 10px;
}

.demo-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  color: #ccc;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.demo-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.start-btn:not(:disabled):hover {
  background: rgba(0, 255, 136, 0.15);
  border-color: var(--accent-green);
  color: var(--accent-green);
}

.stop-btn:not(:disabled):hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: var(--accent-red);
  color: var(--accent-red);
}

/* Filter Controls */
.filter-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-label {
  font-size: 0.8rem;
  color: #999;
  font-weight: 600;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  color: #999;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: var(--persona-color, var(--accent-green));
  color: #ccc;
}

.filter-btn.active {
  background: rgba(0, 255, 136, 0.15);
  border-color: var(--persona-color, var(--accent-green));
  color: var(--persona-color, var(--accent-green));
}

/* Work Orders List */
.work-orders-container {
  min-height: 300px;
}

.work-orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.work-order-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  overflow: hidden;
  transition: all 0.3s ease;
}

.work-order-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.work-order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
}

.work-order-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(0, 255, 255, 0.15);
  color: var(--accent-cyan);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'Share Tech Mono', monospace;
}

.enterprise-tag,
.site-tag {
  font-size: 0.7rem;
  color: #999;
  padding: 2px 8px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
}

.timestamp {
  font-size: 0.7rem;
  color: #666;
  font-family: 'Share Tech Mono', monospace;
}

.status-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-validated {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-green);
}

.status-failed {
  background: rgba(239, 68, 68, 0.15);
  color: var(--accent-red);
}

.status-pending {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.status-unknown {
  background: rgba(100, 100, 100, 0.15);
  color: #999;
}

.expand-btn {
  background: none;
  border: none;
  color: #777;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
  transform: rotate(0deg);
}

.expand-btn.expanded {
  transform: rotate(180deg);
}

.expand-btn:hover {
  color: var(--accent-cyan);
}

.work-order-body {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding: 14px;
}

.key-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-row {
  display: flex;
  gap: 10px;
  font-size: 0.8rem;
  line-height: 1.4;
}

.field-key {
  color: #888;
  font-weight: 600;
  min-width: 120px;
  flex-shrink: 0;
}

.field-value {
  color: #ccc;
  font-family: 'Share Tech Mono', monospace;
  word-break: break-word;
}

.raw-json {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.raw-json-header {
  font-size: 0.75rem;
  color: #888;
  font-weight: 600;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.json-content {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 12px;
  font-size: 0.75rem;
  color: #aaa;
  overflow-x: auto;
  font-family: 'Share Tech Mono', monospace;
  line-height: 1.6;
  max-height: 400px;
  overflow-y: auto;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@media (max-width: 1024px) {
  .stats-bar {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .demo-controls {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .filter-controls {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-buttons {
    flex-wrap: wrap;
  }
}
</style>
