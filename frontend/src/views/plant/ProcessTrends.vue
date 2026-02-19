<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import 'chartjs-adapter-date-fns'
import { useAppStore } from '@/stores/app'
import { useProcessData } from '@/composables/useProcessData'
import type { SPCMeasurement, SPCData } from '@/composables/useProcessData'

Chart.register(...registerables)

const appStore = useAppStore()
const processData = useProcessData()

// Refs for time window selection
const selectedTimeWindow = ref('shift')
const loading = ref(false)
const isRefreshing = ref(false)

// SPC measurement selection
const availableMeasurements = ref<SPCMeasurement[]>([])
const selectedMeasurement = ref<string>('')
const availableSites = ref<string[]>([])
const selectedSite = ref<string>('ALL')

// Chart canvas refs
const spcChartCanvas = ref<HTMLCanvasElement | null>(null)
const energyChartCanvas = ref<HTMLCanvasElement | null>(null)
const productionChartCanvas = ref<HTMLCanvasElement | null>(null)

// Chart instances
let spcChart: Chart | null = null
let energyChart: Chart | null = null
let productionChart: Chart | null = null
let refreshInterval: ReturnType<typeof setInterval> | null = null
let currentAbortController: AbortController | null = null

const legendStateCache = new Map<string, boolean[]>()

const CHART_COLORS = {
  cyan: '#00ffff',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#a78bfa',
  blue: '#3b82f6',
  pink: '#ec4899'
}

const DARK_THEME = {
  gridColor: 'rgba(255, 255, 255, 0.1)',
  tickColor: '#e8e8e8',
  backgroundColor: 'transparent'
}

// Empty state flags
const spcEmpty = ref(false)
const energyEmpty = ref(false)
const productionEmpty = ref(false)

// Current SPC data
const currentSPCData = ref<SPCData | null>(null)

const enterprise = computed(() => appStore.enterpriseParam)

// Computed Cpk value for display
const cpkValue = computed(() => {
  return currentSPCData.value?.statistics?.cpk ?? 0
})

const cpkStatus = computed(() => {
  const cpk = cpkValue.value
  if (cpk >= 1.33) return 'excellent'
  if (cpk >= 1.0) return 'adequate'
  return 'poor'
})

const cpkColor = computed(() => {
  const status = cpkStatus.value
  if (status === 'excellent') return CHART_COLORS.green
  if (status === 'adequate') return CHART_COLORS.amber
  return CHART_COLORS.red
})

function saveLegendState(chart: Chart | null, cacheKey: string) {
  if (!chart || !chart.data || !chart.data.datasets) return
  const hiddenStates = chart.data.datasets.map((_, index) => {
    const meta = chart.getDatasetMeta(index)
    return meta ? (meta.hidden ?? false) : false
  })
  legendStateCache.set(cacheKey, hiddenStates)
}

function restoreLegendState(chart: Chart | null, cacheKey: string) {
  if (!chart || !legendStateCache.has(cacheKey)) return
  const hiddenStates = legendStateCache.get(cacheKey)
  if (!hiddenStates) return

  hiddenStates.forEach((isHidden, index) => {
    if (index < chart.data.datasets.length) {
      const meta = chart.getDatasetMeta(index)
      if (meta) {
        meta.hidden = isHidden
      }
    }
  })
  chart.update('none')
}

function destroyChart(chart: Chart | null, cacheKey: string): null {
  if (chart && typeof chart.destroy === 'function') {
    saveLegendState(chart, cacheKey)
    chart.destroy()
  }
  return null
}

/**
 * Create SPC control chart with UCL/LCL from backend data
 */
