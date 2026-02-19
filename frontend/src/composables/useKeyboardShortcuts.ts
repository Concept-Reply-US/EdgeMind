import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { usePersonaStore } from '@/stores/persona'
import type { PersonaType } from '@/types'

export function useKeyboardShortcuts() {
  const router = useRouter()
  const personaStore = usePersonaStore()

  const defaultRoutes: Record<PersonaType, string> = {
    coo: 'coo-dashboard',
    plant: 'plant-line-status',
    demo: 'demo-scenarios'
  }

  function handleKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

    const keyMap: Record<string, PersonaType> = { '1': 'coo', '2': 'plant', '3': 'demo' }
    const persona = keyMap[e.key]
    if (persona) {
      personaStore.setPersona(persona)
      router.push({ name: defaultRoutes[persona] })
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
