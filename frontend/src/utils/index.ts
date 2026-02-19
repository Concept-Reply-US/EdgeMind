export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function topicToMeasurement(topic: string): string {
  const parts = topic.split('/')
  if (parts.length >= 2) {
    return parts.slice(-2).join('_')
  }
  return topic
}

export function getEnterpriseParam(selectedFactory: string): string {
  return selectedFactory === 'ALL' ? 'ALL' : selectedFactory
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toFixed(0)
}
