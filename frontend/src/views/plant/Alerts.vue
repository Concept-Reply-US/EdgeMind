<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/app'
import type { Anomaly } from '@/types'

const appStore = useAppStore()

const loading = ref(true)
const error = ref<string | null>(null)
const currentFilter = ref<'all' | 'critical' | 'warning' | 'info'>('all')
const cmmsConnected = ref(false)
const workOrders = ref<any[]>([])
let refreshInterval: number | null = null

type SeverityLevel = 'critical' | 'warning' | 'info'

function classifySeverity(anomaly: Anomaly): SeverityLevel {
  if (anomaly.severity === 'critical' || anomaly.severity === 'high') return 'critical'
  if (anomaly.severity === 'medium' || anomaly.severity === 'low') return 'warning'

  const text = (anomaly.description || '').toLowerCase()
  if (text.includes('critical') || text.includes('fault') || text.includes('emergency') || text.includes('alarm')) {
    return 'critical'
  }
  if (text.includes('warning') || text.includes('deviation') || text.includes('threshold') || text.includes('drop')) {
    return 'warning'
  }
  return 'info'
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return ''
  try {
    const d = new Date(timestamp)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}

const classifiedAnomalies = computed(() => {
  return appStore.anomalies.map(a => ({
    ...a,
    severity: classifySeverity(a)
  }))
})

const filteredAnomalies = computed(() => {
  if (currentFilter.value === 'all') return classifiedAnomalies.value
  return classifiedAnomalies.value.filter(a => a.severity === currentFilter.value)
})

const sortedAnomalies = computed(() => {
  return [...filteredAnomalies.value].sort((a, b) => {
    const ta = new Date(a.timestamp || 0).getTime()
    const tb = new Date(b.timestamp || 0).getTime()
    return tb - ta
  })
})

function setFilter(filter: 'all' | 'critical' | 'warning' | 'info'): void {
  currentFilter.value = filter
}

function getStatusClass(status: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'open' || s === 'new' || s === 'pending') return 'open'
  if (s === 'in progress' || s === 'in_progress' || s === 'active') return 'in-progress'
  if (s === 'completed' || s === 'done' || s === 'closed') return 'completed'
  return 'open'
}

async function fetchWorkOrders(): Promise<void> {
  try {
    // Check CMMS health
    const healthRes = await fetch('/api/cmms/health')
    if (healthRes.ok) {
      const health = await healthRes.json()
      cmmsConnected.value = health.enabled && health.healthy
    } else {
      cmmsConnected.value = false
    }

    if (!cmmsConnected.value) {
      workOrders.value = []
      return
    }

    // Fetch work orders
    const res = await fetch('/api/cmms/work-orders?limit=20')
    if (res.ok) {
      const data = await res.json()
      workOrders.value = data.workOrders || []
    }
  } catch (err) {
    console.error('Work orders fetch error:', err)
    cmmsConnected.value = false
    workOrders.value = []
  }
}

async function fetchAndRender(): Promise<void> {
  try {
    error.value = null
    if (workOrders.value.length === 0) {
      loading.value = true
    }

    await fetchWorkOrders()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load alerts data'
    console.error('Alerts fetch error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAndRender()
  refreshInterval = window.setInterval(fetchAndRender, 30000)
})

onBeforeUnmount(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})
</script>

