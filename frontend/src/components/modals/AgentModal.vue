<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { Insight, Anomaly } from '@/types'

const props = defineProps<{
  show: boolean
  insights: Insight[]
  anomalies: Anomaly[]
}>()

const emit = defineEmits<{
  close: []
}>()

type FilterTab = 'all' | 'anomalies' | 'trends' | 'info'

const activeFilter = ref<FilterTab>('all')

const filteredInsights = computed(() => {
  let filtered = props.insights

  switch (activeFilter.value) {
    case 'anomalies':
      filtered = filtered.filter(i => i.anomalies && i.anomalies.length > 0)
      break
    case 'trends':
      filtered = filtered.filter(i => {
        const text = (i.summary || i.text || '').toLowerCase()
        return text.includes('trend') || text.includes('increase') || text.includes('decrease') ||
               text.includes('rising') || text.includes('falling')
      })
      break
    case 'info':
      filtered = filtered.filter(i => (!i.anomalies || i.anomalies.length === 0) && i.severity === 'low')
      break
  }

  return filtered.slice().reverse()
})

const anomalyCount = computed(() => {
  return props.insights.filter(i => i.anomalies && i.anomalies.length > 0).length
})

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.show) {
    emit('close')
  }
}

function handleBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('agent-modal-overlay')) {
    emit('close')
  }
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getModelName(insight: Insight): string {
  const model = insight.model?.toLowerCase() || ''
  if (model.includes('sonnet')) return 'Sonnet'
  if (model.includes('haiku')) return 'Haiku'
  if (model.includes('opus')) return 'Opus'
  if (model.includes('nova-lite')) return 'Nova Lite'
  if (model.includes('nova')) return 'Nova'
  return 'Claude'
}

function getSeverityColor(severity?: string): string {
  switch (severity) {
    case 'critical': return 'var(--accent-red)'
    case 'high': return 'var(--accent-red)'
    case 'medium': return 'var(--accent-amber)'
    default: return 'var(--accent-cyan)'
  }
}

watch(() => props.show, (visible) => {
  if (visible) {
    document.addEventListener('keydown', handleEscape)
  } else {
    document.removeEventListener('keydown', handleEscape)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="agent-modal-fade">
      <div
        v-if="show"
        class="agent-modal-overlay"
        @click="handleBackdropClick"
      >
        <div class="agent-modal-container">
          <div class="agent-modal-header">
            <h3 class="agent-modal-title">Edge Mind Copilot - All Insights</h3>
            <button class="agent-modal-close" @click="emit('close')" title="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="agent-modal-filters">
            <button
              class="filter-tab"
              :class="{ active: activeFilter === 'all' }"
              @click="activeFilter = 'all'"
            >
              All Insights
            </button>
            <button
              class="filter-tab"
              :class="{ active: activeFilter === 'anomalies' }"
              @click="activeFilter = 'anomalies'"
            >
              Anomalies
              <span v-if="anomalyCount > 0" class="filter-badge">{{ anomalyCount }}</span>
            </button>
            <button
              class="filter-tab"
              :class="{ active: activeFilter === 'trends' }"
              @click="activeFilter = 'trends'"
            >
              Trends
            </button>
            <button
              class="filter-tab"
              :class="{ active: activeFilter === 'info' }"
              @click="activeFilter = 'info'"
            >
              Info
            </button>
          </div>

          <div class="agent-modal-body">
            <div v-if="filteredInsights.length === 0" class="empty-state">
              <div class="empty-icon">🔍</div>
              <div class="empty-text">No insights match this filter</div>
            </div>

            <div
              v-for="(insight, i) in filteredInsights"
              :key="i"
              class="insight-card"
              :style="{ borderLeftColor: getSeverityColor(insight.severity) }"
            >
              <div class="insight-header">
                <span class="insight-model">{{ getModelName(insight) }}</span>
                <span class="insight-time">{{ formatTime(insight.timestamp) }}</span>
              </div>
              <div class="insight-text">{{ insight.summary || insight.text || 'No insight available' }}</div>
              <div class="insight-footer">
                <span v-if="insight.anomalies?.length" class="insight-badge anomaly-badge">
                  ⚠ {{ insight.anomalies.length }} anomalies
                </span>
                <span class="insight-badge severity-badge" :style="{ color: getSeverityColor(insight.severity) }">
                  {{ insight.severity || 'low' }}
                </span>
                <span v-if="insight.confidence" class="insight-badge">
                  {{ insight.confidence }} confidence
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.agent-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.agent-modal-container {
  background: var(--bg-card);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  width: 90vw;
  max-width: 1200px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 60px rgba(0, 255, 255, 0.3);
  overflow: hidden;
}

.agent-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 2px solid rgba(0, 255, 255, 0.2);
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(255, 0, 255, 0.05));
  flex-shrink: 0;
}

.agent-modal-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--accent-cyan);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.agent-modal-close {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.agent-modal-close:hover {
  color: var(--accent-red);
  background: rgba(255, 51, 102, 0.15);
  transform: scale(1.1);
}

.agent-modal-filters {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
}

.filter-tab {
  padding: 10px 20px;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.filter-tab:hover {
  background: rgba(0, 255, 255, 0.1);
  border-color: var(--accent-cyan);
}

.filter-tab.active {
  background: rgba(0, 255, 255, 0.2);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
}

.filter-badge {
  background: var(--accent-red);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
}

.agent-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-text {
  font-size: 1.1rem;
  color: var(--text-dim);
  font-family: 'Share Tech Mono', monospace;
}

.insight-card {
  background: rgba(0, 0, 0, 0.4);
  border-left: 3px solid var(--accent-cyan);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.insight-card:hover {
  background: rgba(0, 0, 0, 0.5);
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.2);
  transform: translateX(4px);
}

.insight-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.insight-model {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-cyan);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.insight-time {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.insight-text {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.insight-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.insight-badge {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.anomaly-badge {
  background: rgba(255, 51, 102, 0.15);
  border-color: rgba(255, 51, 102, 0.4);
  color: var(--accent-red);
}

.severity-badge {
  text-transform: capitalize;
}

/* Transitions */
.agent-modal-fade-enter-active,
.agent-modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.agent-modal-fade-enter-active .agent-modal-container,
.agent-modal-fade-leave-active .agent-modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.agent-modal-fade-enter-from,
.agent-modal-fade-leave-to {
  opacity: 0;
}

.agent-modal-fade-enter-from .agent-modal-container,
.agent-modal-fade-leave-to .agent-modal-container {
  transform: scale(0.9) translateY(-20px);
  opacity: 0;
}

/* Custom scrollbar */
.agent-modal-body::-webkit-scrollbar {
  width: 10px;
}

.agent-modal-body::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
}

.agent-modal-body::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.3);
  border-radius: 5px;
}

.agent-modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 255, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .agent-modal-container {
    width: 95vw;
    height: 95vh;
  }

  .agent-modal-header {
    padding: 15px 18px;
  }

  .agent-modal-title {
    font-size: 1rem;
  }

  .agent-modal-filters {
    padding: 12px 18px;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filter-tab {
    padding: 8px 14px;
    font-size: 0.85rem;
  }

  .agent-modal-body {
    padding: 18px;
  }

  .insight-card {
    padding: 16px;
  }
}
</style>
