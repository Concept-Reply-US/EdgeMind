import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PersonaType } from '@/types'
import { PERSONA_DEFAULTS } from '@/constants'

export const usePersonaStore = defineStore('persona', () => {
  const activePersona = ref<PersonaType>('coo')
  const activeView = ref(PERSONA_DEFAULTS.coo)

  const theme = computed(() => activePersona.value)

  function setPersona(persona: PersonaType) {
    activePersona.value = persona
    activeView.value = PERSONA_DEFAULTS[persona]
  }

  function setView(view: string) {
    activeView.value = view
  }

  return {
    activePersona, activeView, theme,
    setPersona, setView
  }
})
