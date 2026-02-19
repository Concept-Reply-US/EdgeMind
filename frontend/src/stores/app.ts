import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  MqttMessage, Insight, Anomaly, Stats, OEEData,
  EquipmentState, ThresholdSettings, CesmiiWorkOrder,
  InsightFilter, EventFilter
} from '@/types'

export const useAppStore = defineStore('app', () => {
  const messages = ref<MqttMessage[]>([])
  const insights = ref<Insight[]>([])
  const anomalies = ref<Anomaly[]>([])
  const stats = ref<Stats>({
    messageCount: 0,
    anomalyCount: 0,
    lastUpdate: null
  })
  const latestOee = ref<OEEData | null>(null)
  const uniqueTopics = ref<Set<string>>(new Set())
  const messageRateHistory = ref<number[]>([])
  const topicCounts = ref<Record<string, number>>({})
  const enterpriseCounts = ref<Record<string, number>>({
    'Enterprise A': 0,
    'Enterprise B': 0,
    'Enterprise C': 0
  })
  const selectedFactory = ref<string>(
    (() => {
      try { return localStorage.getItem('edgemind_selectedFactory') || 'ALL' }
      catch { return 'ALL' }
    })()
  )
  const insightFilter = ref<InsightFilter>('all')
  const eventFilter = ref<EventFilter>('all')
  const equipmentStates = ref<Map<string, EquipmentState>>(new Map())
  const streamPaused = ref(false)
  const anomalyFilters = ref<string[]>([])
  const thresholdSettings = ref<ThresholdSettings>({
    oeeBaseline: 70,
    oeeWorldClass: 85,
    availabilityMin: 65,
    defectRateWarning: 2,
    defectRateCritical: 5
  })
  const cesmiiWorkOrders = ref<CesmiiWorkOrder[]>([])
  const insightsEnabled = ref(true)

  // Computed
  const filteredInsights = computed(() => {
    if (insightFilter.value === 'all') return insights.value
    return insights.value.filter(i => {
      if (insightFilter.value === 'anomalies') return i.anomalies && i.anomalies.length > 0
      return true
    })
  })

  const enterpriseParam = computed(() => {
    return selectedFactory.value === 'ALL' ? 'ALL' : selectedFactory.value
  })

  const activeSensorCount = computed(() => uniqueTopics.value.size)

  // Actions
  function addMessage(msg: MqttMessage) {
    messages.value.push(msg)
    stats.value.messageCount++
    if (messages.value.length > 100) {
      messages.value.shift()
    }
    uniqueTopics.value.add(topicToMeasurement(msg.topic))

    const entMatch = msg.topic.match(/^(Enterprise [ABC])\//i)
    if (entMatch && entMatch[1]) {
      const enterprise = entMatch[1]
      enterpriseCounts.value[enterprise] = (enterpriseCounts.value[enterprise] || 0) + 1
    }
  }

  function addInsight(insight: Insight) {
    insights.value.push(insight)
    if (insights.value.length > 10) {
      insights.value.shift()
    }
    if (insight.anomalies && insight.anomalies.length > 0) {
      anomalies.value.push(...insight.anomalies)
      stats.value.anomalyCount += insight.anomalies.length
    }
  }

  function setInitialState(data: {
    recentMessages?: MqttMessage[]
    recentInsights?: Insight[]
    recentAnomalies?: Anomaly[]
    stats?: Stats
    anomalyFilters?: string[]
    thresholdSettings?: ThresholdSettings
    cesmiiWorkOrders?: CesmiiWorkOrder[]
    insightsEnabled?: boolean
  }) {
    const enterprise = enterpriseParam.value
    let msgs = data.recentMessages || []
    if (enterprise !== 'ALL') {
      msgs = msgs.filter(msg => (msg.topic || '').startsWith(enterprise + '/'))
    }
    messages.value = msgs
    insights.value = data.recentInsights || []
    anomalies.value = data.recentAnomalies || []
    if (data.stats) stats.value = data.stats
    if (data.anomalyFilters) anomalyFilters.value = data.anomalyFilters
    if (data.thresholdSettings) thresholdSettings.value = data.thresholdSettings
    if (data.cesmiiWorkOrders) cesmiiWorkOrders.value = data.cesmiiWorkOrders
    if (data.insightsEnabled !== undefined) insightsEnabled.value = data.insightsEnabled
  }

  function selectFactory(factory: string) {
    if (selectedFactory.value === factory) return
    selectedFactory.value = factory
    try { localStorage.setItem('edgemind_selectedFactory', factory) } catch {}
    messages.value = []
    enterpriseCounts.value = { 'Enterprise A': 0, 'Enterprise B': 0, 'Enterprise C': 0 }
    uniqueTopics.value.clear()
  }

  function updateEquipmentState(equipment: EquipmentState) {
    equipmentStates.value.set(equipment.id, equipment)
  }

  function setAnomalyFilters(filters: string[]) {
    anomalyFilters.value = filters
  }

  function setThresholdSettings(settings: ThresholdSettings) {
    thresholdSettings.value = settings
  }

  function addCesmiiWorkOrder(order: CesmiiWorkOrder) {
    cesmiiWorkOrders.value.unshift(order)
    if (cesmiiWorkOrders.value.length > 50) {
      cesmiiWorkOrders.value.pop()
    }
  }

  return {
    messages, insights, anomalies, stats, latestOee,
    uniqueTopics, messageRateHistory, topicCounts,
    enterpriseCounts, selectedFactory, insightFilter,
    eventFilter, equipmentStates, streamPaused,
    anomalyFilters, thresholdSettings, cesmiiWorkOrders,
    insightsEnabled,
    // computed
    filteredInsights, enterpriseParam, activeSensorCount,
    // actions
    addMessage, addInsight, setInitialState, selectFactory,
    updateEquipmentState, setAnomalyFilters, setThresholdSettings,
    addCesmiiWorkOrder
  }
})

function topicToMeasurement(topic: string): string {
  const parts = topic.split('/')
  if (parts.length >= 2) {
    return parts.slice(-2).join('_')
  }
  return topic
}
