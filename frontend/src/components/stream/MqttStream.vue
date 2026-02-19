<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAppStore } from '@/stores/app'
import { escapeHtml } from '@/utils'
import type { MqttMessage } from '@/types'

const appStore = useAppStore()
const streamRef = ref<HTMLElement | null>(null)

type EventFilterType = 'all' | 'oee' | 'state' | 'alarm'
const activeFilter = ref<EventFilterType>('all')

function getEventType(topic: string): string {
  const lower = topic.toLowerCase()
  if (lower.includes('oee')) return 'oee'
  if (lower.includes('state')) return 'state'
  if (lower.includes('alarm')) return 'alarm'
  return 'other'
}

const filteredMessages = computed(() => {
  let msgs = appStore.messages
  if (activeFilter.value !== 'all') {
    msgs = msgs.filter(m => getEventType(m.topic) === activeFilter.value)
  }
  return msgs.slice(-30)
})

function formatTimestamp(ts?: string): string {
  if (!ts) return ''
  const date = new Date(ts)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatPayload(msg: MqttMessage): string {
  if (typeof msg.value === 'object') return escapeHtml(JSON.stringify(msg.value))
  return escapeHtml(String(msg.value))
}

function togglePause() {
  appStore.streamPaused = !appStore.streamPaused
}

// Auto-scroll when new messages arrive
watch(() => appStore.messages.length, async () => {
  if (appStore.streamPaused || !streamRef.value) return
  await nextTick()
  streamRef.value.scrollTop = streamRef.value.scrollHeight
})
</script>

<template>
  <div class="mqtt-stream-panel">
    <!-- Filter Tabs -->
    <div class="event-filter-tabs">
      <button
        v-for="filter in (['all', 'oee', 'state', 'alarm'] as EventFilterType[])"
        :key="filter"
        class="event-tab"
        :class="{ active: activeFilter === filter }"
        @click="activeFilter = filter"
      >
        {{ filter === 'all' ? 'All Events' : filter.toUpperCase() }}
      </button>
      <button
        class="event-tab pause-btn"
        :class="{ paused: appStore.streamPaused }"
        @click="togglePause"
      >
        {{ appStore.streamPaused ? '▶ Resume' : '⏸ Pause' }}
      </button>
    </div>

    <!-- Stream Container -->
    <div
      ref="streamRef"
      class="stream-container"
      :class="{ paused: appStore.streamPaused }"
    >
      <div
        v-for="(msg, i) in filteredMessages"
        :key="i"
        class="stream-line"
      >
        <span class="stream-timestamp">[{{ formatTimestamp(msg.timestamp) }}]</span>
        <span class="stream-topic">{{ msg.topic }}</span>
        <span class="stream-value">{{ formatPayload(msg) }}</span>
      </div>
      <div v-if="filteredMessages.length === 0" class="stream-empty">
        Waiting for MQTT messages...
      </div>
    </div>
  </div>
</template>

<style scoped>
.mqtt-stream-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.event-filter-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.event-tab {
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

.event-tab:hover {
  background: rgba(0, 255, 255, 0.2);
  border-color: var(--accent-cyan);
}

.event-tab.active {
  background: rgba(0, 255, 255, 0.3);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.event-tab.pause-btn {
  margin-left: auto;
  background: rgba(255, 165, 0, 0.1);
  border-color: rgba(255, 165, 0, 0.3);
  color: var(--accent-amber);
}

.event-tab.pause-btn:hover {
  background: rgba(255, 165, 0, 0.2);
  border-color: var(--accent-amber);
}

.event-tab.pause-btn.paused {
  background: rgba(255, 0, 0, 0.2);
  border-color: var(--accent-red);
  color: var(--accent-red);
}

.stream-container {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 4px;
  padding: 15px;
  flex: 1;
  max-height: 350px;
  overflow-y: auto;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
}

.stream-container::-webkit-scrollbar { width: 8px; }
.stream-container::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.3); }
.stream-container::-webkit-scrollbar-thumb { background: var(--accent-cyan); border-radius: 4px; }

.stream-container.paused {
  border: 2px solid var(--accent-red);
  position: relative;
}

.stream-line {
  margin-bottom: 8px;
  animation: streamEntry 0.3s ease-out;
}

.stream-timestamp { color: var(--accent-amber); }
.stream-topic { color: var(--accent-magenta); margin: 0 8px; }
.stream-value { color: var(--accent-cyan); }

.stream-empty {
  color: var(--text-dim);
  text-align: center;
  padding: 40px 0;
  font-style: italic;
}

@keyframes streamEntry {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
