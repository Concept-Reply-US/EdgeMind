<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useDemoStore } from '@/stores/demo'

const demoStore = useDemoStore()
const timerInterval = ref<number | null>(null)
const customMinutes = ref<number | null>(null)
const audioEnabled = ref(true)
const timerStatus = ref('Ready')

const presets = [
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '20 min', seconds: 1200 },
  { label: '30 min', seconds: 1800 }
]

const timerDisplay = computed(() => {
  const minutes = Math.floor(demoStore.timerSeconds / 60)
  const seconds = demoStore.timerSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const isWarning = computed(() => {
  return demoStore.timerSeconds > 0 && demoStore.timerSeconds <= demoStore.timerWarningThreshold
})

function setTimerPreset(seconds: number) {
  if (demoStore.timerRunning) {
    pauseTimer()
  }
  demoStore.startTimer(seconds)
  demoStore.pauseTimer()
  timerStatus.value = 'Ready'
}

function setTimerCustom() {
  if (!customMinutes.value || customMinutes.value < 1 || customMinutes.value > 120) {
    alert('Please enter a valid duration (1-120 minutes)')
    return
  }

  const seconds = customMinutes.value * 60
  setTimerPreset(seconds)
  customMinutes.value = null
}

function startTimer() {
  if (demoStore.timerSeconds <= 0) {
    alert('Please set a timer duration first')
    return
  }

  demoStore.startTimer(demoStore.timerSeconds)
  timerStatus.value = 'Running'

  timerInterval.value = window.setInterval(() => {
    demoStore.tickTimer()

    if (demoStore.timerSeconds <= 0) {
      pauseTimer()
      timerStatus.value = "Time's Up!"

      if (audioEnabled.value) {
        playTimerAlert()
      }
    }
  }, 1000)
}

function pauseTimer() {
  demoStore.pauseTimer()
  if (timerInterval.value !== null) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
  timerStatus.value = 'Paused'
}

function resetTimer() {
  pauseTimer()
  demoStore.resetTimer()
  timerStatus.value = 'Ready'
}

function playTimerAlert() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)

    oscillator.onended = () => audioContext.close()
  } catch (error) {
    console.error('Failed to play timer alert:', error)
  }
}

