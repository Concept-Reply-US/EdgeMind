<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useConnectionStore } from '@/stores/connection'
import { useOEE } from '@/composables/useOEE'
import { useQuality } from '@/composables/useQuality'
import { useEquipment } from '@/composables/useEquipment'
import Card from '@/components/ui/Card.vue'
import OEEGauge from '@/components/charts/OEEGauge.vue'
import BarChart from '@/components/charts/BarChart.vue'
import InsightsPanel from '@/components/insights/InsightsPanel.vue'
import MqttStream from '@/components/stream/MqttStream.vue'
import AnomalyModal from '@/components/modals/AnomalyModal.vue'
import { formatNumber } from '@/utils'
import type {
  Anomaly,
  ChartData,
  ChartOptions,
  FactoryStatusEnterprise,
  BatchStatusResponse
} from '@/types'

const appStore = useAppStore()
const connectionStore = useConnectionStore()
const { fetchOEE, fetchOEEBreakdown, fetchFactoryStatus, fetchBatchStatus } = useOEE()
const { fetchWasteTrends, fetchScrapByLine, fetchQualityMetrics, fetchActiveSensorCount } = useQuality()
const { fetchEquipmentStates } = useEquipment()

const oeeValue = ref(0)
const oeeStatus = ref('')
const showAnomalyModal = ref(false)
const selectedAnomaly = ref<Anomaly | null>(null)
const factoryStatus = ref<{ enterprises?: FactoryStatusEnterprise[] }>({ enterprises: [] })

// Chart click detail state
const chartDetailPopup = ref<{
  show: boolean
  label: string
  value: number
  percentage: string
  chartType: string
} | null>(null)

// Chart data refs
const oeeBreakdownData = ref<ChartData<'bar'>>({
  labels: ['Enterprise A', 'Enterprise B', 'Enterprise C'],
  datasets: [{
    label: 'OEE %',
    data: [0, 0, 0],
    backgroundColor: ['rgba(0,255,255,0.6)', 'rgba(255,0,255,0.6)', 'rgba(255,191,0,0.6)'],
    borderColor: ['rgba(0,255,255,1)', 'rgba(255,0,255,1)', 'rgba(255,191,0,1)'],
    borderWidth: 2
  }]
})

const wasteTrendData = ref<ChartData<'bar'>>({
  labels: [],
  datasets: [{
    label: 'Total Waste (24h)',
    data: [],
    backgroundColor: [] as string[],
    borderColor: [] as string[],
    borderWidth: 2
  }]
})

const scrapData = ref<ChartData<'bar'>>({
  labels: [],
  datasets: [{
    label: 'Scrap by Line',
    data: [],
    backgroundColor: 'rgba(239, 68, 68, 0.6)',
    borderColor: 'rgba(239, 68, 68, 1)',
    borderWidth: 2
  }]
})

interface QualityCard {
  name: string
  shortName: string
  avg: string
  trend: string
  trendArrow: string
  total: string
  status: 'good' | 'warning' | 'critical'
}

const qualityCards = ref<QualityCard[]>([])
const batchStatus = ref<BatchStatusResponse | null>(null)

// AbortController for canceling in-flight requests
let abortController: AbortController | null = null

// Factory selector
const factories = [
  { key: 'ALL', label: 'ALL ENTERPRISES', status: 'Combined View' },
  { key: 'Enterprise A', label: 'ENTERPRISE A', status: 'Glass Manufacturing' },
  { key: 'Enterprise B', label: 'ENTERPRISE B', status: 'Beverage' },
  { key: 'Enterprise C', label: 'ENTERPRISE C', status: 'Pharma' }
]

function selectFactory(factory: string) {
  appStore.selectFactory(factory)
  refreshAll()
}

const dataRate = computed(() => {
  const perSec = connectionStore.messageRate
  const perMin = perSec * 60
  return formatNumber(perMin) + '/min'
})

