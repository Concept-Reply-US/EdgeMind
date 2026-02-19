import { useAppStore } from '@/stores/app'
import type { OEEData, OEEBreakdown, FactoryStatusEnterprise, LineOEE } from '@/types'

export function useOEE() {
  const appStore = useAppStore()

  async function fetchOEE(signal?: AbortSignal): Promise<OEEData | null> {
    try {
      const enterprise = appStore.enterpriseParam
      const response = await fetch(`/api/oee?enterprise=${encodeURIComponent(enterprise)}`, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch OEE:', err)
      return null
    }
  }

  async function fetchOEEBreakdown(signal?: AbortSignal): Promise<{ data?: OEEBreakdown } | null> {
    try {
      const response = await fetch('/api/oee/breakdown', { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch OEE breakdown:', err)
      return null
    }
  }

  async function fetchFactoryStatus(signal?: AbortSignal): Promise<{ enterprises?: FactoryStatusEnterprise[] } | null> {
    try {
      const enterprise = appStore.enterpriseParam
      const url = enterprise !== 'ALL'
        ? `/api/factory/status?enterprise=${encodeURIComponent(enterprise)}`
        : '/api/factory/status'
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch factory status:', err)
      return null
    }
  }

  async function fetchLineOEE(signal?: AbortSignal): Promise<{ lines?: LineOEE[] } | null> {
    try {
      const enterprise = appStore.enterpriseParam
      if (enterprise === 'Enterprise C') {
        return fetchBatchStatus(signal)
      }
      const response = await fetch('/api/oee/lines', { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.lines && enterprise !== 'ALL') {
        data.lines = data.lines.filter((line: LineOEE) => line.enterprise === enterprise)
      }
      return data
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch line OEE:', err)
      return null
    }
  }

  async function fetchBatchStatus(signal?: AbortSignal): Promise<{ lines?: LineOEE[] } | null> {
    try {
      const response = await fetch('/api/batch/status', { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return null
      console.error('Failed to fetch batch status:', err)
      return null
    }
  }

  return { fetchOEE, fetchOEEBreakdown, fetchFactoryStatus, fetchLineOEE, fetchBatchStatus }
}