<template>
  <div class="alerts-view">
    <div class="alerts-layout">
      <!-- Alerts Section -->
      <div class="alerts-section">
        <div class="section-title">Active Alerts</div>

        <!-- Filter Buttons -->
        <div class="filter-btn-group">
          <button
            class="filter-btn"
            :class="{ active: currentFilter === 'all' }"
            @click="setFilter('all')"
          >
            All
          </button>
          <button
            class="filter-btn"
            :class="{ active: currentFilter === 'critical' }"
            @click="setFilter('critical')"
          >
            Critical
          </button>
          <button
            class="filter-btn"
            :class="{ active: currentFilter === 'warning' }"
            @click="setFilter('warning')"
          >
            Warning
          </button>
          <button
            class="filter-btn"
            :class="{ active: currentFilter === 'info' }"
            @click="setFilter('info')"
          >
            Info
          </button>
        </div>

        <div v-if="sortedAnomalies.length === 0" class="view-loading">
          No {{ currentFilter === 'all' ? '' : currentFilter + ' ' }}alerts
        </div>

        <div v-else class="alerts-list">
          <div
            v-for="(alert, idx) in sortedAnomalies"
            :key="alert.id || idx"
            class="alert-card"
            :class="`alert-${alert.severity}`"
          >
            <div class="alert-card-header">
              <span class="severity-badge" :class="`severity-${alert.severity}`">
                {{ alert.severity.toUpperCase() }}
              </span>
              <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
            </div>
            <div class="alert-description">
              {{ alert.description || 'Unknown alert' }}
            </div>
            <span v-if="alert.enterprise" class="alert-enterprise">
              {{ alert.enterprise }}
            </span>
          </div>
        </div>
      </div>

      <!-- Work Orders Section -->
      <div class="work-orders-section">
        <div class="section-title">CMMS Work Orders</div>

        <div v-if="!cmmsConnected" class="cmms-disconnected">
          <div class="cmms-disconnected-icon">&#9888;</div>
          <div class="cmms-disconnected-title">CMMS Not Connected</div>
          <div class="cmms-disconnected-text">
            Work order integration is not available. Configure CMMS provider to enable.
          </div>
        </div>

        <div v-else-if="workOrders.length === 0" class="view-loading">
          No work orders found
        </div>

        <div v-else class="work-orders-list">
          <div
            v-for="(wo, idx) in workOrders"
            :key="wo.id || idx"
            class="work-order-card"
          >
            <div class="work-order-header">
              <span class="work-order-title">
                {{ wo.title || wo.description || 'Untitled' }}
              </span>
              <span class="wo-status-badge" :class="`wo-status-${getStatusClass(wo.status)}`">
                {{ wo.status || 'Unknown' }}
              </span>
            </div>
            <div class="work-order-meta">
              <span class="wo-priority">Priority: {{ wo.priority || 'Normal' }}</span>
              <span v-if="wo.assignee" class="wo-assignee">Assigned: {{ wo.assignee }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alerts-view {
  height: 100%;
  overflow-y: auto;
}

.view-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  color: var(--text-dim);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
}

.alerts-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 0 20px 20px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ccc;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-btn-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.filter-btn {
  padding: 4px 12px;
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

.alerts-list,
.work-orders-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  padding: 14px;
  transition: all 0.3s ease;
}

.alert-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.alert-critical {
  border-left: 3px solid #ef4444;
}

.alert-warning {
  border-left: 3px solid #f59e0b;
}

.alert-info {
  border-left: 3px solid #3b82f6;
}

.alert-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.severity-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.severity-critical {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}

.severity-warning {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
}

.severity-info {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.alert-time {
  font-size: 0.75rem;
  color: #666;
}

.alert-description {
  font-size: 0.85rem;
  color: #ccc;
  line-height: 1.4;
}

.alert-enterprise {
  display: inline-block;
  font-size: 0.7rem;
  color: #777;
  margin-top: 6px;
}

.work-order-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  padding: 14px;
  transition: all 0.3s ease;
}

.work-order-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.work-order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.work-order-title {
  font-size: 0.85rem;
  font-weight: 500;
  color: #ddd;
  line-height: 1.3;
}

.wo-status-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.wo-status-open {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
}

.wo-status-in-progress {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.wo-status-completed {
  color: #10b981;
  background: rgba(16, 185, 129, 0.15);
}

.work-order-meta {
  display: flex;
  gap: 16px;
  font-size: 0.75rem;
  color: #777;
}

.cmms-disconnected {
  text-align: center;
  padding: 40px 20px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 12px;
}

.cmms-disconnected-icon {
  font-size: 2rem;
  color: #f59e0b;
  margin-bottom: 12px;
}

.cmms-disconnected-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ccc;
  margin-bottom: 6px;
}

.cmms-disconnected-text {
  font-size: 0.8rem;
  color: #777;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .alerts-layout {
    grid-template-columns: 1fr;
  }

  .filter-btn-group {
    flex-wrap: wrap;
  }
}
</style>
