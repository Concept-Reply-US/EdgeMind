import { useAppStore } from '@/stores/app'

export interface SPCSite {
  name: string
}

export interface SPCMeasurement {
  measurement: string
  displayName: string
  site: string
  cpk: number
  problematicScore: number
  reason: string
  outOfControlCount: number
  count: number
}

export interface SPCDataPoint {
  timestamp: string
  value: number
  outOfControl: boolean
  violationType: 'upper' | 'lower' | null
}

export interface SPCSeries {
  source: string
  data: SPCDataPoint[]
}

export interface SPCData {
  measurement: string
  data: SPCDataPoint[]
  series: SPCSeries[]
  controlLimits: {
    ucl: number
    lcl: number
    mean: number
    target: number
  }
  statistics: {
    cpk: number
    stdDev: number
    count: number
    outOfControlCount?: number
  }
  timestamp: string
}

export interface ProductionLine {
  line: string
  enterprise: string
  actual: number
  target: number
  variance: number
  percentOfTarget: number
  status: 'on-target' | 'near-target' | 'below-target'
}

export interface ProductionVolume {
  byLine: ProductionLine[]
  summary: {
    totalActual: number
    totalTarget: number
    overallPercent: number
    linesOnTarget: number
    linesBelowTarget: number
  }
  window: string
  timestamp: string
}

export interface EnergyLine {
  line: string
  enterprise: string
  consumption: number
  trend: 'rising' | 'stable' | 'falling'
  unit: string
}

export interface EnergyData {
  byLine: EnergyLine[]
  summary: {
    totalConsumption: number
    averageConsumption: number
    risingTrend: number
    stableLines: number
    fallingLines: number
    unit: string
  }
  window: string
  timestamp: string
}

export function useProcessData() {
  const appStore = useAppStore()

  async function fetchSPCSites(enterprise: string, signal?: AbortSignal): Promise<string[] | null> {
    try {
      const response = await fetch(`/api/spc/sites?enterprise=${encodeURIComponent(enterprise)}`, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      return data.sites || []
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch SPC sites:', err)
      return null
    }
  }

  async function fetchSPCMeasurements(
    enterprise: string,
    limit: number = 10,
    site?: string,
    signal?: AbortSignal
  ): Promise<SPCMeasurement[] | null> {
    try {
      let url = `/api/spc/measurements?enterprise=${encodeURIComponent(enterprise)}&limit=${limit}`
      if (site) {
        url += `&site=${encodeURIComponent(site)}`
      }
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      return data.measurements || []
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch SPC measurements:', err)
      return null
    }
  }

  async function fetchSPCData(
    measurement: string,
    enterprise: string,
    window: string = 'shift',
    site?: string,
    signal?: AbortSignal
  ): Promise<SPCData | null> {
    try {
      let url = `/api/spc/data?measurement=${encodeURIComponent(measurement)}&enterprise=${encodeURIComponent(enterprise)}&window=${window}`
      if (site) {
        url += `&site=${encodeURIComponent(site)}`
      }
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch SPC data:', err)
      return null
    }
  }

  async function fetchProductionVolume(window: string = 'shift', signal?: AbortSignal): Promise<ProductionVolume | null> {
    try {
      const enterprise = appStore.enterpriseParam
      const url = `/api/production/volume?enterprise=${encodeURIComponent(enterprise)}&window=${window}`
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch production volume:', err)
      return null
    }
  }

  async function fetchEnergyConsumption(window: string = 'shift', signal?: AbortSignal): Promise<EnergyData | null> {
    try {
      const enterprise = appStore.enterpriseParam
      const url = `/api/production/energy?enterprise=${encodeURIComponent(enterprise)}&window=${window}`
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch energy consumption:', err)
      return null
    }
  }

  return {
    fetchSPCSites,
    fetchSPCMeasurements,
    fetchSPCData,
    fetchProductionVolume,
    fetchEnergyConsumption
  }
}