const equipmentSummary = computed(() => {
  let running = 0
  let idle = 0
  let faulted = 0
  let total = 0

  appStore.equipmentStates.forEach((equipment) => {
    // Filter by selected factory if not ALL
    if (appStore.selectedFactory !== 'ALL' && equipment.enterprise !== appStore.selectedFactory) {
      return
    }

    total++
    const stateName = (equipment.state || '').toLowerCase()

    if (stateName === 'running' || stateName === 'execute') {
      running++
    } else if (stateName === 'fault' || stateName === 'faulted') {
      faulted++
    } else {
      idle++
    }
  })

  return { running, idle, faulted, total }
})

async function refreshAll() {
  // Abort previous in-flight requests
  if (abortController) {
    abortController.abort()
  }

  // Create new AbortController for this refresh
  abortController = new AbortController()
  const signal = abortController.signal

  const [oeeResult, breakdownResult, wasteTrends, scrapByLine, quality, factoryStatusResult, batchResult] = await Promise.allSettled([
    fetchOEE(signal),
    fetchOEEBreakdown(signal),
    fetchWasteTrends(signal),
    fetchScrapByLine(signal),
    fetchQualityMetrics(signal),
    fetchFactoryStatus(signal),
    fetchBatchStatus(signal)
  ])

  fetchEquipmentStates(signal)
  fetchActiveSensorCount(signal)

  if (oeeResult.status === 'fulfilled' && oeeResult.value) {
    const data = oeeResult.value
    oeeValue.value = data.average ?? 0
    oeeStatus.value = data.period ? `${data.period} avg` : '24h avg'
  }

  if (breakdownResult.status === 'fulfilled' && breakdownResult.value?.data) {
    const d = breakdownResult.value.data
    oeeBreakdownData.value = {
      labels: ['Enterprise A', 'Enterprise B', 'Enterprise C'],
      datasets: [{
        label: 'OEE %',
        data: [d['Enterprise A']?.oee || 0, d['Enterprise B']?.oee || 0, d['Enterprise C']?.oee || 0],
        backgroundColor: ['rgba(0,255,255,0.6)', 'rgba(255,0,255,0.6)', 'rgba(255,191,0,0.6)'],
        borderColor: ['rgba(0,255,255,1)', 'rgba(255,0,255,1)', 'rgba(255,191,0,1)'],
        borderWidth: 2
      }]
    }
  }

  if (wasteTrends.status === 'fulfilled' && wasteTrends.value?.summary) {
    const summary = wasteTrends.value.summary
    const enterprises = Object.keys(summary)
    const totals = enterprises.map(e => summary[e]?.total || 0)
    const trends = enterprises.map(e => summary[e]?.trend || 'stable')
    const barColors = trends.map(t => {
      if (t === 'rising') return 'rgba(239, 68, 68, 0.6)'
      if (t === 'falling') return 'rgba(16, 185, 129, 0.6)'
      return 'rgba(245, 158, 11, 0.6)'
    })
    const borderColors = trends.map(t => {
      if (t === 'rising') return 'rgba(239, 68, 68, 1)'
      if (t === 'falling') return 'rgba(16, 185, 129, 1)'
      return 'rgba(245, 158, 11, 1)'
    })

    wasteTrendData.value = {
      labels: enterprises,
      datasets: [{
        label: 'Total Waste (24h)',
        data: totals,
        backgroundColor: barColors,
        borderColor: borderColors,
        borderWidth: 2
      }]
    }
  }

  if (scrapByLine.status === 'fulfilled' && scrapByLine.value?.lines) {
    const lines = scrapByLine.value.lines
    scrapData.value = {
      labels: lines.map(l => `${l.line} (${l.site})`),
      datasets: [{
        label: 'Scrap by Line',
        data: lines.map(l => l.total),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2
      }]
    }
  }

  if (quality.status === 'fulfilled' && quality.value?.summary) {
    const summary = quality.value.summary
    qualityCards.value = Object.entries(summary).map(([name, data]) => {
      // Enterprise-specific thresholds (matching old frontend logic)
      let status: 'good' | 'warning' | 'critical'
      if (name === 'Enterprise C') {
        status = data.avg < 50 ? 'good' : data.avg < 100 ? 'warning' : 'critical'
      } else if (name === 'Enterprise B') {
        status = data.avg < 50000 ? 'good' : data.avg < 100000 ? 'warning' : 'critical'
      } else {
        status = data.avg < 500000 ? 'good' : data.avg < 750000 ? 'warning' : 'critical'
      }

      // Trend arrows
      const trendArrow = data.trend === 'rising' ? '↑' : data.trend === 'falling' ? '↓' : '→'

      return {
        name,
        shortName: name.replace('Enterprise ', 'Ent. '),
        avg: formatNumber(data.avg),
        trend: data.trend,
        trendArrow,
        total: formatNumber(data.total),
        status
      }
    })
  }

  if (factoryStatusResult.status === 'fulfilled' && factoryStatusResult.value) {
    factoryStatus.value = factoryStatusResult.value
  }

  if (batchResult.status === 'fulfilled' && batchResult.value) {
    batchStatus.value = batchResult.value
  }
}

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0,255,255,0.1)' },
      ticks: { color: '#6b7280' }
    },
    x: {
      grid: { display: false },
      ticks: { color: '#6b7280' }
    }
  }
}

