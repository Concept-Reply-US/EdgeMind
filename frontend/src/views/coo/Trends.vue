<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Chart } from 'chart.js'
import 'chartjs-adapter-date-fns'

const selectedTimeWindow = ref('shift')
let refreshInterval: ReturnType<typeof setInterval> | null = null

// Loading states for each chart
const chartLoading = ref({
  oee: true,
  waste: true,
  downtime: true,
  wastePredictive: true,
  oeeComponents: true
})

// State for equipment data and waste prediction alerts
const equipmentData = ref<any>(null)
const wastePredictionAlert = ref<{ message: string; severity: 'warning' | 'critical' } | null>(null)

// Chart refs
const oeeChartCanvas = ref<HTMLCanvasElement | null>(null)
const wasteChartCanvas = ref<HTMLCanvasElement | null>(null)
const downtimeChartCanvas = ref<HTMLCanvasElement | null>(null)
const wastePredictiveChartCanvas = ref<HTMLCanvasElement | null>(null)
const oeeComponentsChartCanvas = ref<HTMLCanvasElement | null>(null)

// Chart instances
let oeeChart: Chart | null = null
let wasteChart: Chart | null = null
let downtimeParetoChart: Chart | null = null
let wastePredictiveChart: Chart | null = null
let oeeComponentsChart: Chart | null = null

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

function createOEEChart(data: any) {
  const canvas = oeeChartCanvas.value
  if (!canvas) return

  oeeChart = destroyChart(oeeChart, 'oee')
  chartLoading.value.oee = false
  const oeeData = data?.data || {}
  const enterprises = Object.keys(oeeData)
  if (enterprises.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const oeeValues = enterprises.map(e => oeeData[e]?.oee || 0)
  const oeeColors = oeeValues.map(v => {
    if (v >= 85) return CHART_COLORS.green
    if (v >= 70) return CHART_COLORS.amber
    return CHART_COLORS.red
  })

  const labels = enterprises.map(e => e.replace('Enterprise ', 'Ent. '))

  // Calculate equipment state percentages per enterprise
  const datasets: any[] = [{
    label: 'OEE %',
    data: oeeValues,
    backgroundColor: oeeColors.map(c => c + '99'),
    borderColor: oeeColors,
    borderWidth: 2,
    borderRadius: 6,
    barPercentage: 0.5,
    yAxisID: 'y'
  }]

  // Add equipment state distribution if available
  if (equipmentData.value?.states) {
    const statesByEnterprise = new Map<string, { running: number; idle: number; down: number; total: number }>()

    equipmentData.value.states.forEach((equip: any) => {
      if (!statesByEnterprise.has(equip.enterprise)) {
        statesByEnterprise.set(equip.enterprise, { running: 0, idle: 0, down: 0, total: 0 })
      }
      const stats = statesByEnterprise.get(equip.enterprise)!
      stats.total++
      const stateName = (equip.stateName || equip.state || '').toLowerCase()
      if (stateName.includes('running') || stateName.includes('operational')) {
        stats.running++
      } else if (stateName.includes('idle') || stateName.includes('ready') || stateName.includes('standby')) {
        stats.idle++
      } else {
        stats.down++
      }
    })

    const runningPct = enterprises.map(e => {
      const stats = statesByEnterprise.get(e)
      return stats ? (stats.running / stats.total * 100) : 0
    })
    const idlePct = enterprises.map(e => {
      const stats = statesByEnterprise.get(e)
      return stats ? (stats.idle / stats.total * 100) : 0
    })
    const downPct = enterprises.map(e => {
      const stats = statesByEnterprise.get(e)
      return stats ? (stats.down / stats.total * 100) : 0
    })

    datasets.push(
      {
        label: 'Running %',
        data: runningPct,
        backgroundColor: CHART_COLORS.green + '66',
        borderColor: CHART_COLORS.green,
        borderWidth: 1,
        yAxisID: 'y1',
        type: 'bar' as const,
        stack: 'states',
        barPercentage: 0.5
      },
      {
        label: 'Idle %',
        data: idlePct,
        backgroundColor: CHART_COLORS.amber + '66',
        borderColor: CHART_COLORS.amber,
        borderWidth: 1,
        yAxisID: 'y1',
        type: 'bar' as const,
        stack: 'states',
        barPercentage: 0.5
      },
      {
        label: 'Down/Faulted %',
        data: downPct,
        backgroundColor: CHART_COLORS.red + '66',
        borderColor: CHART_COLORS.red,
        borderWidth: 1,
        yAxisID: 'y1',
        type: 'bar' as const,
        stack: 'states',
        barPercentage: 0.5
      }
    )
  }

  oeeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: equipmentData.value?.states ? true : false,
          position: 'bottom',
          labels: {
            color: DARK_THEME.tickColor,
            padding: 8,
            font: { size: 10 },
            usePointStyle: true
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          position: 'left',
          title: { display: true, text: 'OEE %', color: DARK_THEME.tickColor, font: { size: 10 } },
          grid: { color: DARK_THEME.gridColor },
          ticks: {
            color: DARK_THEME.tickColor,
            callback: (_v: string | number) => _v + '%'
          }
        },
        y1: equipmentData.value?.states ? {
          beginAtZero: true,
          max: 100,
          position: 'right',
          title: { display: true, text: 'Equipment State %', color: DARK_THEME.tickColor, font: { size: 10 } },
          grid: { display: false },
          stacked: true,
          ticks: {
            color: DARK_THEME.tickColor,
            callback: (_v: string | number) => _v + '%'
          }
        } : undefined,
        x: {
          grid: { display: false },
          ticks: { color: DARK_THEME.tickColor }
        }
      }
    }
  })

  restoreLegendState(oeeChart, 'oee')
}

