<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useDemoStore } from '@/stores/demo'

const demoStore = useDemoStore()
const loading = ref(true)
const error = ref<string | null>(null)
const scenarioStatusInterval = ref<number | null>(null)

interface ScenarioStatus {
  active: boolean
  scenario?: {
    id: string
    name: string
    description: string
    durationMinutes: number
  }
  timing?: {
    progress: number
    elapsedMs: number
    remainingMs: number
  }
  steps?: Array<{
    topic: string
    elapsedMs: number
  }>
}

const scenarioStatus = ref<ScenarioStatus>({ active: false })

async function loadScenarios() {
  try {
    loading.value = true
    error.value = null
    const response = await fetch('/api/demo/scenarios')
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    demoStore.setScenarios(data.scenarios || [])
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load scenarios'
    console.error('Failed to load scenarios:', err)
  } finally {
    loading.value = false
  }
}

async function updateScenarioStatus() {
  try {
    const response = await fetch('/api/demo/status')
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    scenarioStatus.value = data
  } catch (err) {
    console.error('Failed to update scenario status:', err)
  }
}

async function launchScenario(scenarioId: string) {
  try {
    const response = await fetch(`/api/demo/scenarios/${scenarioId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to launch scenario')
    }

    console.log('Scenario launched:', scenarioId)
    await updateScenarioStatus()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to launch scenario'
    alert(`Failed to launch scenario: ${message}`)
    console.error('Failed to launch scenario:', err)
  }
}

async function stopScenario() {
  try {
    if (!scenarioStatus.value.scenario?.id) return

    const response = await fetch(`/api/demo/scenarios/${scenarioStatus.value.scenario.id}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to stop scenario')
    }

    console.log('Scenario stopped')
    await updateScenarioStatus()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to stop scenario'
    alert(`Failed to stop scenario: ${message}`)
    console.error('Failed to stop scenario:', err)
  }
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function isScenarioActive(scenarioId: string): boolean {
  return scenarioStatus.value.active && scenarioStatus.value.scenario?.id === scenarioId
}

function getScenarioProgress(scenarioId: string): number {
  if (!isScenarioActive(scenarioId)) return 0
  return scenarioStatus.value.timing?.progress || 0
}

function getScenarioElapsed(scenarioId: string): string {
  if (!isScenarioActive(scenarioId)) return '0:00'
  return formatMs(scenarioStatus.value.timing?.elapsedMs || 0)
}

function getScenarioRemaining(scenarioId: string): string {
  if (!isScenarioActive(scenarioId)) return '0:00'
  return formatMs(scenarioStatus.value.timing?.remainingMs || 0)
}

function getCurrentStep(scenarioId: string): string {
  if (!isScenarioActive(scenarioId)) return ''
  const steps = scenarioStatus.value.steps || []
  const activeSteps = steps.filter(s => s.elapsedMs < 999999)
  if (activeSteps.length === 0) return ''
  const firstStep = activeSteps[0]
  if (!firstStep) return ''
  const topic = firstStep.topic.split('/').pop() || ''
  return `Step ${activeSteps.length}/${steps.length}: ${topic}`
}

onMounted(async () => {
  await loadScenarios()
  await updateScenarioStatus()
  scenarioStatusInterval.value = window.setInterval(updateScenarioStatus, 2000)
})

onBeforeUnmount(() => {
  if (scenarioStatusInterval.value !== null) {
    clearInterval(scenarioStatusInterval.value)
    scenarioStatusInterval.value = null
  }
})
</script>

<template>
  <div class="demo-scenarios-container">
    <div class="demo-header">
      <div class="demo-title">Demo Scenarios</div>
      <div class="demo-subtitle">Launch pre-configured factory scenarios for demonstrations</div>
    </div>

    <div v-if="loading" class="scenario-loading">Loading scenarios...</div>
    <div v-else-if="error" class="scenario-loading" style="color: var(--accent-red);">
      Failed to load scenarios: {{ error }}
    </div>
    <div v-else-if="demoStore.scenarios.length === 0" class="scenario-loading">
      No scenarios available
    </div>
    <div v-else class="scenario-grid">
      <div
        v-for="scenario in demoStore.scenarios"
        :key="scenario.id"
        class="scenario-card"
      >
        <div class="scenario-card-header">
          <div class="scenario-name">{{ scenario.name }}</div>
          <div class="scenario-duration-badge">{{ scenario.duration || 10 }} min</div>
        </div>
        <div class="scenario-description">{{ scenario.description }}</div>

        <div v-if="isScenarioActive(scenario.id)" class="scenario-progress">
          <div class="scenario-progress-bar">
            <div
              class="scenario-progress-fill"
              :style="{ width: `${getScenarioProgress(scenario.id)}%` }"
            ></div>
          </div>
          <div class="scenario-progress-text">
            <span>{{ getScenarioElapsed(scenario.id) }}</span>
            <span>{{ getScenarioRemaining(scenario.id) }}</span>
          </div>
          <div v-if="getCurrentStep(scenario.id)" class="scenario-current-step">
            {{ getCurrentStep(scenario.id) }}
          </div>
        </div>

        <button
          v-if="!isScenarioActive(scenario.id)"
          class="scenario-btn"
          :disabled="scenarioStatus.active"
          @click="launchScenario(scenario.id)"
        >
          LAUNCH SCENARIO
        </button>
        <button
          v-if="isScenarioActive(scenario.id)"
          class="scenario-btn scenario-btn-stop"
          @click="stopScenario"
        >
          STOP SCENARIO
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-scenarios-container {
  padding: 40px 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.demo-header {
  margin-bottom: 30px;
  text-align: center;
}

.demo-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--persona-color);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 3px;
}

.demo-subtitle {
  font-size: 1rem;
  color: var(--text-dim);
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 20px;
}

.scenario-card {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  position: relative;
}

.scenario-card:hover {
  border-color: var(--persona-color);
  box-shadow: 0 0 20px rgba(var(--persona-color-rgb), 0.3);
}

.scenario-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.scenario-name {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--persona-color);
  margin-bottom: 4px;
}

.scenario-duration-badge {
  background: rgba(var(--persona-color-rgb), 0.2);
  border: 1px solid var(--persona-color);
  border-radius: 12px;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--persona-color);
  white-space: nowrap;
}

.scenario-description {
  font-size: 0.95rem;
  color: var(--text-dim);
  margin-bottom: 16px;
  line-height: 1.5;
}

.scenario-progress {
  margin-bottom: 12px;
}

.scenario-progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.scenario-progress-fill {
  height: 100%;
  background: var(--persona-color);
  border-radius: 4px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(var(--persona-color-rgb), 0.5);
}

.scenario-progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.scenario-current-step {
  font-size: 0.85rem;
  color: var(--persona-color);
  margin-top: 8px;
  font-style: italic;
}

.scenario-btn {
  width: 100%;
  padding: 12px 20px;
  background: var(--persona-color);
  color: var(--bg-dark);
  border: none;
  border-radius: 8px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.scenario-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--persona-color-rgb), 0.4);
}

.scenario-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-dim);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.scenario-btn-stop {
  background: var(--accent-red);
  margin-top: 8px;
}

.scenario-loading {
  text-align: center;
  padding: 40px;
  color: var(--text-dim);
  font-size: 1.1rem;
}
</style>
