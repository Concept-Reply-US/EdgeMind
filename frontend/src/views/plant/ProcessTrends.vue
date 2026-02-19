<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import 'chartjs-adapter-date-fns'
import { useAppStore } from '@/stores/app'

Chart.register(...registerables)

const appStore = useAppStore()

// Refs for time window selection
const selectedTimeWindow = ref('5m')
const loading = ref(false)

// Chart canvas refs
const spcChartCanvas = ref<HTMLCanvasElement | null>(null)
const energyChartCanvas = ref<HTMLCanvasElement | null>(null)
const productionChartCanvas = ref<HTMLCanvasElement | null>(null)

// Chart instances
let spcChart: Chart | null = null
let energyChart: Chart | null = null
let productionChart: Chart | null = null
let refreshInterval: ReturnType<typeof setInterval> | null = null

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

const enterprise = computed(() => appStore.enterpriseParam)

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

interface TrendDataPoint {
  timestamp: string
  mean?: number
  min?: number
  max?: number
  count?: number
}

interface MeasurementData {
  [key: string]: TrendDataPoint[]
}

interface TrendsResponse {
  data: {
    [enterprise: string]: {
      [site: string]: {
        [area: string]: {
          [machine: string]: MeasurementData
        }
      }
    }
  }
}

/**
 * Calculate UCL/LCL from data (mean ± 3*stddev)
 */
function calculateControlLimits(values: number[]) {
  if (values.length === 0) return { mean: 0, ucl: 0, lcl: 0, stddev: 0 }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stddev = Math.sqrt(variance)
  const ucl = mean + 3 * stddev
  const lcl = mean - 3 * stddev
  return { mean, ucl, lcl, stddev }
}

/**
 * Extract measurements from trends API response
 */
function extractMeasurements(data: TrendsResponse['data']): Array<{ name: string; values: number[]; timestamps: string[] }> {
  const measurements: Array<{ name: string; values: number[]; timestamps: string[] }> = []

  for (const [ent, sites] of Object.entries(data)) {
    for (const [site, areas] of Object.entries(sites)) {
      for (const [area, machines] of Object.entries(areas)) {
        for (const [machine, meas] of Object.entries(machines)) {
          for (const [measName, points] of Object.entries(meas)) {
            const values: number[] = []
            const timestamps: string[] = []

            for (const pt of points) {
              if (pt.mean !== undefined) {
                values.push(pt.mean)
                timestamps.push(pt.timestamp)
              }
            }

            if (values.length > 0) {
              measurements.push({
                name: `${ent}/${site}/${area}/${machine}/${measName}`,
                values,
                timestamps
              })
            }
          }
        }
      }
    }
  }

  return measurements
}

/**
 * Filter measurements by keyword patterns
 */
function filterMeasurements(measurements: ReturnType<typeof extractMeasurements>, keywords: string[]): ReturnType<typeof extractMeasurements> {
  return measurements.filter(m => {
    const nameLower = m.name.toLowerCase()
    return keywords.some(kw => nameLower.includes(kw.toLowerCase()))
  })
}

/**
 * Create SPC control chart with UCL/LCL
 */
