<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '@/stores/notifications'
import type { Notification } from '@/stores/notifications'

const notificationStore = useNotificationStore()

// Track remaining time for each notification (for pause/resume on hover)
const remainingTimes = ref<Map<string, number>>(new Map())
const startTimes = ref<Map<string, number>>(new Map())
const timers = ref<Map<string, ReturnType<typeof setTimeout>>>(new Map())
const isDismissing = ref<Set<string>>(new Set())

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false })
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#ef4444'
    case 'warning': return '#f59e0b'
    case 'info': return '#00ffff'
    default: return '#00ffff'
  }
}

function dismiss(notification: Notification) {
  if (isDismissing.value.has(notification.id)) return
  isDismissing.value.add(notification.id)

  // Clear timer
  const timer = timers.value.get(notification.id)
  if (timer) {
    clearTimeout(timer)
    timers.value.delete(notification.id)
  }

  // Remove from store after animation
  setTimeout(() => {
    notificationStore.removeNotification(notification.id)
    isDismissing.value.delete(notification.id)
    remainingTimes.value.delete(notification.id)
    startTimes.value.delete(notification.id)
  }, 300)
}

function pauseAutoClose(notification: Notification) {
  const timer = timers.value.get(notification.id)
  if (timer) {
    clearTimeout(timer)
  }

  const startTime = startTimes.value.get(notification.id)
  const remaining = remainingTimes.value.get(notification.id) || notification.dismissMs

  if (startTime !== undefined) {
    const elapsed = Date.now() - startTime
    remainingTimes.value.set(notification.id, Math.max(0, remaining - elapsed))
  }
}

function resumeAutoClose(notification: Notification) {
  const remaining = remainingTimes.value.get(notification.id)
  if (remaining === undefined) return

  if (remaining === 0) {
    dismiss(notification)
    return
  }

  startTimes.value.set(notification.id, Date.now())
  const timer = setTimeout(() => {
    dismiss(notification)
  }, remaining)
  timers.value.set(notification.id, timer)
}

// Initialize timers for new notifications
function initializeNotification(notification: Notification) {
  if (remainingTimes.value.has(notification.id)) return

  remainingTimes.value.set(notification.id, notification.dismissMs)
  startTimes.value.set(notification.id, Date.now())

  const timer = setTimeout(() => {
    dismiss(notification)
  }, notification.dismissMs)
  timers.value.set(notification.id, timer)
}

// Watch for new notifications and initialize them
let unwatchNotifications: (() => void) | null = null
onMounted(() => {
  // Initialize timers for existing notifications on mount
  notificationStore.notifications.forEach(initializeNotification)

  // Watch for new notifications
  unwatchNotifications = notificationStore.$subscribe((_mutation, state) => {
    state.notifications.forEach(initializeNotification)
  })
})

onUnmounted(() => {
  // Clear all timers
  timers.value.forEach(timer => clearTimeout(timer))
  timers.value.clear()
  if (unwatchNotifications) unwatchNotifications()
})
</script>

<template>
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup name="notification">
        <div
          v-for="notification in notificationStore.notifications"
          :key="notification.id"
          :class="['notification', `severity-${notification.severity}`, { dismissing: isDismissing.has(notification.id) }]"
          @mouseenter="pauseAutoClose(notification)"
          @mouseleave="resumeAutoClose(notification)"
        >
          <button
            class="notification-dismiss"
            aria-label="Dismiss"
            @click.stop="dismiss(notification)"
          >
            &times;
          </button>

          <div class="notification-header">
            <span
              class="notification-badge"
              :class="`severity-${notification.severity}`"
            >
              {{ notification.badge }}
            </span>
            <span class="notification-timestamp">
              {{ formatTimestamp(notification.timestamp) }}
            </span>
          </div>

          <div class="notification-body">
            {{ notification.summary }}
          </div>

          <div v-if="notification.meta" class="notification-meta">
            {{ notification.meta }}
          </div>

          <div
            class="notification-timer"
            :class="`severity-${notification.severity}`"
            :style="{
              animationDuration: `${notification.dismissMs}ms`,
              '--severity-color': getSeverityColor(notification.severity)
            }"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 420px;
  pointer-events: none;
}

.notification {
  position: relative;
  background: rgba(20, 24, 36, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 4px solid var(--severity-color, #00ffff);
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.2s ease;
  font-family: 'Share Tech Mono', monospace;
}

.notification:hover {
  transform: translateX(-4px);
}

.notification.severity-info {
  --severity-color: #00ffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 255, 255, 0.3);
}

.notification.severity-warning {
  --severity-color: #f59e0b;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.3);
}

.notification.severity-critical {
  --severity-color: #ef4444;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(239, 68, 68, 0.4);
}

.notification-dismiss {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
  line-height: 1;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.notification-dismiss:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-right: 28px;
}

.notification-badge {
  font-family: 'Orbitron', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 3px 8px;
  border-radius: 3px;
  background: rgba(0, 255, 255, 0.2);
  color: #00ffff;
}

.notification-badge.severity-warning {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.notification-badge.severity-critical {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.notification-timestamp {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  margin-left: auto;
}

.notification-body {
  font-size: 0.9rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 8px;
}

.notification-meta {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.notification-timer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--severity-color), transparent);
  animation: notification-timer linear forwards;
  border-radius: 0 0 8px 8px;
}

/* Transition animations */
.notification-enter-active {
  animation: notification-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.notification-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification.dismissing {
  opacity: 0;
  transform: translateX(100%);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

@keyframes notification-slide-in {
  from {
    opacity: 0;
    transform: translateX(100%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
}

@keyframes notification-timer {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
</style>
