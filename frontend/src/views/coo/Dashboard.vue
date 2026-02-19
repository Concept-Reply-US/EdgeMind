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
import type { Anomaly, ChartData, ChartOptions } from '@/types'

const appStore = useAppStore()
const connectionStore = useConnectionStore()
const { fetchOEE, fetchOEEBreakdown } = useOEE()
const { fetchWasteTrends, fetchScrapByLine, fetchQualityMetrics, fetchActiveSensorCount } = useQuality()
const { fetchEquipmentStates } = useEquipment()

const oeeValue = ref(0)
const oeeStatus = ref('')
const showAnomalyModal = ref(false)
const selectedAnomaly = ref<Anomaly | null>(null)

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
  const [oeeResult, breakdownResult, wasteTrends, scrapByLine, quality] = await Promise.allSettled([
    fetchOEE(),
    fetchOEEBreakdown(),
    fetchWasteTrends(),
    fetchScrapByLine(),
    fetchQualityMetrics()
  ])

  fetchEquipmentStates()
  fetchActiveSensorCount()

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
})

function onSelectAnomaly(anomaly: Anomaly) {
  selectedAnomaly.value = anomaly
  showAnomalyModal.value = true
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
        <BarChart :chart-data="wasteTrendData" :options="chartOptions" :height="280" />
      </Card>

      <Card title="Scrap by Line" :span="6">
        <BarChart :chart-data="scrapData" :options="chartOptions" :height="280" />
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
    </div>

    <AnomalyModal :show="showAnomalyModal" :anomaly="selectedAnomaly" @close="showAnomalyModal = false" />
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
</style>