let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  refreshAll()
  refreshInterval = setInterval(refreshAll, 30000)
})

onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval)
  if (abortController) abortController.abort()
})

function onSelectAnomaly(anomaly: Anomaly) {
  selectedAnomaly.value = anomaly
  showAnomalyModal.value = true
}

function handleWasteClick(payload: { label: string; value: number }) {
  const dataset = wasteTrendData.value.datasets[0]
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

function handleScrapClick(payload: { label: string; value: number }) {
  const dataset = scrapData.value.datasets[0]
  if (!dataset) return
  const total = dataset.data.reduce((sum: number, v) => sum + ((v as number) || 0), 0)
  const percentage = total > 0 ? ((payload.value / total) * 100).toFixed(1) : '0'

  chartDetailPopup.value = {
    show: true,
    label: payload.label,
    value: payload.value,
    percentage: percentage + '%',
    chartType: 'Scrap'
  }
}

function closeChartDetail() {
  chartDetailPopup.value = null
}

function getStateClass(state: string): string {
  const stateLower = state.toLowerCase()
  if (stateLower.includes('run')) return 'state-running'
  if (stateLower.includes('complete') || stateLower.includes('done')) return 'state-complete'
  if (stateLower.includes('fault') || stateLower.includes('error') || stateLower.includes('alarm')) return 'state-fault'
  return 'state-idle'
}
</script>

<template>
  <div class="coo-dashboard">
    <!-- Factory Selector -->
    <div class="factory-overview">
      <div class="factory-selector">
        <button
          v-for="factory in factories"
          :key="factory.key"
          class="factory-btn"
          :class="{ active: appStore.selectedFactory === factory.key }"
          @click="selectFactory(factory.key)"
        >
          {{ factory.label }}
          <div class="factory-status">{{ factory.status }}</div>
        </button>
      </div>
    </div>

    <!-- Metrics Bar -->
    <div class="metrics-bar">
      <div class="metric-item">
        <div class="metric-value">{{ formatNumber(appStore.stats.messageCount) }}</div>
        <div class="metric-label">Message Count</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">{{ formatNumber(appStore.activeSensorCount) }}</div>
        <div class="metric-label">Active Sensors</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">{{ formatNumber(appStore.stats.anomalyCount) }}</div>
        <div class="metric-label">Anomaly Count</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">{{ dataRate }}</div>
        <div class="metric-label">Data Rate</div>
      </div>
    </div>

    <!-- Equipment Summary Bar -->
    <div class="equipment-summary">
      <div class="equipment-summary-item">
        <span class="equipment-count equipment-running">{{ equipmentSummary.running }}</span>
        <span class="equipment-status-label">Running</span>
      </div>
      <div class="equipment-summary-item">
        <span class="equipment-count equipment-idle">{{ equipmentSummary.idle }}</span>
        <span class="equipment-status-label">Idle / Stopped</span>
      </div>
      <div class="equipment-summary-item">
        <span class="equipment-count equipment-faulted">{{ equipmentSummary.faulted }}</span>
        <span class="equipment-status-label">Faulted / Down</span>
      </div>
      <div class="equipment-summary-item">
        <span class="equipment-count equipment-total">{{ equipmentSummary.total }}</span>
        <span class="equipment-status-label">Total Equipment</span>
      </div>
    </div>

    <!-- Dashboard Grid -->
    <div class="dashboard-grid">
      <Card title="Overall Equipment Effectiveness" :span="6">
        <OEEGauge :value="oeeValue" :size="180" />
        <div class="oee-status">{{ oeeStatus }}</div>
      </Card>

      <Card v-if="appStore.selectedFactory === 'ALL'" title="OEE Breakdown by Enterprise" :span="6">
        <BarChart :chart-data="oeeBreakdownData" :options="chartOptions" :height="280" />
      </Card>

      <Card title="AI Insights" :span="6">
        <InsightsPanel @select-anomaly="onSelectAnomaly" />
      </Card>

      <Card title="Live Data Stream" :span="6">
        <MqttStream />
      </Card>

      <Card title="Waste Trends" :span="6">
        <BarChart :chart-data="wasteTrendData" :options="chartOptions" :height="280" @chart-click="handleWasteClick" />
      </Card>

      <Card title="Scrap by Line" :span="6">
        <BarChart :chart-data="scrapData" :options="chartOptions" :height="280" @chart-click="handleScrapClick" />
      </Card>

      <Card title="Production Heatmap" :span="12">
        <div v-if="!factoryStatus.enterprises || factoryStatus.enterprises.length === 0" class="heatmap-loading">
          No factory data available
        </div>
        <div v-else class="heatmap-container">
          <div
            v-for="enterprise in factoryStatus.enterprises"
            :key="enterprise.name"
            class="enterprise-group"
          >
            <div class="enterprise-header" :class="enterprise.status">
              <div class="enterprise-name">{{ enterprise.name }}</div>
              <div class="enterprise-oee" :class="enterprise.status">
                {{ enterprise.oee !== null && enterprise.oee !== undefined ? `${enterprise.oee}%` : 'N/A' }}
              </div>
            </div>
            <div class="sites-grid">
              <div
                v-for="site in enterprise.sites"
                :key="`${enterprise.name}-${site.name}`"
                class="site-card"
                :class="site.status"
              >
                <div class="site-name">{{ site.name }}</div>
                <div class="site-oee" :class="site.status">
                  {{ site.oee !== null && site.oee !== undefined ? `${site.oee}%` : 'N/A' }}
                </div>
                <div class="site-status">{{ site.status }}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Quality Metrics" :span="12">
        <div class="quality-grid">
          <div
            v-for="card in qualityCards"
            :key="card.name"
            class="quality-card"
            :class="`quality-${card.status}`"
          >
            <div class="quality-name">{{ card.shortName }}</div>
            <div class="quality-avg">{{ card.avg }}</div>
            <div class="quality-trend">{{ card.trendArrow }} {{ card.trend }}</div>
            <div class="quality-total">24h Total: {{ card.total }}</div>
          </div>
        </div>
      </Card>

      <Card title="Batch Operations (Enterprise C)" :span="12">
        <div v-if="!batchStatus || !batchStatus.equipment || batchStatus.equipment.length === 0" class="batch-empty">
          No active batches
        </div>
        <div v-else>
          <!-- Batch Summary Bar -->
          <div class="batch-summary">
            <div class="batch-summary-item">
              <span class="batch-count batch-running">{{ batchStatus.summary?.running || 0 }}</span>
              <span class="batch-label">Running</span>
            </div>
            <div class="batch-summary-item">
              <span class="batch-count batch-idle">{{ batchStatus.summary?.idle || 0 }}</span>
              <span class="batch-label">Idle</span>
            </div>
            <div class="batch-summary-item">
              <span class="batch-count batch-complete">{{ batchStatus.summary?.complete || 0 }}</span>
              <span class="batch-label">Complete</span>
            </div>
            <div class="batch-summary-item">
              <span class="batch-count batch-fault">{{ batchStatus.summary?.fault || 0 }}</span>
              <span class="batch-label">Fault</span>
            </div>
            <div class="batch-summary-item">
              <span class="batch-count batch-total">{{ batchStatus.summary?.total || 0 }}</span>
              <span class="batch-label">Total</span>
            </div>
          </div>

          <!-- Batch Equipment Grid -->
          <div class="batch-grid">
            <div
              v-for="equipment in batchStatus.equipment"
              :key="equipment.id"
              class="batch-equipment-card"
            >
              <div class="batch-equipment-header">
                <div class="batch-equipment-name">{{ equipment.name }}</div>
                <div class="batch-equipment-type">{{ equipment.type }}</div>
              </div>
              <div class="batch-equipment-body">
                <div class="batch-equipment-row">
                  <span class="batch-equipment-label">State:</span>
                  <span class="batch-equipment-value" :class="getStateClass(equipment.state)">{{ equipment.state }}</span>
                </div>
                <div v-if="equipment.phase" class="batch-equipment-row">
                  <span class="batch-equipment-label">Phase:</span>
                  <span class="batch-equipment-value">{{ equipment.phase }}</span>
                </div>
                <div v-if="equipment.batchId" class="batch-equipment-row">
                  <span class="batch-equipment-label">Batch ID:</span>
                  <span class="batch-equipment-value batch-id">{{ equipment.batchId }}</span>
                </div>
                <div v-if="equipment.recipe" class="batch-equipment-row">
                  <span class="batch-equipment-label">Recipe:</span>
                  <span class="batch-equipment-value">{{ equipment.recipe }}</span>
                </div>
              </div>
              <div class="batch-equipment-footer">
                <span class="batch-equipment-site">{{ equipment.site }}</span>
              </div>
            </div>
          </div>

          <!-- Cleanroom Zones (if available) -->
          <div v-if="batchStatus.cleanroom && batchStatus.cleanroom.length > 0" class="cleanroom-section">
            <div class="cleanroom-header">Cleanroom Environmental Zones</div>
            <div class="cleanroom-grid">
              <div
                v-for="zone in batchStatus.cleanroom"
                :key="zone.name"
                class="cleanroom-zone-card"
                :class="`cleanroom-${(zone.status || 'Good').toLowerCase()}`"
              >
                <div class="cleanroom-zone-name">{{ zone.name }}</div>
                <div class="cleanroom-zone-metrics">
                  <div v-if="zone.temperature != null" class="cleanroom-metric">
                    <span class="cleanroom-metric-label">Temp:</span>
                    <span class="cleanroom-metric-value">{{ zone.temperature.toFixed(1) }}°C</span>
                  </div>
                  <div v-if="zone.humidity != null" class="cleanroom-metric">
                    <span class="cleanroom-metric-label">Humidity:</span>
                    <span class="cleanroom-metric-value">{{ zone.humidity.toFixed(1) }}%</span>
                  </div>
                  <div v-if="zone.pm25 != null" class="cleanroom-metric">
                    <span class="cleanroom-metric-label">PM2.5:</span>
                    <span class="cleanroom-metric-value">{{ zone.pm25.toFixed(2) }}</span>
                  </div>
                </div>
                <div v-if="zone.status" class="cleanroom-zone-status" :class="`cleanroom-${zone.status.toLowerCase()}`">
                  {{ zone.status }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <AnomalyModal :show="showAnomalyModal" :anomaly="selectedAnomaly" @close="showAnomalyModal = false" />

    <!-- Chart Detail Popup -->
    <div v-if="chartDetailPopup?.show" class="chart-detail-overlay" @click="closeChartDetail">
      <div class="chart-detail-card" @click.stop>
        <button class="chart-detail-close" @click="closeChartDetail">&times;</button>
        <div class="chart-detail-header">{{ chartDetailPopup.chartType }} Details</div>
        <div class="chart-detail-body">
          <div class="chart-detail-label">{{ chartDetailPopup.label }}</div>
          <div class="chart-detail-value">{{ formatNumber(chartDetailPopup.value) }} units</div>
          <div class="chart-detail-percentage">{{ chartDetailPopup.percentage }} of total</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coo-dashboard {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.factory-overview {
  grid-column: span 12;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(255, 0, 255, 0.05));
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.factory-selector {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.factory-btn {
  flex: 1;
  min-width: 200px;
  padding: 20px;
  background: rgba(0, 255, 255, 0.05);
  border: 2px solid var(--accent-cyan);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  text-transform: uppercase;
  position: relative;
}

.factory-btn:hover {
  background: rgba(0, 255, 255, 0.15);
  box-shadow: var(--glow-cyan);
  transform: scale(1.05);
}

.factory-btn.active {
  background: rgba(0, 255, 255, 0.2);
  border-color: var(--accent-magenta);
  box-shadow: var(--glow-magenta);
}

.factory-status {
  font-size: 0.8rem;
  color: var(--accent-green);
  margin-top: 8px;
  font-family: 'Share Tech Mono', monospace;
}

.metrics-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  justify-content: space-around;
  background: var(--bg-card);
  border: 1px solid rgba(0, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.metric-value {
  font-family: 'Orbitron', sans-serif;
  font-size: 2.5rem;
  font-weight: 900;
  color: var(--accent-cyan);
  margin: 15px 0 5px 0;
  text-shadow: var(--glow-cyan);
}

.metric-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
}

.oee-status {
  text-align: center;
  margin-top: 10px;
  font-size: 0.85rem;
  color: var(--text-dim);
  text-transform: uppercase;
}

.quality-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 10px;
}

.quality-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.quality-card.quality-good {
  border-left: 4px solid var(--accent-green);
}

.quality-card.quality-warning {
  border-left: 4px solid var(--accent-amber);
}

.quality-card.quality-critical {
  border-left: 4px solid var(--accent-red);
}

.quality-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.quality-avg {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 5px;
}

.quality-good .quality-avg {
  color: var(--accent-green);
}

.quality-warning .quality-avg {
  color: var(--accent-amber);
}

.quality-critical .quality-avg {
  color: var(--accent-red);
}

.quality-trend,
.quality-total {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.equipment-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  justify-content: space-around;
  background: var(--bg-card);
  border: 1px solid rgba(0, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px 20px;
}

.equipment-summary-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.equipment-count {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  padding: 5px 15px;
  border-radius: 6px;
  min-width: 50px;
  text-align: center;
}

.equipment-running {
  color: var(--accent-green);
  background: rgba(16, 185, 129, 0.15);
}

.equipment-idle {
  color: var(--accent-amber);
  background: rgba(245, 158, 11, 0.15);
}

.equipment-faulted {
  color: var(--accent-red);
  background: rgba(239, 68, 68, 0.15);
}

.equipment-total {
  color: var(--accent-cyan);
  background: rgba(0, 255, 255, 0.15);
}

.equipment-status-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(6, 1fr);
  }

  .metrics-bar {
    flex-wrap: wrap;
  }

  .equipment-summary {
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .factory-selector {
    flex-direction: column;
  }

  .quality-grid {
    grid-template-columns: 1fr;
  }
}

/* Production Heatmap */
.heatmap-container {
  margin-top: 10px;
}

.heatmap-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  font-family: 'Share Tech Mono', monospace;
  color: var(--text-dim);
}

.enterprise-group {
  margin-bottom: 20px;
}

.enterprise-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: rgba(0, 255, 255, 0.1);
  border-left: 4px solid var(--accent-cyan);
  border-radius: 4px;
  margin-bottom: 10px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
}

.enterprise-header.healthy {
  background: rgba(0, 255, 136, 0.1);
  border-left-color: var(--accent-green);
}

.enterprise-header.warning {
  background: rgba(255, 191, 0, 0.1);
  border-left-color: var(--accent-amber);
}

.enterprise-header.critical {
  background: rgba(255, 51, 102, 0.1);
  border-left-color: var(--accent-red);
}

.enterprise-name {
  font-size: 1rem;
  color: var(--text-primary);
}

.enterprise-oee {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.1rem;
  font-weight: 700;
}

.enterprise-oee.healthy {
  color: var(--accent-green);
}

.enterprise-oee.warning {
  color: var(--accent-amber);
}

.enterprise-oee.critical {
  color: var(--accent-red);
}

.sites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  padding-left: 20px;
}

