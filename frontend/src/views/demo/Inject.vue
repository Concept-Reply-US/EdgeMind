<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useDemoStore } from '@/stores/demo'

const demoStore = useDemoStore()
const loading = ref(true)
const error = ref<string | null>(null)
const injectionStatusInterval = ref<number | null>(null)

interface InjectionStatus {
  count: number
  maxConcurrent: number
  active: Array<{
    id: string
    equipment: string
    anomalyType: string
    severity: string
    timing: {
      progress: number
      elapsedMs: number
      remainingMs: number
    }
  }>
}

interface EquipmentOption {
  value: string
  label: string
  enterprise: string
}

const injectionStatus = ref<InjectionStatus>({
  count: 0,
  maxConcurrent: 10,
  active: []
})

const selectedType = ref('')
const selectedEquipment = ref('')
const severity = ref(2)
const duration = ref(60)
const equipmentOptions = ref<EquipmentOption[]>([])

const severityMap: Record<string, string> = {
  '1': 'mild',
  '2': 'moderate',
  '3': 'severe'
}

async function loadProfiles() {
  try {
    loading.value = true
    error.value = null
    const response = await fetch('/api/demo/profiles')
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    demoStore.setProfiles(data.profiles || [])
    if (demoStore.profiles.length > 0 && demoStore.profiles[0]) {
      selectedType.value = demoStore.profiles[0].type
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load profiles'
    console.error('Failed to load profiles:', err)
  } finally {
    loading.value = false
  }
}

async function loadEquipment() {
  try {
    const response = await fetch('/api/schema/hierarchy')
    if (!response.ok) {
      throw new Error(`Failed to fetch hierarchy: ${response.status}`)
    }

    const data = await response.json()
    const hierarchy = data.hierarchy

    if (!hierarchy || Object.keys(hierarchy).length === 0) {
      console.warn('No equipment data available')
      return
    }

    const options: EquipmentOption[] = []
    const enterprises = Object.keys(hierarchy).sort()

    for (const enterprise of enterprises) {
      const enterpriseData = hierarchy[enterprise]
      for (const siteName in enterpriseData.sites) {
        const site = enterpriseData.sites[siteName]
        for (const areaName in site.areas) {
          const area = site.areas[areaName]
          for (const machineName in area.machines) {
            const fullPath = `${enterprise}/${siteName}/${areaName}/${machineName}`
            const label = `${siteName} > ${areaName} > ${machineName}`
            options.push({ value: fullPath, label, enterprise })
          }
        }
      }
    }

    options.sort((a, b) => a.label.localeCompare(b.label))
    equipmentOptions.value = options
  } catch (err) {
    console.error('Failed to load equipment:', err)
  }
}

async function updateInjectionStatus() {
  try {
    const response = await fetch('/api/demo/inject/status')
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    injectionStatus.value = data
  } catch (err) {
    console.error('Failed to update injection status:', err)
  }
}

async function startInjection() {
  if (!selectedEquipment.value) {
    alert('Please select an equipment from the dropdown')
    return
  }

  if (!selectedType.value) {
    alert('Please select an anomaly type')
    return
  }

  try {
    const response = await fetch('/api/demo/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipment: selectedEquipment.value,
        anomalyType: selectedType.value,
        severity: severityMap[severity.value.toString()],
        durationMs: duration.value * 1000
      })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to start injection')
    }

    console.log('Injection started')
    await updateInjectionStatus()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start injection'
    alert(`Failed to start injection: ${message}`)
    console.error('Failed to start injection:', err)
  }
}

async function stopInjection(injectionId: string) {
  try {
    const response = await fetch('/api/demo/inject/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ injectionId })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to stop injection')
    }

    console.log('Injection stopped:', injectionId)
    await updateInjectionStatus()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to stop injection'
    alert(`Failed to stop injection: ${message}`)
    console.error('Failed to stop injection:', err)
  }
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function groupedEquipment() {
  const grouped: Record<string, EquipmentOption[]> = {}
  for (const option of equipmentOptions.value) {
    if (!grouped[option.enterprise]) {
      grouped[option.enterprise] = []
    }
    const group = grouped[option.enterprise]
    if (group) {
      group.push(option)
    }
  }
  return grouped
}

onMounted(async () => {
  await Promise.all([loadProfiles(), loadEquipment()])
  await updateInjectionStatus()
  injectionStatusInterval.value = window.setInterval(updateInjectionStatus, 2000)
})

onBeforeUnmount(() => {
  if (injectionStatusInterval.value !== null) {
    clearInterval(injectionStatusInterval.value)
    injectionStatusInterval.value = null
  }
})
</script>

