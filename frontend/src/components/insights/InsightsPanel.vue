<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useAppStore } from '@/stores/app'
import type { Insight, Anomaly } from '@/types'
import { SLEEPING_AGENT_MESSAGES } from '@/constants'

const appStore = useAppStore()
const agentPaused = ref(false)
const sleepingMessage = ref<string>(
  SLEEPING_AGENT_MESSAGES[Math.floor(Math.random() * SLEEPING_AGENT_MESSAGES.length)] ||
  'Agent on standby. Data collection continues.'
)
const filterInput = ref('')
const filtersExpanded = ref(false)

const sendAnomalyFilters = inject<(rules: string[]) => void>('sendAnomalyFilters')

const emit = defineEmits<{
  'select-anomaly': [anomaly: Anomaly]
}>()

const activeTab = ref<'all' | 'anomalies'>('all')

const displayedInsights = computed(() => {
  if (activeTab.value === 'anomalies') return []
  let insights = appStore.insights.slice().reverse()

  // Filter by enterprise if not ALL
  const selectedFactory = appStore.selectedFactory
  if (selectedFactory !== 'ALL') {
    insights = insights.filter(insight => {
      // Check if insight has enterprise field
      if ((insight as any).enterprise) {
        return (insight as any).enterprise === selectedFactory
      }
      // Check if insight text/summary contains enterprise name
      const text = (insight.summary || insight.text || '').toLowerCase()
      return text.includes(selectedFactory.toLowerCase())
    })
  }

  return insights.slice(0, 5)
})

const displayedAnomalies = computed(() => {
  if (activeTab.value !== 'anomalies') return []
  const enterprise = appStore.enterpriseParam
  let filtered = appStore.anomalies
  if (enterprise !== 'ALL') {
    filtered = filtered.filter(a => !a.enterprise || a.enterprise === enterprise)
  }
  return filtered.slice().reverse()
})

const anomalyCount = computed(() => {
  const enterprise = appStore.enterpriseParam
  if (enterprise === 'ALL') return appStore.anomalies.length
  return appStore.anomalies.filter(a => !a.enterprise || a.enterprise === enterprise).length
})

function getModelName(insight: Insight): string {
  const model = (insight as any).model?.toLowerCase() || ''
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('opus')) return 'Opus'
  if (model.includes('nova-lite')) return 'Nova Lite'
  if (model.includes('nova')) return 'Nova'
  return 'Claude'
}

function getSeverityColor(severity?: string): string {
  switch (severity) {
    case 'high': return 'var(--accent-red)'
    case 'medium': return 'var(--accent-amber)'
    default: return 'var(--accent-cyan)'
  }
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return isNaN(date.getTime()) ? '' : date.toLocaleTimeString()
}

async function togglePause() {
  const endpoint = agentPaused.value ? '/api/agent/resume' : '/api/agent/pause'
  try {
    const res = await fetch(endpoint, { method: 'POST' })
    const data = await res.json()
    agentPaused.value = data.isPaused
  } catch {
    console.error('Failed to toggle agent pause')
  }
}

function addFilter() {
  const rule = filterInput.value.trim()
  if (!rule) return

  if (appStore.anomalyFilterRules.length >= 10) {
    alert('Maximum 10 filter rules allowed')
    return
  }

  const success = appStore.addAnomalyFilterRule(rule)
  if (success) {
    filterInput.value = ''
    // Send updated filters to server
    if (sendAnomalyFilters) {
      sendAnomalyFilters(appStore.anomalyFilterRules)
    }
  }
}

function removeFilter(index: number) {
  appStore.removeAnomalyFilterRule(index)
  // Send updated filters to server
  if (sendAnomalyFilters) {
    sendAnomalyFilters(appStore.anomalyFilterRules)
  }
}

function handleFilterKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    addFilter()
  }
}

onMounted(async () => {
  try {
    const res = await fetch('/api/agent/status')
    const data = await res.json()
    agentPaused.value = data.isPaused
  } catch {}
})
</script>