async function createSPCChart() {
  const canvas = spcChartCanvas.value
  if (!canvas) return

  spcChart = destroyChart(spcChart, 'spc')

  if (!selectedMeasurement.value || enterprise.value === 'ALL') {
    spcEmpty.value = true
    return
  }

  const signal = currentAbortController?.signal
  const data = await processData.fetchSPCData(
    selectedMeasurement.value,
    enterprise.value,
    selectedTimeWindow.value,
    selectedSite.value !== 'ALL' ? selectedSite.value : undefined,
    signal
  )

  if (!data || !data.data || data.data.length === 0) {
    spcEmpty.value = true
    currentSPCData.value = null
    return
  }

  spcEmpty.value = false
  currentSPCData.value = data

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { controlLimits } = data
  const datasets: any[] = []

  // Create datasets for each series (if multiple sources)
  if (data.series && data.series.length > 0) {
    const colors = [CHART_COLORS.cyan, CHART_COLORS.purple, CHART_COLORS.green]

    data.series.forEach((series, idx) => {
      const color = colors[idx % colors.length]

      // Main data line
      datasets.push({
        label: series.source || `Series ${idx + 1}`,
        data: series.data.map(point => ({
          x: new Date(point.timestamp),
          y: point.value
        })),
        borderColor: color,
        borderWidth: 2,
        pointRadius: series.data.map(point => point.outOfControl ? 6 : 3),
        pointBackgroundColor: series.data.map(point =>
          point.outOfControl ? CHART_COLORS.red : color
        ),
        fill: false,
        tension: 0.1
      })
    })
  } else {
    // Single series from flat data
    datasets.push({
      label: data.measurement.split('_').join(' '),
      data: data.data.map(point => ({
        x: new Date(point.timestamp),
        y: point.value
      })),
      borderColor: CHART_COLORS.cyan,
      borderWidth: 2,
      pointRadius: data.data.map(point => point.outOfControl ? 6 : 3),
      pointBackgroundColor: data.data.map(point =>
        point.outOfControl ? CHART_COLORS.red : CHART_COLORS.cyan
      ),
      fill: false,
      tension: 0.1
    })
  }

  // Control limit lines
  const timestamps = data.data.map(d => new Date(d.timestamp))
  const minTime = timestamps[0] || new Date()
  const maxTime = timestamps[timestamps.length - 1] || new Date()

  datasets.push({
    label: 'UCL',
    data: [
      { x: minTime, y: controlLimits.ucl },
      { x: maxTime, y: controlLimits.ucl }
    ],
    borderColor: CHART_COLORS.red,
    borderWidth: 1,
    borderDash: [5, 5],
    pointRadius: 0,
    fill: false
  })

  datasets.push({
    label: 'Mean',
    data: [
      { x: minTime, y: controlLimits.mean },
      { x: maxTime, y: controlLimits.mean }
    ],
    borderColor: CHART_COLORS.green,
    borderWidth: 1,
    borderDash: [3, 3],
    pointRadius: 0,
    fill: false
  })

  datasets.push({
    label: 'LCL',
    data: [
      { x: minTime, y: controlLimits.lcl },
      { x: maxTime, y: controlLimits.lcl }
    ],
    borderColor: CHART_COLORS.red,
    borderWidth: 1,
    borderDash: [5, 5],
    pointRadius: 0,
    fill: false
  })

  spcChart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: DARK_THEME.tickColor,
            padding: 8,
            font: { size: 10 },
            usePointStyle: true,
            filter: (item) => {
              // Show series names and control limits
              return !item.text.startsWith('Series')
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed.y ?? 0
              const label = ctx.dataset.label || ''
              return `${label}: ${value.toFixed(3)}`
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'minute' },
          grid: { color: DARK_THEME.gridColor },
          ticks: { color: DARK_THEME.tickColor }
        },
        y: {
          grid: { color: DARK_THEME.gridColor },
          ticks: { color: DARK_THEME.tickColor }
        }
      }
    }
  })

  restoreLegendState(spcChart, 'spc')
}

/**
 * Create energy monitoring chart from production/energy API
 */