function createSPCChart(measurements: ReturnType<typeof extractMeasurements>) {
  const canvas = spcChartCanvas.value
  if (!canvas) return

  spcChart = destroyChart(spcChart, 'spc')

  // Pick quality/process measurements (temperature, pressure, thickness, weight, etc.)
  const qualityKeywords = ['temperature', 'pressure', 'thickness', 'weight', 'diameter', 'length', 'width', 'height', 'humidity', 'ph', 'viscosity', 'density']
  const qualityMeasurements = filterMeasurements(measurements, qualityKeywords)

  if (qualityMeasurements.length === 0) {
    spcEmpty.value = true
    return
  }

  spcEmpty.value = false

  // Use first 3 measurements for chart
  const topMeasurements = qualityMeasurements.slice(0, 3)
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const colors = [CHART_COLORS.cyan, CHART_COLORS.purple, CHART_COLORS.green]
  const datasets: any[] = []

  topMeasurements.forEach((m, idx) => {
    const limits = calculateControlLimits(m.values)
    const color = colors[idx % colors.length]

    // Data line
    datasets.push({
      label: m.name.split('/').slice(-2).join('/'),
      data: m.values.map((val, i) => ({
        x: new Date(m.timestamps[i] || Date.now()),
        y: val
      })),
      borderColor: color,
      borderWidth: 2,
      pointRadius: m.values.map(val => {
        // Highlight out-of-control points
        return (val > limits.ucl || val < limits.lcl) ? 6 : 3
      }),
      pointBackgroundColor: m.values.map(val => {
        return (val > limits.ucl || val < limits.lcl) ? CHART_COLORS.red : color
      }),
      fill: false,
      tension: 0.1,
      yAxisID: `y${idx}`
    })

    // Control limit lines
    const minTime = new Date(m.timestamps[0] || Date.now())
    const maxTime = new Date(m.timestamps[m.timestamps.length - 1] || Date.now())

    datasets.push({
      label: `UCL (${m.name.split('/').slice(-1)[0]})`,
      data: [
        { x: minTime, y: limits.ucl },
        { x: maxTime, y: limits.ucl }
      ],
      borderColor: CHART_COLORS.red,
      borderWidth: 1,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      yAxisID: `y${idx}`
    })

    datasets.push({
      label: `Mean (${m.name.split('/').slice(-1)[0]})`,
      data: [
        { x: minTime, y: limits.mean },
        { x: maxTime, y: limits.mean }
      ],
      borderColor: color,
      borderWidth: 1,
      borderDash: [3, 3],
      pointRadius: 0,
      fill: false,
      yAxisID: `y${idx}`
    })

    datasets.push({
      label: `LCL (${m.name.split('/').slice(-1)[0]})`,
      data: [
        { x: minTime, y: limits.lcl },
        { x: maxTime, y: limits.lcl }
      ],
      borderColor: CHART_COLORS.red,
      borderWidth: 1,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      yAxisID: `y${idx}`
    })
  })

  const yAxes: any = {}
  topMeasurements.forEach((_m, idx) => {
    yAxes[`y${idx}`] = {
      type: 'linear',
      display: idx === 0, // Only show first y-axis
      position: idx === 0 ? 'left' : 'right',
      grid: { color: idx === 0 ? DARK_THEME.gridColor : 'transparent' },
      ticks: { color: DARK_THEME.tickColor }
    }
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
            font: { size: 9 },
            usePointStyle: true,
            filter: (item) => {
              // Only show main data lines in legend, not control limits
              return !item.text.startsWith('UCL') && !item.text.startsWith('LCL') && !item.text.startsWith('Mean')
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
        ...yAxes
      }
    }
  })

  restoreLegendState(spcChart, 'spc')
}

/**
 * Create energy monitoring chart
 */
