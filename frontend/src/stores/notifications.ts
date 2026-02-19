import { defineStore } from 'pinia'
import { ref } from 'vue'

export type NotificationSeverity = 'critical' | 'warning' | 'info'

export interface Notification {
  id: string
  summary: string
  severity: NotificationSeverity
  badge: string
  meta?: string
  dismissMs: number
  timestamp: Date
}

const MAX_NOTIFICATIONS = 5
const DEFAULT_DISMISS_MS = 8000

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])

  function addNotification(opts: {
    summary: string
    severity?: NotificationSeverity
    badge?: string
    meta?: string
    dismissMs?: number
  }) {
    const notification: Notification = {
      id: crypto.randomUUID(),
      summary: opts.summary,
      severity: opts.severity || 'info',
      badge: opts.badge || 'ALERT',
      meta: opts.meta,
      dismissMs: Math.max(1000, Math.min(60000, opts.dismissMs || DEFAULT_DISMISS_MS)),
      timestamp: new Date()
    }

    notifications.value.push(notification)

    // Enforce max notifications (remove oldest)
    if (notifications.value.length > MAX_NOTIFICATIONS) {
      notifications.value.shift()
    }

    // Auto-dismiss after timeout
    setTimeout(() => {
      removeNotification(notification.id)
    }, notification.dismissMs)

    return notification.id
  }

  function removeNotification(id: string) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  return {
    notifications,
    addNotification,
    removeNotification
  }
})