<template>
  <div class="insights-panel">
    <!-- Agent Header -->
    <div class="agent-header">
      <div class="agent-avatar">AI</div>
      <div class="agent-status">
        <div class="agent-name">Edge Mind Copilot</div>
        <div class="agent-state" :style="{ color: agentPaused ? 'var(--accent-red)' : 'var(--accent-green)' }">
          {{ agentPaused ? '⏸ Analysis paused' : '● Monitoring factory data streams' }}
        </div>
      </div>
      <button class="agent-pause-btn" :class="{ paused: agentPaused }" @click="togglePause">
        <span>{{ agentPaused ? '▶ Resume' : '⏸ Pause' }}</span>
      </button>
    </div>

    <!-- Tabs -->
    <div class="insight-tabs">
      <button class="insight-tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
        All Insights
      </button>
      <button class="insight-tab" :class="{ active: activeTab === 'anomalies' }" @click="activeTab = 'anomalies'">
        Anomalies ({{ anomalyCount }})
      </button>
    </div>

    <!-- Filter Section -->
    <div class="filter-section">
      <button class="filter-toggle" @click="filtersExpanded = !filtersExpanded">
        <span>{{ filtersExpanded ? '▼' : '▶' }}</span>
        Filters ({{ appStore.anomalyFilterRules.length }})
      </button>

      <div v-if="filtersExpanded" class="filter-content">
        <div class="filter-input-group">
          <input
            v-model="filterInput"
            type="text"
            class="filter-input"
            placeholder="Add filter rule..."
            maxlength="200"
            :disabled="appStore.anomalyFilterRules.length >= 10"
            @keydown="handleFilterKeydown"
          />
          <button
            class="filter-submit-btn"
            :disabled="appStore.anomalyFilterRules.length >= 10 || !filterInput.trim()"
            @click="addFilter"
          >
            Add
          </button>
        </div>

        <div v-if="appStore.anomalyFilterRules.length > 0" class="active-filters">
          <div
            v-for="(rule, index) in appStore.anomalyFilterRules"
            :key="index"
            class="filter-chip"
          >
            <span class="filter-chip-text" :title="rule">{{ rule }}</span>
            <span class="filter-chip-remove" @click="removeFilter(index)">×</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Sleeping Message -->
    <div v-if="!appStore.insightsEnabled" class="agent-insights" style="border-left-color: var(--accent-amber)">
      <div class="insight-text" style="opacity: 0.85; font-style: italic;">
        {{ sleepingMessage }}
      </div>
      <div class="insight-meta">AI Insights: Disabled · MQTT data collection active</div>
    </div>

    <!-- Insights List -->
    <div v-else-if="activeTab === 'all'" class="insights-container">
      <div v-if="displayedInsights.length === 0" class="agent-insights">
        <div class="insight-text">Waiting for data to analyze...</div>
        <div class="insight-meta">Status: Standby</div>
      </div>
      <div
        v-for="(insight, i) in displayedInsights"
        :key="i"
        class="agent-insights"
        :style="{ borderLeftColor: getSeverityColor(insight.severity) }"
      >
        <div class="insight-text">{{ insight.summary || insight.text || 'No insight available' }}</div>
        <div class="insight-meta">
          <span style="color: var(--accent-cyan); opacity: 0.8">{{ getModelName(insight) }}</span> ·
          <span v-if="insight.anomalies?.length" style="color: var(--accent-red)">
            ⚠ {{ insight.anomalies.length }} anomalies ·
          </span>
          Confidence: {{ (insight as any).confidence || 'N/A' }} ·
          Priority: {{ insight.severity || 'low' }} ·
          {{ formatTime(insight.timestamp) }}
        </div>
      </div>
    </div>

    <!-- Anomalies List -->
    <div v-else class="insights-container">
      <div v-if="displayedAnomalies.length === 0" class="agent-insights">
        <div class="insight-text">No anomalies detected.</div>
        <div class="insight-meta">Claude analyzes trends every 30 seconds</div>
      </div>
      <div
        v-for="(anomaly, i) in displayedAnomalies"
        :key="i"
        class="anomaly-item"
        @click="emit('select-anomaly', anomaly)"
      >
        <div>{{ anomaly.description || anomaly.type || 'Anomaly detected' }}</div>
        <div class="anomaly-time">{{ formatTime(anomaly.timestamp) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Include the agent/insight styles from the CSS source */
.insights-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.insights-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.agent-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
}

.agent-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta));
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 900;
  animation: avatarPulse 2s ease-in-out infinite;
  flex-shrink: 0;
}

.agent-status { flex: 1; }

.agent-name {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--accent-cyan);
}

.agent-state {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  margin-top: 3px;
}

.agent-pause-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(0, 255, 65, 0.1);
  border: 1px solid rgba(0, 255, 65, 0.4);
  border-radius: 4px;
  color: var(--accent-green);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.agent-pause-btn:hover {
  background: rgba(0, 255, 65, 0.2);
  border-color: var(--accent-green);
}

.agent-pause-btn.paused {
  background: rgba(255, 50, 50, 0.15);
  border-color: rgba(255, 50, 50, 0.5);
  color: var(--accent-red);
}

.insight-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.insight-tab {
  padding: 8px 16px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 4px;
  color: var(--text-primary);
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.insight-tab:hover {
  background: rgba(0, 255, 255, 0.2);
  border-color: var(--accent-cyan);
}

.insight-tab.active {
  background: rgba(0, 255, 255, 0.3);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.agent-insights {
  background: rgba(0, 255, 255, 0.05);
  border-left: 3px solid var(--accent-cyan);
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.insight-text {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary);
}

.insight-meta {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-top: 10px;
}

.anomaly-item {
  background: rgba(255, 51, 102, 0.1);
  border-left: 3px solid var(--accent-red);
  padding: 10px 15px;
  margin-bottom: 10px;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.anomaly-item:hover {
  background: rgba(255, 51, 102, 0.2);
}

.anomaly-time {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-top: 5px;
}

@keyframes avatarPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.4); }
  50% { box-shadow: 0 0 30px rgba(255, 0, 255, 0.6); }
}

/* Filter Section */
.filter-section {
  margin-bottom: 15px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
}

.filter-toggle {
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: var(--accent-cyan);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.filter-toggle:hover {
  background: rgba(0, 255, 255, 0.05);
}

.filter-toggle span:first-child {
  font-size: 0.7rem;
  opacity: 0.7;
}

.filter-content {
  padding: 12px;
  border-top: 1px solid rgba(0, 255, 255, 0.2);
}

.filter-input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.filter-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 4px;
  color: var(--text-primary);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
}

.filter-input:focus {
  outline: none;
  border-color: var(--accent-cyan);
  background: rgba(0, 0, 0, 0.6);
}

.filter-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filter-submit-btn {
  padding: 8px 16px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 4px;
  color: var(--accent-cyan);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-submit-btn:hover:not(:disabled) {
  background: rgba(0, 255, 255, 0.2);
  border-color: var(--accent-cyan);
}

.filter-submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 12px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  color: var(--text-primary);
}

.filter-chip-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-chip-remove {
  cursor: pointer;
  color: var(--accent-red);
  font-size: 1.1rem;
  line-height: 1;
  transition: opacity 0.2s;
}

.filter-chip-remove:hover {
  opacity: 0.7;
}
</style>
