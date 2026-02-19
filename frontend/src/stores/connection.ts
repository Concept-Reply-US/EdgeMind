import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConnectionStore = defineStore('connection', () => {
  const isConnected = ref(false)
  const messageRate = ref(0)
  const reconnectAttempts = ref(0)
  const messagesSinceLastRate = ref(0)
  const lastMessageTime = ref(Date.now())
  const chatSessionId = ref<string | null>(null)
  const isChatPanelOpen = ref(false)

  function setConnected(connected: boolean) {
    isConnected.value = connected
    if (connected) {
      reconnectAttempts.value = 0
    }
  }

  function incrementReconnectAttempts() {
    reconnectAttempts.value++
  }

  function trackMessage() {
    messagesSinceLastRate.value++
    lastMessageTime.value = Date.now()
  }

  function updateRate(rate: number) {
    messageRate.value = rate
    messagesSinceLastRate.value = 0
  }

  function toggleChatPanel() {
    isChatPanelOpen.value = !isChatPanelOpen.value
  }

  return {
    isConnected, messageRate, reconnectAttempts,
    messagesSinceLastRate, lastMessageTime,
    chatSessionId, isChatPanelOpen,
    setConnected, incrementReconnectAttempts,
    trackMessage, updateRate, toggleChatPanel
  }
})