async function createEnergyChart() {
  const canvas = energyChartCanvas.value
  if (!canvas) return

  energyChart = destroyChart(energyChart, 'energy')

  const signal = currentAbortController?.signal
  const data = await processData.fetchEnergyConsumption(selectedTimeWindow.value, signal)

  if (!data || !data.byLine || data.byLine.length === 0) {
    energyEmpty.value = true
    return
  }

  energyEmpty.value = false

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Create bar chart showing consumption by line
  const labels = data.byLine.map(line => line.line)
  const consumption = data.byLine.map(line => line.consumption)
  const trendColors = data.byLine.map(line => {
    if (line.trend === 'rising') return CHART_COLORS.red
    if (line.trend === 'falling') return CHART_COLORS.green
    return CHART_COLORS.amber
  })

  energyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: `Energy (${data.summary.unit})`,
        data: consumption,
        backgroundColor: trendColors.map(c => c + '99'),
        borderColor: trendColors,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: DARK_THEME.tickColor,
            padding: 8,
            font: { size: 10 },
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed.y ?? 0
              const line = data.byLine[ctx.dataIndex]
              if (!line) return `${value.toFixed(1)} ${data.summary.unit}`
              return [
                `${value.toFixed(1)} ${data.summary.unit}`,
                `Trend: ${line.trend}`
              ]
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: DARK_THEME.tickColor,
            font: { size: 9 },
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: DARK_THEME.gridColor },
          ticks: { color: DARK_THEME.tickColor }
        }
      }
    }
  })

  restoreLegendState(energyChart, 'energy')
}

/**
 * Create production volume chart showing actual vs target
 */
async function createProductionChart() {
  const canvas = productionChartCanvas.value
  if (!canvas) return

  productionChart = destroyChart(productionChart, 'production')

  const signal = currentAbortController?.signal
  const data = await processData.fetchProductionVolume(selectedTimeWindow.value, signal)

  if (!data || !data.byLine || data.byLine.length === 0) {
    productionEmpty.value = true
    return
  }

  productionEmpty.value = false

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const labels = data.byLine.map(line => line.line)
  const actual = data.byLine.map(line => line.actual)
  const target = data.byLine.map(line => line.target)

  const actualColors = data.byLine.map(line => {
    if (line.status === 'on-target') return CHART_COLORS.green
    if (line.status === 'near-target') return CHART_COLORS.amber
    return CHART_COLORS.red
  })

  productionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Actual',
          data: actual,
          backgroundColor: actualColors.map(c => c + '99'),
          borderColor: actualColors,
          borderWidth: 2,
          borderRadius: 6
        },
        {
          label: 'Target',
          data: target,
          backgroundColor: CHART_COLORS.blue + '33',
          borderColor: CHART_COLORS.blue,
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: DARK_THEME.tickColor,
            padding: 8,
            font: { size: 10 },
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const line = data.byLine[ctx.dataIndex]
              if (!line) return ''
              if (ctx.datasetIndex === 0) {
                return `Actual: ${line.actual} (${line.percentOfTarget}% of target)`
              }
              return `Target: ${line.target}`
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: DARK_THEME.tickColor,
            font: { size: 9 },
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: DARK_THEME.gridColor },
          ticks: { color: DARK_THEME.tickColor }
        }
      }
    }
  })

  restoreLegendState(productionChart, 'production')
}

async function loadSPCMeasurements() {
  if (enterprise.value === 'ALL') {
    availableMeasurements.value = []
    selectedMeasurement.value = ''
    return
  }

  const signal = currentAbortController?.signal
  const measurements = await processData.fetchSPCMeasurements(
    enterprise.value,
    10,
    selectedSite.value !== 'ALL' ? selectedSite.value : undefined,
    signal
  )

  if (measurements && measurements.length > 0) {
    availableMeasurements.value = measurements
    // Auto-select first measurement if none selected
    const first = measurements[0]
    if (!selectedMeasurement.value || !measurements.find(m => m.measurement === selectedMeasurement.value)) {
      selectedMeasurement.value = first?.measurement ?? ''
    }
  } else {
    availableMeasurements.value = []
    selectedMeasurement.value = ''
  }
}

