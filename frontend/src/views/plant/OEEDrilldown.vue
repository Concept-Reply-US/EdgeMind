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
const loading = ref(true)
const error = ref<string | null>(null)
let refreshInterval: number | null = null

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

async function fetchAndRender(): Promise<void> {
  try {
    error.value = null
    if (!oeeData.value) {
      loading.value = true
    }

    const enterprise = appStore.enterpriseParam
    const url = enterprise !== 'ALL' ? `/api/oee/v2?enterprise=${encodeURIComponent(enterprise)}` : '/api/oee/v2'

    const [oeeRes, linesData] = await Promise.all([
      fetch(url),
      fetchLineOEE()
    ])

    if (!oeeRes.ok) throw new Error(`OEE v2: ${oeeRes.status}`)

    oeeData.value = await oeeRes.json()

    if (linesData?.lines) {
      lines.value = linesData.lines
    }
  } catch (err) {
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
})
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
  grid-template-rows: auto 1fr;
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
</style>
