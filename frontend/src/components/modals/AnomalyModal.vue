<script setup lang="ts">
import { computed } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import type { Anomaly } from '@/types'

const props = defineProps<{
  show: boolean
  anomaly: Anomaly | null
}>()

const emit = defineEmits<{
  close: []
}>()

const severityClass = computed(() => props.anomaly?.severity || 'medium')

const formattedTimestamp = computed(() => {
  if (!props.anomaly?.timestamp) return 'Just now'
  const date = new Date(props.anomaly.timestamp)
  if (isNaN(date.getTime())) return 'Just now'
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
})
</script>

<template>
  <Modal :show="show" title="Anomaly Details" max-width="600px" @close="emit('close')">
    <template v-if="anomaly">
      <div class="anomaly-detail">
        <div class="anomaly-severity-badge" :class="severityClass">
          {{ anomaly.severity?.toUpperCase() || 'MEDIUM' }}
        </div>
        <div class="anomaly-timestamp">{{ formattedTimestamp }}</div>
        <div class="anomaly-description">
          {{ anomaly.description || 'No description available' }}
        </div>
        <div v-if="anomaly.enterprise || anomaly.site || anomaly.machine || anomaly.metric" class="anomaly-metadata">
          <div v-if="anomaly.enterprise" class="metadata-item">
            <span class="metadata-label">Enterprise:</span> {{ anomaly.enterprise }}
          </div>
          <div v-if="anomaly.site" class="metadata-item">
            <span class="metadata-label">Site:</span> {{ anomaly.site }}
          </div>
          <div v-if="anomaly.machine" class="metadata-item">
            <span class="metadata-label">Machine:</span> {{ anomaly.machine }}
          </div>
          <div v-if="anomaly.metric" class="metadata-item">
            <span class="metadata-label">Metric:</span> {{ anomaly.metric }}
          </div>
          <div v-if="anomaly.value != null" class="metadata-item">
            <span class="metadata-label">Actual Value:</span> {{ anomaly.value }}
          </div>
          <div v-if="anomaly.threshold != null" class="metadata-item">
            <span class="metadata-label">Threshold:</span> {{ anomaly.threshold }}
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.anomaly-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.anomaly-severity-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  width: fit-content;
}

.anomaly-severity-badge.critical {
  background: rgba(255, 51, 102, 0.2);
  color: var(--accent-red);
  border: 1px solid var(--accent-red);
}

.anomaly-severity-badge.high {
  background: rgba(255, 51, 102, 0.15);
  color: var(--accent-red);
  border: 1px solid rgba(255, 51, 102, 0.5);
}

.anomaly-severity-badge.medium {
  background: rgba(255, 191, 0, 0.2);
  color: var(--accent-amber);
  border: 1px solid var(--accent-amber);
}

.anomaly-severity-badge.low {
  background: rgba(0, 255, 255, 0.1);
  color: var(--accent-cyan);
  border: 1px solid rgba(0, 255, 255, 0.3);
}

.anomaly-timestamp {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.anomaly-description {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary);
}

.anomaly-metadata {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-item {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.metadata-label {
  color: var(--text-dim);
  font-weight: 600;
  margin-right: 8px;
}
</style>
