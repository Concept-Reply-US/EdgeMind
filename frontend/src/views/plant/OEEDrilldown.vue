<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/app'
import { useOEE } from '@/composables/useOEE'
import OEEGauge from '@/components/charts/OEEGauge.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DoughnutChart from '@/components/charts/DoughnutChart.vue'
import type { OEEData, LineOEE } from '@/types'
import type { ChartData, ChartOptions } from 'chart.js'

const appStore = useAppStore()
const { fetchLineOEE } = useOEE()

const oeeData = ref<OEEData | null>(null)
const lines = ref<LineOEE[]>([])
const wasteBreakdown = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
let refreshInterval: number | null = null

// AbortController for canceling in-flight requests
let abortController: AbortController | null = null

// Chart click detail state
const chartDetailPopup = ref<{
  show: boolean
  label: string
  value: number
  percentage: string
  chartType: string
} | null>(null)

function getOeeColor(value: number): string {
  if (value >= 85) return '#10b981'
  if (value >= 70) return '#f59e0b'
  return '#ef4444'
}

const barChartData = computed<ChartData<'bar'>>(() => {
  if (!lines.value || lines.value.length === 0) {
    return { labels: [], datasets: [] }
  }

  const sorted = [...lines.value].sort((a, b) => (a.oee ?? 0) - (b.oee ?? 0))
  const labels = sorted.map(l => `${l.site} (${l.line})`)
  const data = sorted.map(l => l.oee ?? 0)
  const colors = data.map(v => getOeeColor(v))

  return {
    labels,
    datasets: [{
      label: 'OEE %',
      data,
      backgroundColor: colors.map(c => c + '99'),
      borderColor: colors,
      borderWidth: 1
    }]
  }
})

const barChartOptions = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `OEE: ${(ctx.parsed.x ?? 0).toFixed(1)}%`
      }
    }
  },
  scales: {
    x: {
      min: 0,
      max: 100,
      grid: { color: 'rgba(255,255,255,0.08)' },
      ticks: { color: '#888', callback: (v) => v + '%' }
    },
    y: {
      grid: { display: false },
      ticks: { color: '#ccc', font: { size: 11 } }
    }
  }
}))

const doughnutChartData = computed<ChartData<'doughnut'>>(() => {
  if (!oeeData.value) {
    return { labels: [], datasets: [] }
  }

  const availability = oeeData.value.availability ?? 0
  const performance = oeeData.value.performance ?? 0
  const quality = oeeData.value.quality ?? 0

  return {
    labels: ['Availability', 'Performance', 'Quality'],
    datasets: [{
      data: [availability, performance, quality],
      backgroundColor: ['#3b82f699', '#8b5cf699', '#10b98199'],
      borderColor: ['#3b82f6', '#8b5cf6', '#10b981'],
      borderWidth: 1
    }]
  }
})

const doughnutChartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#ccc', padding: 12, font: { size: 11 } }
    },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.label}: ${ctx.parsed.toFixed(1)}%`
      }
    }
  }
}))

const wasteChartData = computed<ChartData<'doughnut'>>(() => {
  if (!wasteBreakdown.value || !wasteBreakdown.value.length) {
    return { labels: [], datasets: [] }
  }

  // Sort by total waste descending and take top 5
  const sorted = [...wasteBreakdown.value]
    .sort((a: any, b: any) => (b.total || 0) - (a.total || 0))
    .slice(0, 5)

  const labels = sorted.map((item: any) => item.enterprise?.replace('Enterprise ', 'Ent. ') || 'Unknown')
  const data = sorted.map((item: any) => item.total || 0)

  const colors = ['#ef444499', '#f59e0b99', '#10b98199', '#3b82f699', '#8b5cf699']
  const borderColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderColor: borderColors,
      borderWidth: 1
    }]
  }
})

const wasteChartOptions = computed<ChartOptions<'doughnut'>>(() => ({
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#ccc', padding: 12, font: { size: 11 } }
    },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.label}: ${ctx.parsed.toFixed(0)} units`
      }
    }
  }
}))