function createWasteChart(data: any) {
  const canvas = wasteChartCanvas.value
  if (!canvas) return

  wasteChart = destroyChart(wasteChart, 'waste')
  chartLoading.value.waste = false
  const summary = data?.summary || {}
  const enterprises = Object.keys(summary)
  if (enterprises.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const totals = enterprises.map(e => summary[e]?.total || 0)
  const trends = enterprises.map(e => summary[e]?.trend || 'stable')

  const barColors = trends.map(t => {
    if (t === 'rising') return CHART_COLORS.red
    if (t === 'falling') return CHART_COLORS.green
    return CHART_COLORS.amber
  })

  wasteChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: enterprises.map(e => e.replace('Enterprise ', 'Ent. ')),
      datasets: [{
        label: 'Total Waste (24h)',
        data: totals,
        backgroundColor: barColors.map(c => c + '99'),
        borderColor: barColors,
        borderWidth: 2,
        borderRadius: 6,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: DARK_THEME.gridColor },
          ticks: { color: DARK_THEME.tickColor }
        },
        x: {
          grid: { display: false },
          ticks: { color: DARK_THEME.tickColor }
        }
      }
    }
  })

  restoreLegendState(wasteChart, 'waste')
}

function createDowntimeParetoChart(data: any) {
  const canvas = downtimeChartCanvas.value
  if (!canvas) return

  downtimeParetoChart = destroyChart(downtimeParetoChart, 'downtime')
  chartLoading.value.downtime = false
  const paretoData = data?.paretoData || []
  if (paretoData.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const topN = paretoData.slice(0, 10)
  const labels = topN.map((d: any) => `${d.machine} (${d.site})`)
  const values = topN.map((d: any) => d.downtimeMinutes)

  downtimeParetoChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Downtime (minutes)',
        data: values,
        backgroundColor: values.map((_v: number, i: number) => {
          if (i === 0) return CHART_COLORS.red + '99'
          if (i < 3) return CHART_COLORS.amber + '99'
          return CHART_COLORS.cyan + '99'
        }),
        borderColor: values.map((_v: number, i: number) => {
          if (i === 0) return CHART_COLORS.red
          if (i < 3) return CHART_COLORS.amber
          return CHART_COLORS.cyan
        }),
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: DARK_THEME.gridColor },
          ticks: {
            color: DARK_THEME.tickColor,
            callback: (_v: string | number) => _v + ' min'
          }
        },
        y: {
          grid: { display: false },
          ticks: { color: DARK_THEME.tickColor, font: { size: 10 } }
        }
      }
    }
  })

  restoreLegendState(downtimeParetoChart, 'downtime')
}