async function demoResetData(type: string) {
  const confirmMessages: Record<string, string> = {
    'injected-data': 'Reset all injected data? This will stop active injections and clear demo data points.',
    'all-scenarios': 'Reset all scenarios? This will stop running scenarios and clear scenario data.',
    'full': 'FULL RESET? This will stop all scenarios and injections, and clear ALL demo data. This cannot be undone!'
  }

  if (!confirm(confirmMessages[type])) {
    return
  }

  try {
    const response = await fetch('/api/demo/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to reset data')
    }

    const data = await response.json()
    console.log('Reset completed:', data)
    alert(`Reset completed successfully:\n${JSON.stringify(data.results, null, 2)}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reset data'
    alert(`Failed to reset data: ${message}`)
    console.error('Failed to reset data:', err)
  }
}

onBeforeUnmount(() => {
  if (timerInterval.value !== null) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
})
</script>

<template>
  <div class="demo-reset-container">
    <div class="demo-header">
      <div class="demo-title">Presentation Timer & Reset</div>
      <div class="demo-subtitle">Control demo timer and reset factory data</div>
    </div>

    <div class="timer-panel">
      <h3 style="font-family: 'Orbitron', sans-serif; color: var(--persona-color); margin-bottom: 20px;">
        Presentation Timer
      </h3>

      <div class="timer-display">
        <div class="timer-value" :class="{ 'timer-warning': isWarning }" id="timer-display">
          {{ timerDisplay }}
        </div>
        <div class="timer-status" id="timer-status">{{ timerStatus }}</div>
      </div>

      <div class="timer-presets">
        <button
          v-for="preset in presets"
          :key="preset.label"
          class="timer-preset-btn"
          @click="setTimerPreset(preset.seconds)"
        >
          {{ preset.label }}
        </button>
        <input
          v-model.number="customMinutes"
          type="number"
          min="1"
          max="120"
          placeholder="Custom (min)"
          class="timer-custom-input"
          id="timer-custom-input"
          @keyup.enter="setTimerCustom"
        />
        <button class="timer-preset-btn" @click="setTimerCustom">
          SET
        </button>
      </div>

      <div class="timer-controls">
        <button
          class="timer-control-btn timer-start"
          id="timer-start-btn"
          :disabled="demoStore.timerRunning"
          @click="startTimer"
        >
          START
        </button>
        <button
          class="timer-control-btn timer-pause"
          id="timer-pause-btn"
          :disabled="!demoStore.timerRunning"
          @click="pauseTimer"
        >
          PAUSE
        </button>
        <button
          class="timer-control-btn timer-reset"
          id="timer-reset-btn"
          @click="resetTimer"
        >
          RESET
        </button>
      </div>

      <div class="timer-options">
        <label class="timer-option-checkbox">
          <input
            v-model="audioEnabled"
            type="checkbox"
            id="timer-audio-enabled"
          />
          Enable audio alert
        </label>
      </div>
    </div>

    <div class="reset-panel">
      <h3 style="font-family: 'Orbitron', sans-serif; color: var(--persona-color); margin-bottom: 20px;">
        Data Reset Controls
      </h3>

      <div class="reset-options">
        <div class="reset-option">
          <div class="reset-option-header">
            <div>
              <div class="reset-option-title">Reset Injected Data</div>
              <div class="reset-option-desc">
                Stop active injections and clear demo-injected data points. Preserves real factory data.
              </div>
            </div>
            <button
              class="reset-btn reset-btn-primary"
              @click="demoResetData('injected-data')"
            >
              RESET INJECTIONS
            </button>
          </div>
        </div>

        <div class="reset-option">
          <div class="reset-option-header">
            <div>
              <div class="reset-option-title">Reset All Scenarios</div>
              <div class="reset-option-desc">
                Stop running scenarios and clear all scenario state. Does not affect injections.
              </div>
            </div>
            <button
              class="reset-btn reset-btn-warning"
              @click="demoResetData('all-scenarios')"
            >
              RESET SCENARIOS
            </button>
          </div>
        </div>

        <div class="reset-option">
          <div class="reset-option-header">
            <div>
              <div class="reset-option-title">Full Reset</div>
              <div class="reset-option-desc">
                Stop ALL scenarios and injections, clear ALL demo data. This is a complete reset. Use with caution.
              </div>
            </div>
            <button
              class="reset-btn reset-btn-danger"
              @click="demoResetData('full')"
            >
              FULL RESET
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-reset-container {
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

.reset-panel,
.timer-panel {
  margin-bottom: 30px;
}

.timer-display {
  text-align: center;
  margin-bottom: 30px;
}

.timer-value {
  font-family: 'Share Tech Mono', monospace;
  font-size: 5rem;
  font-weight: 700;
  color: var(--persona-color);
  margin-bottom: 10px;
  text-shadow: 0 0 20px rgba(var(--persona-color-rgb), 0.5);
}

.timer-value.timer-warning {
  color: var(--accent-red);
  animation: timerFlash 1s ease-in-out infinite;
}

@keyframes timerFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.timer-status {
  font-size: 1.1rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.timer-presets {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.timer-preset-btn {
  flex: 1;
  min-width: 80px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.timer-preset-btn:hover {
  border-color: var(--persona-color);
  background: rgba(var(--persona-color-rgb), 0.1);
}

.timer-custom-input {
  flex: 1;
  min-width: 100px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
}

.timer-custom-input:focus {
  outline: none;
  border-color: var(--persona-color);
}

.timer-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.timer-control-btn {
  flex: 1;
  padding: 16px 24px;
  border: none;
  border-radius: 8px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.timer-start {
  background: var(--persona-color);
  color: var(--bg-dark);
}

.timer-start:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--persona-color-rgb), 0.4);
}

.timer-pause {
  background: var(--accent-amber);
  color: var(--bg-dark);
}

.timer-pause:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 191, 0, 0.4);
}

.timer-reset {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.timer-reset:hover {
  border-color: var(--persona-color);
  background: rgba(var(--persona-color-rgb), 0.1);
}

.timer-control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.timer-options {
  display: flex;
  justify-content: center;
}

.timer-option-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--text-dim);
  cursor: pointer;
}

.timer-option-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.reset-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.reset-option {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  transition: border-color 0.2s ease;
}

.reset-option:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.reset-option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.reset-option-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--persona-color);
  margin-bottom: 8px;
}

.reset-option-desc {
  font-size: 0.9rem;
  color: var(--text-dim);
  line-height: 1.5;
}

.reset-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.reset-btn-primary {
  background: var(--persona-color);
  color: var(--bg-dark);
}

.reset-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--persona-color-rgb), 0.4);
}

.reset-btn-warning {
  background: var(--accent-amber);
  color: var(--bg-dark);
}

.reset-btn-warning:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 191, 0, 0.4);
}

.reset-btn-danger {
  background: var(--accent-red);
  color: white;
}

.reset-btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 51, 102, 0.4);
}
</style>
