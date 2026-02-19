import { useAppStore } from '@/stores/app'
import type { WasteLine, QualitySummary } from '@/types'

interface WasteTrendsResponse {
  linesSummary?: WasteLine[]
  summary?: QualitySummary
}

interface ScrapByLineResponse {
  lines?: Array<{
    site: string
    line: string
    total: number
  }>
}

export function useQuality() {
  const appStore = useAppStore()

  async function fetchWasteTrends(signal?: AbortSignal): Promise<WasteTrendsResponse | null> {
    try {
      const enterprise = appStore.enterpriseParam
      const url = enterprise !== 'ALL'
        ? `/api/waste/trends?enterprise=${encodeURIComponent(enterprise)}`
        : '/api/waste/trends'
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch waste trends:', err)
      return null
    }
  }

  async function fetchScrapByLine(signal?: AbortSignal): Promise<ScrapByLineResponse | null> {
    try {
      const enterprise = appStore.enterpriseParam
      const url = enterprise !== 'ALL'
        ? `/api/waste/by-line?enterprise=${encodeURIComponent(enterprise)}`
        : '/api/waste/by-line'
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch scrap by line:', err)
      return null
    }
  }

  async function fetchQualityMetrics(signal?: AbortSignal): Promise<WasteTrendsResponse | null> {
    return fetchWasteTrends(signal)
  }

  async function fetchActiveSensorCount(): Promise<void> {
    try {
      const response = await fetch('/api/schema/measurements')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.measurements && Array.isArray(data.measurements)) {
        data.measurements.forEach((m: { name: string }) => {
          appStore.uniqueTopics.add(m.name)
        })
      }
    } catch (err) {
      console.error('Failed to fetch active sensor count:', err)
    }
  }

  return { fetchWasteTrends, fetchScrapByLine, fetchQualityMetrics, fetchActiveSensorCount }
}