.site-card {
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.site-card.healthy {
  border-color: var(--accent-green);
  background: rgba(0, 255, 136, 0.05);
}

.site-card.warning {
  border-color: var(--accent-amber);
  background: rgba(255, 191, 0, 0.05);
}

.site-card.critical {
  border-color: var(--accent-red);
  background: rgba(255, 51, 102, 0.05);
}

.site-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
}

.site-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.site-oee {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.3rem;
  font-weight: 900;
}

.site-oee.healthy {
  color: var(--accent-green);
}

.site-oee.warning {
  color: var(--accent-amber);
}

.site-oee.critical {
  color: var(--accent-red);
}

.site-status {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 4px;
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

/* Batch Operations Styles */
.batch-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  font-family: 'Share Tech Mono', monospace;
  color: var(--text-dim);
  font-size: 0.9rem;
}

.batch-summary {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  justify-content: space-around;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  backdrop-filter: blur(10px);
}

.batch-summary-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.batch-count {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 6px;
  min-width: 45px;
  text-align: center;
}

.batch-running {
  color: var(--accent-green);
  background: rgba(16, 185, 129, 0.15);
}

.batch-idle {
  color: var(--accent-amber);
  background: rgba(245, 158, 11, 0.15);
}

.batch-complete {
  color: var(--accent-cyan);
  background: rgba(0, 255, 255, 0.15);
}

