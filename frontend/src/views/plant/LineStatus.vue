<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/app'
import { useOEE } from '@/composables/useOEE'
import { useEquipment } from '@/composables/useEquipment'
import type { LineOEE, EquipmentState } from '@/types'

const appStore = useAppStore()
const { fetchLineOEE } = useOEE()
const { fetchEquipmentStates } = useEquipment()

const lines = ref<LineOEE[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
let refreshInterval: number | null = null

interface EquipmentCounts {
  running: number
  stopped: number
  faulted: number
  total: number
}

function getOeeClass(value: number): string {
  if (value >= 85) return 'oee-green'
  if (value >= 70) return 'oee-amber'
  return 'oee-red'
}

function countEquipmentForSite(enterprise: string, site: string): EquipmentCounts {
  const counts: EquipmentCounts = { running: 0, stopped: 0, faulted: 0, total: 0 }

  appStore.equipmentStates.forEach((equipment: EquipmentState) => {
    if (equipment.enterprise !== enterprise) return
    if (equipment.site !== site) return

    counts.total++
    const stateName = (equipment.state || '').toLowerCase()

    if (stateName === 'running' || stateName === 'execute') {
      counts.running++
    } else if (stateName === 'fault' || stateName === 'faulted') {
      counts.faulted++
    } else {
      counts.stopped++
    }
  })

  return counts
}

async function fetchAndRender(): Promise<void> {
  try {
    error.value = null
    if (lines.value.length === 0) {
      loading.value = true
    }

    const [linesData] = await Promise.all([
      fetchLineOEE(),
      fetchEquipmentStates()
    ])

    if (linesData?.lines) {
      lines.value = [...linesData.lines].sort((a, b) => (b.oee ?? 0) - (a.oee ?? 0))
    } else {
      lines.value = []
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load line data'
    console.error('Line status fetch error:', err)
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
  <div class="line-status-view">
    <div v-if="loading && lines.length === 0" class="view-loading">
      Loading line status...
    </div>

    <div v-else-if="error && lines.length === 0" class="view-error">
      {{ error }}
    </div>

    <div v-else-if="lines.length === 0" class="view-loading">
      No line data available
    </div>

    <div v-else class="line-status-grid">
      <div
        v-for="line in lines"
        :key="`${line.enterprise}-${line.site}-${line.line}`"
        class="line-status-card"
      >
        <div class="line-card-header">
          <div class="line-card-name">{{ line.site || 'Unknown' }}</div>
          <div class="line-card-enterprise">{{ line.enterprise || '' }}</div>
        </div>

        <div class="line-oee-value" :class="getOeeClass(line.oee ?? 0)">
          {{ (line.oee ?? 0).toFixed(1) }}<span class="oee-unit">%</span>
        </div>
        <div class="line-oee-label">OEE</div>

        <div class="line-equipment-counts">
          <span
            class="equip-count equip-running"
            :title="`Running: ${countEquipmentForSite(line.enterprise, line.site).running}`"
          >
            {{ countEquipmentForSite(line.enterprise, line.site).running }}
          </span>
          <span
            class="equip-count equip-stopped"
            :title="`Stopped: ${countEquipmentForSite(line.enterprise, line.site).stopped}`"
          >
            {{ countEquipmentForSite(line.enterprise, line.site).stopped }}
          </span>
          <span
            class="equip-count equip-faulted"
            :title="`Faulted: ${countEquipmentForSite(line.enterprise, line.site).faulted}`"
          >
            {{ countEquipmentForSite(line.enterprise, line.site).faulted }}
          </span>
        </div>

        <div class="line-apq-bars">
          <div class="apq-bar-row">
            <span class="apq-label">A</span>
            <div class="apq-bar-track">
              <div
                class="apq-bar-fill apq-availability"
                :style="{ width: Math.min(100, line.availability ?? 0) + '%' }"
              ></div>
            </div>
            <span class="apq-value">{{ (line.availability ?? 0).toFixed(0) }}%</span>
          </div>
          <div class="apq-bar-row">
            <span class="apq-label">P</span>
            <div class="apq-bar-track">
              <div
                class="apq-bar-fill apq-performance"
                :style="{ width: Math.min(100, line.performance ?? 0) + '%' }"
              ></div>
            </div>
            <span class="apq-value">{{ (line.performance ?? 0).toFixed(0) }}%</span>
          </div>
          <div class="apq-bar-row">
            <span class="apq-label">Q</span>
            <div class="apq-bar-track">
              <div
                class="apq-bar-fill apq-quality"
                :style="{ width: Math.min(100, line.quality ?? 0) + '%' }"
              ></div>
            </div>
            <span class="apq-value">{{ (line.quality ?? 0).toFixed(0) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-status-view {
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

.line-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 20px;
}

.line-status-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  padding: 20px;
  transition: all 0.3s ease;
}

.line-status-card:hover {
  border-color: var(--persona-color, var(--accent-green));
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.15);
  transform: translateY(-2px);
}

.line-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.line-card-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #eee;
}

.line-card-enterprise {
  font-size: 0.75rem;
  color: #888;
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 8px;
  border-radius: 4px;
}

.line-oee-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
  font-family: 'Orbitron', sans-serif;
}

.line-oee-value .oee-unit {
  font-size: 1rem;
  font-weight: 400;
  opacity: 0.6;
}

.line-oee-value.oee-green {
  color: var(--accent-green);
}

.line-oee-value.oee-amber {
  color: var(--accent-amber);
}

.line-oee-value.oee-red {
  color: var(--accent-red);
}

.line-oee-label {
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

.line-equipment-counts {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.equip-count {
  font-size: 0.85rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 6px;
}

.equip-running {
  color: #10b981;
  background: rgba(16, 185, 129, 0.15);
}

.equip-stopped {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
}

.equip-faulted {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}

.line-apq-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.apq-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.apq-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #aaa;
  width: 14px;
  text-align: center;
}

.apq-bar-track {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.apq-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.apq-availability {
  background: #3b82f6;
}

.apq-performance {
  background: #8b5cf6;
}

.apq-quality {
  background: #10b981;
}

.apq-value {
  font-size: 0.7rem;
  color: #999;
  width: 32px;
  text-align: right;
}
</style>
