import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DemoScenario, AnomalyProfile } from '@/types'

export const useDemoStore = defineStore('demo', () => {
  const scenarios = ref<DemoScenario[]>([])
  const profiles = ref<AnomalyProfile[]>([])
  const activeScenario = ref<DemoScenario | null>(null)
  const activeInjections = ref<unknown[]>([])
  const timerSeconds = ref(0)
  const timerRunning = ref(false)
  const timerWarningThreshold = ref(120)

  function setScenarios(list: DemoScenario[]) {
    scenarios.value = list
  }

  function setProfiles(list: AnomalyProfile[]) {
    profiles.value = list
  }

  function setActiveScenario(scenario: DemoScenario | null) {
    activeScenario.value = scenario
  }

  function tickTimer() {
    if (timerRunning.value && timerSeconds.value > 0) {
      timerSeconds.value--
    }
  }

  function startTimer(seconds: number) {
    timerSeconds.value = seconds
    timerRunning.value = true
  }

  function pauseTimer() {
    timerRunning.value = false
  }

  function resetTimer() {
    timerSeconds.value = 0
    timerRunning.value = false
  }

  return {
    scenarios, profiles, activeScenario, activeInjections,
    timerSeconds, timerRunning, timerWarningThreshold,
    setScenarios, setProfiles, setActiveScenario,
    tickTimer, startTimer, pauseTimer, resetTimer
  }
})