<template>
  <div class="demo-inject-container">
    <div class="demo-header">
      <div class="demo-title">Anomaly Injection</div>
      <div class="demo-subtitle">Inject controlled anomalies into factory data streams</div>
    </div>

    <div class="inject-panel">
      <div v-if="loading" class="scenario-loading">Loading profiles...</div>
      <div v-else-if="error" class="scenario-loading" style="color: var(--accent-red);">
        Failed to load profiles: {{ error }}
      </div>
      <div v-else class="inject-form">
        <div class="inject-field">
          <label class="inject-label">Equipment</label>
          <select v-model="selectedEquipment" class="inject-input inject-select">
            <option value="" disabled>Select equipment...</option>
            <optgroup
              v-for="(options, enterprise) in groupedEquipment()"
              :key="enterprise"
              :label="enterprise"
            >
              <option
                v-for="option in options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </optgroup>
          </select>
        </div>

        <div class="inject-field">
          <label class="inject-label">Anomaly Type</label>
          <div class="inject-radio-group" id="inject-anomaly-types">
            <div
              v-for="profile in demoStore.profiles"
              :key="profile.type"
              class="inject-radio-option"
            >
              <input
                :id="`type-${profile.type}`"
                v-model="selectedType"
                type="radio"
                name="anomaly-type"
                :value="profile.type"
              />
              <label class="inject-radio-label" :for="`type-${profile.type}`">
                {{ profile.type }}
                <div style="font-size: 0.75rem; opacity: 0.7; margin-top: 4px;">
                  {{ profile.description }}
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="inject-field">
          <label class="inject-label">Severity</label>
          <div class="severity-slider-container">
            <input
              v-model="severity"
              type="range"
              min="1"
              max="3"
              step="1"
              class="severity-slider"
              id="inject-severity"
            />
            <div class="severity-labels">
              <span>Mild</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>
        </div>

        <div class="inject-field">
          <label class="inject-label">Duration</label>
          <div class="duration-slider-container">
            <div class="duration-value">
              <span id="inject-duration-value">{{ duration }}</span> seconds
            </div>
            <input
              v-model="duration"
              type="range"
              min="30"
              max="600"
              step="30"
              class="duration-slider"
              id="inject-duration"
            />
          </div>
        </div>

        <button
          class="inject-btn"
          id="inject-start-btn"
          :disabled="injectionStatus.count >= injectionStatus.maxConcurrent"
          @click="startInjection"
        >
          INJECT ANOMALY
        </button>

        <div class="inject-status">
          <span class="inject-status-label">Active Injections:</span>
          <span id="inject-concurrent-count">{{ injectionStatus.count }}</span> /
          <span id="inject-concurrent-max">{{ injectionStatus.maxConcurrent }}</span>
        </div>
      </div>
    </div>

    <div class="active-injections-panel">
      <h3 style="font-family: 'Orbitron', sans-serif; color: var(--persona-color); margin-bottom: 20px;">
        Active Injections
      </h3>
      <div id="active-injections-list">
        <div v-if="injectionStatus.active.length === 0" class="no-injections">
          No active injections
        </div>
        <div
          v-for="inj in injectionStatus.active"
          :key="inj.id"
          class="injection-item"
        >
          <div class="injection-header">
            <div class="injection-title">
              {{ inj.equipment }} - {{ inj.anomalyType }} ({{ inj.severity }})
            </div>
            <button class="injection-stop-btn" @click="stopInjection(inj.id)">
              STOP
            </button>
          </div>
          <div class="injection-details">
            <div class="injection-detail">
              <strong>Equipment</strong>
              {{ inj.equipment }}
            </div>
            <div class="injection-detail">
              <strong>Type</strong>
              {{ inj.anomalyType }}
            </div>
            <div class="injection-detail">
              <strong>Severity</strong>
              {{ inj.severity }}
            </div>
            <div class="injection-detail">
              <strong>Remaining</strong>
              {{ formatMs(inj.timing.remainingMs) }}
            </div>
          </div>
          <div class="injection-progress-bar">
            <div
              class="injection-progress-fill"
              :style="{ width: `${Math.min(100, Math.max(0, inj.timing.progress))}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-inject-container {
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

.inject-panel,
.active-injections-panel {
  margin-bottom: 30px;
}

.inject-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.inject-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inject-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--persona-color);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.inject-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

.inject-input:focus {
  outline: none;
  border-color: var(--persona-color);
  box-shadow: 0 0 10px rgba(var(--persona-color-rgb), 0.3);
}

.inject-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23f0a500' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.inject-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.inject-radio-option {
  flex: 1;
  min-width: 140px;
}

.inject-radio-option input[type="radio"] {
  display: none;
}

.inject-radio-label {
  display: block;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  text-transform: capitalize;
}

.inject-radio-option input[type="radio"]:checked + .inject-radio-label {
  background: rgba(var(--persona-color-rgb), 0.2);
  border-color: var(--persona-color);
  color: var(--persona-color);
}

.inject-radio-label:hover {
  border-color: var(--persona-color);
}

.severity-slider-container,
.duration-slider-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.severity-slider,
.duration-slider {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  outline: none;
}

.severity-slider::-webkit-slider-thumb,
.duration-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: var(--persona-color);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(var(--persona-color-rgb), 0.5);
}

.severity-slider::-moz-range-thumb,
.duration-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: var(--persona-color);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 0 10px rgba(var(--persona-color-rgb), 0.5);
}

.severity-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.duration-value {
  text-align: center;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--persona-color);
  font-family: 'Share Tech Mono', monospace;
}

.inject-btn {
  width: 100%;
  padding: 16px 24px;
  background: var(--persona-color);
  color: var(--bg-dark);
  border: none;
  border-radius: 8px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 10px;
}

.inject-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(var(--persona-color-rgb), 0.4);
}

.inject-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-dim);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.inject-status {
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-dim);
}

.inject-status-label {
  margin-right: 8px;
}

.no-injections {
  text-align: center;
  padding: 40px;
  color: var(--text-dim);
  font-size: 0.95rem;
}

.injection-item {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: border-color 0.2s ease;
}

.injection-item:hover {
  border-color: var(--persona-color);
}

.injection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.injection-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--persona-color);
}

.injection-stop-btn {
  padding: 6px 16px;
  background: var(--accent-red);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
}

.injection-stop-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(255, 51, 102, 0.4);
}

.injection-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
  font-size: 0.85rem;
}

.injection-detail {
  color: var(--text-dim);
}

.injection-detail strong {
  color: var(--text-primary);
  display: block;
  margin-bottom: 2px;
}

.injection-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.injection-progress-fill {
  height: 100%;
  background: var(--persona-color);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.scenario-loading {
  text-align: center;
  padding: 40px;
  color: var(--text-dim);
  font-size: 1.1rem;
}
</style>