async function fetchAndRender(): Promise<void> {
  try {
    error.value = null
    if (!oeeData.value) {
      loading.value = true
    }

    // Abort previous in-flight requests
    if (abortController) {
      abortController.abort()
    }

    // Create new AbortController for this fetch
    abortController = new AbortController()
    const signal = abortController.signal

    const enterprise = appStore.enterpriseParam
    const url = enterprise !== 'ALL' ? `/api/oee/v2?enterprise=${encodeURIComponent(enterprise)}` : '/api/oee/v2'

    const [oeeRes, linesData, wasteRes] = await Promise.all([
      fetch(url, { signal }),
      fetchLineOEE(signal),
      fetch('/api/waste/breakdown', { signal })
    ])

    if (!oeeRes.ok) throw new Error(`OEE v2: ${oeeRes.status}`)

    oeeData.value = await oeeRes.json()

    if (linesData?.lines) {
      lines.value = linesData.lines
    }

    if (wasteRes.ok) {
      wasteBreakdown.value = await wasteRes.json()
    }
  } catch (err) {
    // Ignore AbortError (user navigated away or switched filters)
    if (err instanceof DOMException && err.name === 'AbortError') {
      return
    }
    error.value = err instanceof Error ? err.message : 'Failed to load OEE data'
    console.error('OEE drilldown fetch error:', err)
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
  if (abortController) {
    abortController.abort()
  }
})

function handleWasteClick(payload: { label: string; value: number }) {
  const dataset = wasteChartData.value.datasets[0]
  if (!dataset) return
  const total = dataset.data.reduce((sum: number, v) => sum + ((v as number) || 0), 0)
  const percentage = total > 0 ? ((payload.value / total) * 100).toFixed(1) : '0'

  chartDetailPopup.value = {
    show: true,
    label: payload.label,
    value: payload.value,
    percentage: percentage + '%',
    chartType: 'Waste'
  }
}

function closeChartDetail() {
  chartDetailPopup.value = null
}
</script>

<template>
  <div class="oee-drilldown-view">
    <div v-if="loading && !oeeData" class="view-loading">
      Loading OEE data...
    </div>

    <div v-else-if="error && !oeeData" class="view-error">
      {{ error }}
    </div>

    <div v-else class="oee-drilldown-layout">
      <!-- Large OEE Display -->
      <div class="oee-big-display">
        <OEEGauge :value="oeeData?.average ?? 0" :size="240" />

        <div class="oee-big-label">Overall Equipment Effectiveness</div>

        <div class="oee-apq-display">
          <div class="oee-apq-item">
            <div class="oee-apq-bar-track">
              <div
                class="oee-apq-bar-fill apq-availability"
                :style="{ width: Math.min(100, oeeData?.availability ?? 0) + '%' }"
              ></div>
            </div>
            <div class="oee-apq-detail">
              <span class="oee-apq-label">Availability</span>
              <span class="oee-apq-value">{{ (oeeData?.availability ?? 0).toFixed(1) }}%</span>
            </div>
          </div>
          <div class="oee-apq-item">
            <div class="oee-apq-bar-track">
              <div
                class="oee-apq-bar-fill apq-performance"
                :style="{ width: Math.min(100, oeeData?.performance ?? 0) + '%' }"
              ></div>
            </div>
            <div class="oee-apq-detail">
              <span class="oee-apq-label">Performance</span>
              <span class="oee-apq-value">{{ (oeeData?.performance ?? 0).toFixed(1) }}%</span>
            </div>
          </div>
          <div class="oee-apq-item">
            <div class="oee-apq-bar-track">
              <div
                class="oee-apq-bar-fill apq-quality"
                :style="{ width: Math.min(100, oeeData?.quality ?? 0) + '%' }"
              ></div>
            </div>
            <div class="oee-apq-detail">
              <span class="oee-apq-label">Quality</span>
              <span class="oee-apq-value">{{ (oeeData?.quality ?? 0).toFixed(1) }}%</span>
            </div>
          </div>
        </div>

        <div class="oee-formula">
          A x P x Q = {{ (oeeData?.availability ?? 0).toFixed(0) }}% x
          {{ (oeeData?.performance ?? 0).toFixed(0) }}% x
          {{ (oeeData?.quality ?? 0).toFixed(0) }}%
        </div>
      </div>

      <!-- OEE by Line Chart -->
      <div class="oee-chart-container">
        <div class="chart-title">OEE by Production Line</div>
        <BarChart
          v-if="barChartData.labels && barChartData.labels.length > 0"
          :chart-data="barChartData"
          :options="barChartOptions"
          :height="350"
        />
        <div v-else class="view-loading">No line data available</div>
      </div>

      <!-- OEE Breakdown Doughnut -->
      <div class="oee-chart-container">
        <div class="chart-title">OEE Component Breakdown</div>
        <DoughnutChart
          v-if="doughnutChartData.labels && doughnutChartData.labels.length > 0"
          :chart-data="doughnutChartData"
          :options="doughnutChartOptions"
          :height="300"
        />
        <div v-else class="view-loading">No OEE data available</div>
      </div>

      <!-- Waste Breakdown Doughnut -->
      <div class="oee-chart-container">
        <div class="chart-title">Waste by Enterprise (24h)</div>
        <DoughnutChart
          v-if="wasteChartData.labels && wasteChartData.labels.length > 0"
          :chart-data="wasteChartData"
          :options="wasteChartOptions"
          :height="300"
          @chart-click="handleWasteClick"
        />
        <div v-else class="view-loading">No waste data available</div>
      </div>
    </div>

    <!-- Chart Detail Popup -->
    <div v-if="chartDetailPopup?.show" class="chart-detail-overlay" @click="closeChartDetail">
      <div class="chart-detail-card" @click.stop>
        <button class="chart-detail-close" @click="closeChartDetail">&times;</button>
        <div class="chart-detail-header">{{ chartDetailPopup.chartType }} Details</div>
        <div class="chart-detail-body">
          <div class="chart-detail-label">{{ chartDetailPopup.label }}</div>
          <div class="chart-detail-value">{{ chartDetailPopup.value.toFixed(0) }} units</div>
          <div class="chart-detail-percentage">{{ chartDetailPopup.percentage }} of total</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.oee-drilldown-view {
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

.oee-drilldown-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 20px;
  padding: 20px;
}