function createEnergyChart(measurements: ReturnType<typeof extractMeasurements>) {
  const canvas = energyChartCanvas.value
  if (!canvas) return

  energyChart = destroyChart(energyChart, 'energy')

  const energyKeywords = ['power', 'energy', 'current', 'voltage', 'watt', 'consumption', 'kw', 'kwh', 'ampere', 'volt']
  const energyMeasurements = filterMeasurements(measurements, energyKeywords)

  if (energyMeasurements.length === 0) {
    energyEmpty.value = true
    return
  }

  energyEmpty.value = false

  const topMeasurements = energyMeasurements.slice(0, 5)
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const colors = [CHART_COLORS.cyan, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.purple, CHART_COLORS.pink]
  const datasets = topMeasurements.map((m, idx) => ({
    label: m.name.split('/').slice(-3).join('/'),
    data: m.values.map((val, i) => ({
      x: new Date(m.timestamps[i] || Date.now()).getTime(),
      y: val
    })),
    borderColor: colors[idx],
    backgroundColor: colors[idx] + '20',
    borderWidth: 2,
    pointRadius: 2,
    fill: true,
    tension: 0.4
  }))

  // Calculate current values (last point)
  const currentValues = topMeasurements.map(m => m.values[m.values.length - 1] || 0)

  energyChart = new Chart(ctx, {
    type: 'line',
    data: { datasets } as any,
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
              const current = currentValues[ctx.datasetIndex] ?? 0
              const yValue = ctx.parsed.y ?? 0
              return `${ctx.dataset.label}: ${yValue.toFixed(2)} (current: ${current.toFixed(2)})`
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
 * Create production volume chart
 */
function createProductionChart(measurements: ReturnType<typeof extractMeasurements>) {
  const canvas = productionChartCanvas.value
  if (!canvas) return

  productionChart = destroyChart(productionChart, 'production')

  const productionKeywords = ['count', 'production', 'throughput', 'output', 'batch', 'units', 'quantity', 'volume', 'pieces', 'items']
  const productionMeasurements = filterMeasurements(measurements, productionKeywords)

  if (productionMeasurements.length === 0) {
    productionEmpty.value = true
    return
  }

  productionEmpty.value = false

  const topMeasurements = productionMeasurements.slice(0, 5)
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Calculate totals for each measurement
  const labels = topMeasurements.map(m => m.name.split('/').slice(-3).join('/'))
  const totals = topMeasurements.map(m => m.values.reduce((sum, val) => sum + val, 0))

  const colors = totals.map((total) => {
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length
    if (total > avg * 1.2) return CHART_COLORS.green
    if (total < avg * 0.8) return CHART_COLORS.red
    return CHART_COLORS.amber
  })

  productionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Total Production',
        data: totals,
        backgroundColor: colors.map(c => c + '99'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Total: ${(ctx.parsed.x ?? 0).toFixed(0)} units`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: DARK_THEME.gridColor },
          ticks: { color: DARK_THEME.tickColor }
        },
        y: {
          grid: { display: false },
          ticks: { color: DARK_THEME.tickColor, font: { size: 9 } }
        }
      }
    }
  })

  restoreLegendState(productionChart, 'production')
}

async function safeFetch(url: string, label: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${label}: ${res.status}`)
    return await res.json()
  } catch (error) {
    console.error(`Plant Process Trends - ${label} error:`, error)
    return null
  }
}

async function fetchAndRender() {
  loading.value = true

  // Reset empty states
  spcEmpty.value = false
  energyEmpty.value = false
  productionEmpty.value = false

  const trendsData = await safeFetch('/api/trends', 'Trends data')

  if (trendsData && trendsData.data) {
    const measurements = extractMeasurements(trendsData.data)

    createSPCChart(measurements)
    createEnergyChart(measurements)
    createProductionChart(measurements)
  }

  loading.value = false
}

function selectTimeWindow(window: string) {
  selectedTimeWindow.value = window
  fetchAndRender()
}

onMounted(() => {
  fetchAndRender()
  refreshInterval = setInterval(fetchAndRender, 30000)
})

onBeforeUnmount(() => {
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
          :class="{ active: selectedTimeWindow === '5m' }"
          @click="selectTimeWindow('5m')"
        >
          5 min
        </button>
        <button
          class="window-btn"
          :class="{ active: selectedTimeWindow === '15m' }"
          @click="selectTimeWindow('15m')"
        >
          15 min
        </button>
        <button
          class="window-btn"
          :class="{ active: selectedTimeWindow === '1h' }"
          @click="selectTimeWindow('1h')"
        >
          1 hour
        </button>
        <button
          class="window-btn"
          :class="{ active: selectedTimeWindow === '4h' }"
          @click="selectTimeWindow('4h')"
        >
          4 hours
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
      <div class="trend-card">
        <h3 class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          SPC Control Charts
        </h3>
        <p class="card-subtitle">Statistical process control with UCL/LCL limits</p>
        <div v-if="spcEmpty" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p>No quality/process measurements available</p>
        </div>
        <canvas v-else ref="spcChartCanvas"></canvas>
      </div>

      <!-- Energy Monitoring -->
      <div class="trend-card">
        <h3 class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Energy Monitoring
        </h3>
        <p class="card-subtitle">Real-time power consumption and current values</p>
        <div v-if="energyEmpty" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p>No energy measurements available</p>
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
          Production Volume
        </h3>
        <p class="card-subtitle">Total production counts and throughput</p>
        <div v-if="productionEmpty" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p>No production measurements available</p>
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

.trend-card canvas {
  width: 100% !important;
  max-height: 320px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 320px;
  color: var(--text-dim);
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
}
</style>