async function loadSPCSites() {
  if (enterprise.value === 'ALL') {
    availableSites.value = []
    selectedSite.value = 'ALL'
    return
  }

  const signal = currentAbortController?.signal
  const sites = await processData.fetchSPCSites(enterprise.value, signal)
  if (sites && sites.length > 0) {
    availableSites.value = sites
  } else {
    availableSites.value = []
    selectedSite.value = 'ALL'
  }
}

async function fetchAndRender() {
  // Abort any in-flight requests
  if (currentAbortController) {
    currentAbortController.abort()
  }
  currentAbortController = new AbortController()

  isRefreshing.value = true
  loading.value = true

  try {
    // Reset empty states
    spcEmpty.value = false
    energyEmpty.value = false
    productionEmpty.value = false

    // Load SPC sites and measurements
    await loadSPCSites()
    await loadSPCMeasurements()

    // Render all charts
    await Promise.all([
      createSPCChart(),
      createEnergyChart(),
      createProductionChart()
    ])
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // Request was aborted, this is expected
      return
    }
    console.error('Error in fetchAndRender:', err)
  } finally {
    loading.value = false
    isRefreshing.value = false
  }
}

function selectTimeWindow(window: string) {
  selectedTimeWindow.value = window
  fetchAndRender()
}

// Watch for measurement or site changes
watch([selectedMeasurement, selectedSite], () => {
  if (selectedMeasurement.value && !isRefreshing.value) {
    createSPCChart()
  }
})

// Watch for enterprise changes
watch(enterprise, () => {
  fetchAndRender()
})

onMounted(() => {
  fetchAndRender()
  refreshInterval = setInterval(fetchAndRender, 30000)
})

onBeforeUnmount(() => {
  // Abort any in-flight requests
  if (currentAbortController) {
    currentAbortController.abort()
  }
  if (refreshInterval) clearInterval(refreshInterval)
  spcChart = destroyChart(spcChart, 'spc')
  energyChart = destroyChart(energyChart, 'energy')
  productionChart = destroyChart(productionChart, 'production')
})
</script>

<template>
  <div class="process-trends-view">
    <div class="view-header">
      <h1 class="view-title">Process Trends</h1>
      <div class="time-window-selector">
        <button
          class="window-btn"
          :class="{ active: selectedTimeWindow === 'hourly' }"
          @click="selectTimeWindow('hourly')"
        >
          Hourly
        </button>
        <button
          class="window-btn"
          :class="{ active: selectedTimeWindow === 'shift' }"
          @click="selectTimeWindow('shift')"
        >
          Shift
        </button>
        <button
          class="window-btn"
          :class="{ active: selectedTimeWindow === 'daily' }"
          @click="selectTimeWindow('daily')"
        >
          Daily
        </button>
        <button
          class="window-btn"
          :class="{ active: selectedTimeWindow === 'weekly' }"
          @click="selectTimeWindow('weekly')"
        >
          Weekly
        </button>
      </div>
    </div>

    <div class="enterprise-info">
      <span class="enterprise-label">Viewing:</span>
      <span class="enterprise-value">{{ enterprise }}</span>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>

    <div class="trends-grid">
      <!-- SPC Control Charts -->
      <div class="trend-card spc-card">
        <h3 class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          SPC Control Chart
        </h3>
        <p class="card-subtitle">Statistical process control with UCL/LCL limits</p>

        <div v-if="enterprise !== 'ALL'" class="spc-controls">
          <div class="control-group">
            <label>Site Filter:</label>
            <select v-model="selectedSite" class="site-select">
              <option value="ALL">All Sites</option>
              <option v-for="site in availableSites" :key="site" :value="site">
                {{ site }}
              </option>
            </select>
          </div>

          <div class="control-group">
            <label>Measurement:</label>
            <select v-model="selectedMeasurement" class="measurement-select">
              <option v-for="m in availableMeasurements" :key="m.measurement" :value="m.measurement">
                {{ m.displayName }}
              </option>
            </select>
          </div>

          <div v-if="cpkValue > 0" class="cpk-badge" :style="{ borderColor: cpkColor, color: cpkColor }">
            <span class="cpk-label">Cpk:</span>
            <span class="cpk-value">{{ cpkValue.toFixed(2) }}</span>
            <span class="cpk-status">({{ cpkStatus }})</span>
          </div>
        </div>

        <div v-if="enterprise === 'ALL'" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Please select a specific enterprise to view SPC data</p>
        </div>

        <div v-else-if="spcEmpty" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p>No SPC data available for selected measurement</p>
        </div>
        <canvas v-else ref="spcChartCanvas"></canvas>
      </div>

      <!-- Energy Monitoring -->
      <div class="trend-card">
        <h3 class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Energy Consumption
        </h3>
        <p class="card-subtitle">Energy consumption by production line</p>
        <div v-if="energyEmpty" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p>No energy data available</p>
        </div>
        <canvas v-else ref="energyChartCanvas"></canvas>
      </div>

      <!-- Production Volume -->
      <div class="trend-card">
        <h3 class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="9" x2="15" y2="9"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          Production Volume vs Target
        </h3>
        <p class="card-subtitle">Actual production compared to targets</p>
        <div v-if="productionEmpty" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p>No production data available</p>
        </div>
        <canvas v-else ref="productionChartCanvas"></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