function createWastePredictiveChart(data: any) {
  const canvas = wastePredictiveChartCanvas.value
  if (!canvas) return

  wastePredictiveChart = destroyChart(wastePredictiveChart, 'wastePred')
  chartLoading.value.wastePredictive = false
  const byEnterprise = data?.byEnterprise || {}
  const hasData = Object.values(byEnterprise).some((ent: any) => ent.historical && ent.historical.length > 0)
  if (!hasData) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Check for prediction threshold alerts
  wastePredictionAlert.value = null
  const PREDICTION_THRESHOLD_MULTIPLIER = 1.2 // Alert if predicted > 120% of current
  const ABSOLUTE_THRESHOLD = 100 // Alert if predicted > 100 units

  Object.entries(byEnterprise).forEach(([enterprise, entData]: [string, any]) => {
    if (!entData.historical || !entData.prediction) return

    const latestHistorical = entData.historical[entData.historical.length - 1]
    const latestPrediction = entData.prediction[entData.prediction.length - 1]

    if (latestHistorical && latestPrediction) {
      const currentValue = latestHistorical.value
      const predictedValue = latestPrediction.value
      const exceedsRelative = predictedValue > currentValue * PREDICTION_THRESHOLD_MULTIPLIER
      const exceedsAbsolute = predictedValue > ABSOLUTE_THRESHOLD

      if (exceedsRelative || exceedsAbsolute) {
        const severity: 'warning' | 'critical' = exceedsAbsolute ? 'critical' : 'warning'
        wastePredictionAlert.value = {
          message: `${enterprise} projected waste exceeds threshold: ${predictedValue.toFixed(1)} units (current: ${currentValue.toFixed(1)})`,
          severity
        }
      }
    }
  })

  const datasets = Object.entries(byEnterprise).flatMap(([enterprise, entData]: [string, any], idx: number) => {
    const colors = [CHART_COLORS.cyan, CHART_COLORS.green, CHART_COLORS.amber]
    const historicalData = (entData.historical || []).map((d: any) => ({
      x: new Date(d.timestamp),
      y: d.value
    }))
    const predictionData = (entData.prediction || []).map((d: any) => ({
      x: new Date(d.timestamp),
      y: d.value
    }))

    return [
      {
        label: `${enterprise.replace('Enterprise ', 'Ent. ')} - Historical`,
        data: historicalData,
        borderColor: colors[idx % colors.length],
        borderWidth: 2,
        pointRadius: 2,
        fill: false,
        tension: 0.1
      },
      {
        label: `${enterprise.replace('Enterprise ', 'Ent. ')} - Predicted`,
        data: predictionData,
        borderColor: colors[idx % colors.length],
        borderWidth: 2,
        borderDash: [8, 4],
        pointRadius: 4,
        pointStyle: 'triangle',
        fill: false
      }
    ]
  })

  wastePredictiveChart = new Chart(ctx, {
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
            usePointStyle: true
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: selectedTimeWindow.value === 'hourly' ? 'minute' :
                  selectedTimeWindow.value === 'shift' ? 'hour' :
                  selectedTimeWindow.value === 'daily' ? 'hour' : 'day'
          },
          grid: { color: DARK_THEME.gridColor },
          ticks: { color: DARK_THEME.tickColor }
        },
        y: {
          beginAtZero: true,
          grid: { color: DARK_THEME.gridColor },
          ticks: {
            color: DARK_THEME.tickColor,
            callback: (_v: string | number) => _v + ' units'
          }
        }
      }
    }
  })

  restoreLegendState(wastePredictiveChart, 'wastePred')
}

function createOEEComponentsChart(data: any) {
  const canvas = oeeComponentsChartCanvas.value
  if (!canvas) return

  oeeComponentsChart = destroyChart(oeeComponentsChart, 'oeeComp')
  chartLoading.value.oeeComponents = false
  const components = ['availability', 'performance', 'quality']
  const hasData = components.some(c => data?.[c]?.historical?.length > 0)
  if (!hasData) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const colors: Record<string, string> = {
    availability: CHART_COLORS.green,
    performance: CHART_COLORS.blue,
    quality: CHART_COLORS.amber
  }

  const datasets = components.flatMap(component => {
    const compData = data[component]
    if (!compData || !compData.historical || compData.historical.length === 0) return []

    const historical = compData.historical.map((d: any) => ({
      x: new Date(d.timestamp),
      y: d.value
    }))
    const prediction = (compData.prediction || []).map((d: any) => ({
      x: new Date(d.timestamp),
      y: d.value
    }))

    return [
      {
        label: `${component.charAt(0).toUpperCase() + component.slice(1)} - Historical`,
        data: historical,
        borderColor: colors[component],
        borderWidth: 2,
        pointRadius: 2,
        fill: false,
        tension: 0.1
      },
      {
        label: `${component.charAt(0).toUpperCase() + component.slice(1)} - Predicted`,
        data: prediction,
        borderColor: colors[component],
        borderWidth: 2,
        borderDash: [8, 4],
        pointRadius: 4,
        pointStyle: 'triangle',
        fill: false
      }
    ]
  })

  oeeComponentsChart = new Chart(ctx, {
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
            usePointStyle: true
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: selectedTimeWindow.value === 'hourly' ? 'minute' :
                  selectedTimeWindow.value === 'shift' ? 'hour' :
                  selectedTimeWindow.value === 'daily' ? 'hour' : 'day'
          },
          grid: { color: DARK_THEME.gridColor },
          ticks: { color: DARK_THEME.tickColor }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: DARK_THEME.gridColor },
          ticks: {
            color: DARK_THEME.tickColor,
            callback: (_v: string | number) => _v + '%'
          }
        }
      }
    }
  })

  restoreLegendState(oeeComponentsChart, 'oeeComp')
}