.oee-big-display {
  grid-column: 1 / -1;
  text-align: center;
  padding: 32px 20px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.oee-big-label {
  font-size: 0.85rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 16px 0 24px;
}

.oee-apq-display {
  display: flex;
  gap: 24px;
  justify-content: center;
  max-width: 600px;
  margin: 0 auto 16px;
}

.oee-apq-item {
  flex: 1;
}

.oee-apq-bar-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.oee-apq-bar-fill {
  height: 100%;
  border-radius: 4px;
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

.oee-apq-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.oee-apq-label {
  font-size: 0.75rem;
  color: #999;
}

.oee-apq-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: #ccc;
}

.oee-formula {
  font-size: 0.8rem;
  color: #666;
  font-family: 'Courier New', monospace;
}

.oee-chart-container {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  padding: 20px;
  min-height: 300px;
  position: relative;
}

.chart-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #ccc;
  margin-bottom: 12px;
}

@media (max-width: 768px) {
  .oee-drilldown-layout {
    grid-template-columns: 1fr;
  }

  .oee-apq-display {
    flex-direction: column;
    gap: 12px;
  }
}

/* Chart Detail Popup */
.chart-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

.chart-detail-card {
  background: var(--bg-card);
  border: 2px solid var(--accent-cyan);
  border-radius: 12px;
  padding: 24px;
  min-width: 320px;
  max-width: 90%;
  position: relative;
  animation: slideUp 0.3s ease;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.3);
}

.chart-detail-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 1.8rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  transition: color 0.2s ease;
}

.chart-detail-close:hover {
  color: var(--accent-red);
}

.chart-detail-header {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent-cyan);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 20px;
}

.chart-detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-detail-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.chart-detail-value {
  font-family: 'Orbitron', sans-serif;
  font-size: 2rem;
  font-weight: 900;
  color: var(--accent-cyan);
  text-shadow: var(--glow-cyan);
}

.chart-detail-percentage {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1rem;
  color: var(--text-dim);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
