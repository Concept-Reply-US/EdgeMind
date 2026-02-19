import { ref } from 'vue'

export interface ApiError {
  status: number
  message: string
}

export function useApi() {
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  let abortController: AbortController | null = null

  function abort() {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
    abort()
    abortController = new AbortController()
    loading.value = true
    error.value = null

    try {
      const response = await fetch(url, {
        ...options,
        signal: abortController.signal
      })
      if (!response.ok) {
        throw { status: response.status, message: `HTTP ${response.status}` }
      }
      const data = await response.json()
      return data as T
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return null
      }
      error.value = err as ApiError
      console.error(`API error fetching ${url}:`, err)
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, error, fetchJson, abort }
}
