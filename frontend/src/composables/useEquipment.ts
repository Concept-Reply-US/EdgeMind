import { useAppStore } from '@/stores/app'

interface EquipmentResponse {
  states?: Array<{
    enterprise: string
    site: string
    machine: string
    state: string
    stateName?: string
    reason?: string
    color?: string
  }>
  summary?: {
    running: number
    idle: number
    down: number
  }
}

export function useEquipment() {
  const appStore = useAppStore()

  async function fetchEquipmentStates(signal?: AbortSignal): Promise<EquipmentResponse | null> {
    try {
      const enterprise = appStore.enterpriseParam
      const url = enterprise !== 'ALL'
        ? `/api/equipment/states?enterprise=${encodeURIComponent(enterprise)}`
        : '/api/equipment/states'
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: EquipmentResponse = await response.json()

      if (data.states && Array.isArray(data.states)) {
        appStore.equipmentStates.clear()
        data.states.forEach(equipment => {
          const key = `${equipment.enterprise}/${equipment.site}/${equipment.machine}`
          appStore.equipmentStates.set(key, {
            id: key,
            name: equipment.machine,
            state: equipment.stateName || equipment.state,
            enterprise: equipment.enterprise,
            site: equipment.site,
            reason: equipment.reason,
            color: equipment.color
          })
        })
      }
      return data
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch equipment states:', err)
      return null
    }
  }

  return { fetchEquipmentStates }
}
