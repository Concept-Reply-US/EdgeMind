<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/app'
import { useEquipment } from '@/composables/useEquipment'

const appStore = useAppStore()
const { fetchEquipmentStates } = useEquipment()

const loading = ref(true)
const error = ref<string | null>(null)
const currentFilter = ref<'all' | 'running' | 'stopped' | 'faulted'>('all')
let refreshInterval: number | null = null

type StateCategory = 'running' | 'stopped' | 'faulted'

interface EquipmentSummary {
  running: number
  stopped: number
  faulted: number
  total: number
}

function classifyState(stateName: string): StateCategory {
  const name = (stateName || '').toLowerCase()
  if (name === 'running' || name === 'execute') return 'running'
  if (name === 'fault' || name === 'faulted') return 'faulted'
  return 'stopped'
}

function getStateLabel(stateName: string): string {
  const name = (stateName || '').toLowerCase()
  if (name === 'running' || name === 'execute') return 'Running'
  if (name === 'fault' || name === 'faulted') return 'Faulted'
  if (name === 'down') return 'Down'
  if (name === 'idle' || name === 'standby') return 'Idle'
  if (name === 'stopped' || name === 'aborted') return 'Stopped'
  return stateName || 'Unknown'
}

const allEquipment = computed(() => {
  return Array.from(appStore.equipmentStates.values())
})

const summary = computed<EquipmentSummary>(() => {
  const counts: EquipmentSummary = { running: 0, stopped: 0, faulted: 0, total: 0 }

  allEquipment.value.forEach(eq => {
    counts.total++
    const cls = classifyState(eq.state)
    if (cls === 'running') counts.running++
    else if (cls === 'faulted') counts.faulted++
    else counts.stopped++
  })

  return counts
})

const filteredEquipment = computed(() => {
  if (currentFilter.value === 'all') return allEquipment.value
  return allEquipment.value.filter(eq => classifyState(eq.state) === currentFilter.value)
})

function setFilter(filter: 'all' | 'running' | 'stopped' | 'faulted'): void {
  currentFilter.value = filter
}

async function fetchAndRender(): Promise<void> {
  try {
    error.value = null
    if (allEquipment.value.length === 0) {
      loading.value = true
    }

    await fetchEquipmentStates()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load equipment data'
    console.error('Equipment health fetch error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAndRender()
  refreshInterval = window.setInterval(fetchAndRender, 15000)
})

onBeforeUnmount(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})
</script>

<template>
  <div class="equipment-view">
    <!-- Summary Bar -->
    <div class="equipment-summary-bar">
      <div class="equipment-stat">
        <div class="equipment-stat-value">{{ summary.total }}</div>
        <div class="equipment-stat-label">Total</div>
      </div>
      <div class="equipment-stat">
        <div class="equipment-stat-icon" style="color: #10b981;">&#9679;</div>
        <div class="equipment-stat-value" style="color: #10b981;">{{ summary.running }}</div>
        <div class="equipment-stat-label">Running</div>
      </div>
      <div class="equipment-stat">
        <div class="equipment-stat-icon" style="color: #f59e0b;">&#9679;</div>
        <div class="equipment-stat-value" style="color: #f59e0b;">{{ summary.stopped }}</div>
        <div class="equipment-stat-label">Stopped</div>
      </div>
      <div class="equipment-stat">
        <div class="equipment-stat-icon" style="color: #ef4444;">&#9679;</div>
        <div class="equipment-stat-value" style="color: #ef4444;">{{ summary.faulted }}</div>
        <div class="equipment-stat-label">Faulted</div>
      </div>
    </div>

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
        :class="{ active: currentFilter === 'running' }"
        @click="setFilter('running')"
      >
        Running
      </button>
      <button
        class="filter-btn"
        :class="{ active: currentFilter === 'stopped' }"
        @click="setFilter('stopped')"
      >
        Stopped
      </button>
      <button
        class="filter-btn"
        :class="{ active: currentFilter === 'faulted' }"
        @click="setFilter('faulted')"
      >
        Faulted
      </button>
    </div>

    <!-- Equipment Grid -->
    <div v-if="loading && allEquipment.length === 0" class="view-loading">
      Loading equipment data...
    </div>

    <div v-else-if="error && allEquipment.length === 0" class="view-error">
      {{ error }}
    </div>

    <div v-else-if="filteredEquipment.length === 0" class="view-loading">
      No {{ currentFilter === 'all' ? '' : currentFilter + ' ' }}equipment found
    </div>

    <div v-else class="equipment-grid">
      <div
        v-for="equipment in filteredEquipment"
        :key="equipment.id"
        class="equipment-card"
        :class="`equipment-state-${classifyState(equipment.state)}`"
      >
        <div class="equipment-card-header">
          <div class="equipment-card-name">{{ equipment.name || 'Unknown' }}</div>
          <span class="state-badge" :class="`state-${classifyState(equipment.state)}`">
            <span class="state-dot"></span>
            {{ getStateLabel(equipment.state) }}
          </span>
        </div>

        <div class="equipment-card-meta">
          <span class="equipment-card-site">{{ equipment.site || '' }}</span>
          <span class="equipment-card-enterprise">{{ equipment.enterprise || '' }}</span>
        </div>

        <div v-if="equipment.reason" class="equipment-card-reason">
          {{ equipment.reason }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.equipment-view {
  height: 100%;
  overflow-y: auto;
}

.view-loading,
.view-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--text-dim);
  font-family: 'Share Tech Mono', monospace;
}

.view-error {
  color: var(--accent-red);
}

.equipment-summary-bar {
  display: flex;
  justify-content: center;
  gap: 32px;
  padding: 16px 20px;
  margin: 0 20px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.equipment-stat {
  text-align: center;
}

.equipment-stat-icon {
  font-size: 0.7rem;
  margin-bottom: 2px;
}

.equipment-stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #eee;
  line-height: 1;
  font-family: 'Orbitron', sans-serif;
}

.equipment-stat-label {
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.filter-btn-group {
  display: flex;
  gap: 8px;
  padding: 8px 20px;
}

.filter-btn {
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  color: #999;
  font-size: 0.8rem;
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

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  padding: 0 20px 20px;
}

.equipment-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  padding: 16px;
  transition: all 0.3s ease;
}

.equipment-card:hover {
  border-color: var(--persona-color, var(--accent-green));
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.1);
}

.equipment-state-faulted {
  border-color: rgba(239, 68, 68, 0.3);
}

.equipment-state-faulted:hover {
  border-color: #ef4444;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
}

.equipment-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.equipment-card-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #eee;
}

.state-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.state-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.state-running {
  color: #10b981;
  background: rgba(16, 185, 129, 0.15);
}

.state-running .state-dot {
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}

.state-stopped {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
}

.state-stopped .state-dot {
  background: #f59e0b;
}

.state-faulted {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}

.state-faulted .state-dot {
  background: #ef4444;
  box-shadow: 0 0 6px #ef4444;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.equipment-card-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.equipment-card-site,
.equipment-card-enterprise {
  font-size: 0.75rem;
  color: #777;
}

.equipment-card-reason {
  font-size: 0.8rem;
  color: #f59e0b;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

@media (max-width: 768px) {
  .equipment-summary-bar {
    gap: 16px;
  }

  .equipment-grid {
    grid-template-columns: 1fr;
  }

  .filter-btn-group {
    flex-wrap: wrap;
  }
}
</style>