.batch-fault {
  color: var(--accent-red);
  background: rgba(239, 68, 68, 0.15);
}

.batch-total {
  color: var(--accent-magenta);
  background: rgba(255, 0, 255, 0.15);
}

.batch-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.8rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.batch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.batch-equipment-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.batch-equipment-card:hover {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
  transform: translateY(-2px);
}

.batch-equipment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.batch-equipment-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.batch-equipment-type {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
}

.batch-equipment-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.batch-equipment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-equipment-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.8rem;
  color: var(--text-dim);
  text-transform: uppercase;
}

.batch-equipment-value {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.batch-equipment-value.state-running {
  color: var(--accent-green);
  font-weight: 700;
}

.batch-equipment-value.state-complete {
  color: var(--accent-cyan);
  font-weight: 700;
}

.batch-equipment-value.state-fault {
  color: var(--accent-red);
  font-weight: 700;
}

.batch-equipment-value.state-idle {
  color: var(--accent-amber);
  font-weight: 700;
}

.batch-equipment-value.batch-id {
  font-family: 'Orbitron', sans-serif;
  color: var(--accent-magenta);
  font-size: 0.85rem;
  letter-spacing: 1px;
}

.batch-equipment-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.batch-equipment-site {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  color: var(--text-dim);
}

.cleanroom-section {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.cleanroom-header {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent-cyan);
  text-transform: uppercase;
  margin-bottom: 15px;
  letter-spacing: 1px;
}

.cleanroom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.cleanroom-zone-card {
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid;
  border-radius: 8px;
  padding: 15px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.cleanroom-zone-card.cleanroom-good {
  border-color: var(--accent-green);
  background: rgba(0, 255, 136, 0.05);
}

.cleanroom-zone-card.cleanroom-warning {
  border-color: var(--accent-amber);
  background: rgba(255, 191, 0, 0.05);
}

.cleanroom-zone-card.cleanroom-critical {
  border-color: var(--accent-red);
  background: rgba(255, 51, 102, 0.05);
}

.cleanroom-zone-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 255, 255, 0.2);
}

.cleanroom-zone-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.cleanroom-zone-metrics {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.cleanroom-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cleanroom-metric-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
}

.cleanroom-metric-value {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-cyan);
}

.cleanroom-zone-status {
  text-align: center;
  padding: 6px;
  border-radius: 4px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}

.cleanroom-zone-status.cleanroom-good {
  background: rgba(16, 185, 129, 0.2);
  color: var(--accent-green);
}

.cleanroom-zone-status.cleanroom-warning {
  background: rgba(245, 158, 11, 0.2);
  color: var(--accent-amber);
}

.cleanroom-zone-status.cleanroom-critical {
  background: rgba(239, 68, 68, 0.2);
  color: var(--accent-red);
}
</style>