async function safeFetch(url: string, label: string) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${label}: ${res.status}`)
    return await res.json()
  } catch (error) {
    console.error(`COO trends - ${label} error:`, error)
    return null
  }
}

async function fetchAndRender() {
  // Set all charts to loading
  chartLoading.value.oee = true
  chartLoading.value.waste = true
  chartLoading.value.downtime = true
  chartLoading.value.wastePredictive = true
  chartLoading.value.oeeComponents = true

  const [oeeData, wasteData, equipData, downtimeData, wastePredData, oeePredData] = await Promise.all([
    safeFetch('/api/oee/breakdown', 'OEE breakdown'),
    safeFetch('/api/waste/trends', 'Waste trends'),
    safeFetch('/api/equipment/states', 'Equipment states'),
    safeFetch(`/api/trends/downtime-pareto?window=${selectedTimeWindow.value}&enterprise=ALL`, 'Downtime Pareto'),
    safeFetch(`/api/trends/waste-predictive?window=${selectedTimeWindow.value}&enterprise=ALL`, 'Waste predictive'),
    safeFetch(`/api/trends/oee-components?window=${selectedTimeWindow.value}&enterprise=ALL`, 'OEE components')
  ])

  // Store equipment data for OEE chart to use
  equipmentData.value = equipData

  if (oeeData) {
    createOEEChart(oeeData)
  } else {
    chartLoading.value.oee = false
  }

  if (wasteData) {
    createWasteChart(wasteData)
  } else {
    chartLoading.value.waste = false
  }

  if (downtimeData) {
    createDowntimeParetoChart(downtimeData)
  } else {
    chartLoading.value.downtime = false
  }

  if (wastePredData) {
    createWastePredictiveChart(wastePredData)
  } else {
    chartLoading.value.wastePredictive = false
  }

  if (oeePredData) {
    createOEEComponentsChart(oeePredData)
  } else {
    chartLoading.value.oeeComponents = false
  }
}

function selectTimeWindow(win: string) {
  selectedTimeWindow.value = win
  fetchAndRender()
}

function dismissAlert() {
  wastePredictionAlert.value = null
}

onMounted(() => {
  fetchAndRender()
  refreshInterval = setInterval(fetchAndRender, 30000)
})

onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval)
  oeeChart = destroyChart(oeeChart, 'oee')
  wasteChart = destroyChart(wasteChart, 'waste')
  downtimeParetoChart = destroyChart(downtimeParetoChart, 'downtime')
  wastePredictiveChart = destroyChart(wastePredictiveChart, 'wastePred')
  oeeComponentsChart = destroyChart(oeeComponentsChart, 'oeeComp')
})
</script>

<template>
  <div class="trends-view">
    <div class="view-header">
      <h1 class="view-title">Trend Analysis</h1>
      <div class="time-window-selector">
        <button
          class="window-btn"
          :class="{ active: selectedTimeWindow === 'hourly' }"
          @click="selectTimeWindow('hourly')"
        >
          Hourly (1h)
        </button>
        <button
          class="window-btn"
          :class="{ active: selectedTimeWindow === 'shift' }"
          @click="selectTimeWindow('shift')"
        >
          Shift (8h)
        </button>
        <button
          class="window-btn"
          :class="{ active: selectedTimeWindow === 'daily' }"
          @click="selectTimeWindow('daily')"
        >
          Daily (24h)
        </button>
        <button
          class="window-btn"
          :class="{ active: selectedTimeWindow === 'weekly' }"
          @click="selectTimeWindow('weekly')"
        >
          Weekly (7d)
        </button>
      </div>
    </div>

    <div class="trends-chart-grid">
      <div class="trend-chart-container">
        <h3 class="chart-title">OEE by Enterprise</h3>
        <div v-if="chartLoading.oee" class="chart-loading">Loading OEE data...</div>
        <div v-else-if="!oeeChart" class="chart-empty">No OEE data available</div>
        <canvas v-show="oeeChart" ref="oeeChartCanvas"></canvas>
      </div>

      <div class="trend-chart-container">
        <h3 class="chart-title">Waste Trends</h3>
        <div v-if="chartLoading.waste" class="chart-loading">Loading waste data...</div>
        <div v-else-if="!wasteChart" class="chart-empty">No waste data available</div>
        <canvas v-show="wasteChart" ref="wasteChartCanvas"></canvas>
      </div>

      <div class="trend-chart-container">
        <h3 class="chart-title">Downtime Pareto</h3>
        <div v-if="chartLoading.downtime" class="chart-loading">Loading downtime data...</div>
        <div v-else-if="!downtimeParetoChart" class="chart-empty">No downtime data available</div>
        <canvas v-show="downtimeParetoChart" ref="downtimeChartCanvas"></canvas>
      </div>

      <div class="trend-chart-container">
        <h3 class="chart-title">Waste Predictive Analysis</h3>
        <div v-if="chartLoading.wastePredictive" class="chart-loading">Loading predictive data...</div>
        <div v-else-if="!wastePredictiveChart" class="chart-empty">No predictive data available</div>
        <canvas v-show="wastePredictiveChart" ref="wastePredictiveChartCanvas"></canvas>

        <!-- Waste Prediction Alert Banner -->
        <div
          v-if="wastePredictionAlert"
          class="waste-alert-banner"
          :class="wastePredictionAlert.severity"
        >
          <div class="alert-content">
            <span class="alert-icon">⚠️</span>
            <span class="alert-message">{{ wastePredictionAlert.message }}</span>
          </div>
          <button class="alert-dismiss" @click="dismissAlert">✕</button>
        </div>
      </div>

      <div class="trend-chart-container chart-card-wide">
        <h3 class="chart-title">OEE Components Forecast</h3>
        <div v-if="chartLoading.oeeComponents" class="chart-loading">Loading OEE components...</div>
        <div v-else-if="!oeeComponentsChart" class="chart-empty">No OEE component data available</div>
        <canvas v-show="oeeComponentsChart" ref="oeeComponentsChartCanvas"></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trends-view {
  padding: 20px;
}

.view-header {
  padding: 0 0 20px;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.view-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--persona-color, var(--accent-cyan));
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
  background: rgba(0, 255, 255, 0.08);
  border-color: var(--accent-cyan);
  transform: translateY(-1px);
}

.window-btn.active {
  background: var(--accent-cyan);
  color: var(--bg-dark);
  border-color: var(--accent-cyan);
  font-weight: 600;
}

.trends-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.trend-chart-container {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  padding: 24px;
  min-height: 300px;
  transition: all 0.3s ease;
  position: relative;
}

.trend-chart-container:hover {
  border-color: var(--persona-color, var(--accent-cyan));
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.15);
}

.chart-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--persona-color, var(--accent-cyan));
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 16px;
}

.trend-chart-container canvas {
  width: 100% !important;
  max-height: 280px;
}

.chart-card-wide {
  grid-column: span 2;
}

.chart-loading,
.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
  text-align: center;
  padding: 20px;
}

.chart-loading {
  color: var(--persona-color, var(--accent-cyan));
  opacity: 0.7;
}

.chart-empty {
  color: var(--text-dim);
  opacity: 0.5;
}

.waste-alert-banner {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-width: 1px;
  border-style: solid;
  animation: slideDown 0.3s ease;
}

.waste-alert-banner.warning {
  background: rgba(245, 158, 11, 0.15);
  border-color: #f59e0b;
}

.waste-alert-banner.critical {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.alert-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.alert-message {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  color: #e8e8e8;
}

.alert-dismiss {
  background: none;
  border: none;
  color: #999;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  transition: color 0.2s ease;
  font-family: 'Share Tech Mono', monospace;
}

.alert-dismiss:hover {
  color: #fff;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1024px) {
  .trends-chart-grid {
    grid-template-columns: 1fr;
  }

  .chart-card-wide {
    grid-column: auto;
  }

  .view-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .alert-message {
    font-size: 0.75rem;
  }
}
</style>