.process-trends-view {
  padding: 20px;
  min-height: calc(100vh - 88px);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 16px;
}

.view-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--persona-color, var(--accent-green));
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.time-window-selector {
  display: flex;
  gap: 8px;
  align-items: center;
}

.window-btn {
  padding: 8px 16px;
  background: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-dim);
  cursor: pointer;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.window-btn:hover:not(.active) {
  background: rgba(0, 255, 136, 0.08);
  border-color: var(--accent-green);
  transform: translateY(-1px);
}

.window-btn.active {
  background: var(--accent-green);
  color: var(--bg-dark);
  border-color: var(--accent-green);
  font-weight: 600;
}

.enterprise-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
}

.enterprise-label {
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.enterprise-value {
  color: var(--accent-green);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 1.5px;
}

.loading-overlay {
  position: fixed;
  top: 88px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(0, 255, 136, 0.2);
  border-top-color: var(--accent-green);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.trends-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.trend-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  padding: 24px;
  min-height: 400px;
  transition: all 0.3s ease;
  position: relative;
}

.trend-card:hover {
  border-color: var(--persona-color, var(--accent-green));
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.15);
}

.spc-card {
  min-height: 550px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--persona-color, var(--accent-green));
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 6px;
}

.card-title svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.card-subtitle {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0 0 20px;
  padding-left: 30px;
}

.spc-controls {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  color: var(--text-dim);
  white-space: nowrap;
}

.site-select,
.measurement-select {
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.measurement-select {
  min-width: 250px;
}

.site-select:hover,
.measurement-select:hover {
  border-color: var(--accent-green);
  background: rgba(0, 255, 136, 0.05);
}

.site-select:focus,
.measurement-select:focus {
  outline: none;
  border-color: var(--accent-green);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.2);
}

.cpk-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 2px solid;
  border-radius: 6px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  margin-left: auto;
}

.cpk-label {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cpk-value {
  font-size: 1.2rem;
}

.cpk-status {
  font-size: 0.8rem;
  text-transform: uppercase;
  opacity: 0.8;
}

.trend-card canvas {
  width: 100% !important;
  max-height: 320px;
}

.spc-card canvas {
  max-height: 380px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 320px;
  color: var(--text-dim);
}

.spc-card .empty-state {
  height: 380px;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  color: var(--accent-amber);
  margin-bottom: 16px;
}

.empty-state p {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
}

@media (min-width: 1024px) {
  .trends-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .trend-card:first-child {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .time-window-selector {
    width: 100%;
    flex-wrap: wrap;
  }

  .window-btn {
    flex: 1;
    min-width: 80px;
  }

  .spc-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .control-group {
    flex-direction: column;
    align-items: stretch;
  }

  .measurement-select {
    min-width: auto;
    width: 100%;
  }

  .cpk-badge {
    margin-left: 0;
  }
}
</style>
