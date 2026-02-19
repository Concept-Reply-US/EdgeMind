import { onScopeDispose } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useConnectionStore } from '@/stores/connection'
import { WS_URL } from '@/constants'

export function useWebSocket() {
  const appStore = useAppStore()
  const connectionStore = useConnectionStore()
  const { isConnected, messageRate } = storeToRefs(connectionStore)

  let ws: WebSocket | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let rateInterval: ReturnType<typeof setInterval> | null = null

  function scheduleReconnect() {
    const backoff = Math.min(5000 * Math.pow(1.5, connectionStore.reconnectAttempts), 30000)
    connectionStore.incrementReconnectAttempts()
    console.log(`Reconnecting in ${Math.round(backoff / 1000)}s (attempt ${connectionStore.reconnectAttempts})...`)
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null
      connect()
    }, backoff)
  }

  function connect() {
    // Clean up existing WebSocket
    if (ws) {
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }

    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      console.log('Connected to backend')
      connectionStore.setConnected(true)
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Failed to parse server message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('Disconnected from backend')
      connectionStore.setConnected(false)
      if (!reconnectTimeout) {
        scheduleReconnect()
      }
    }
  }

  function handleMessage(message: { type: string; data: any }) {
    switch (message.type) {
      case 'initial_state':
        appStore.setInitialState(message.data)
        break

      case 'mqtt_message': {
        const topic = message.data.topic || ''
        const enterprise = appStore.enterpriseParam
        if (enterprise !== 'ALL' && !topic.startsWith(enterprise + '/')) {
          return
        }
        appStore.addMessage(message.data)
        connectionStore.trackMessage()
        break
      }

      case 'claude_insight':
      case 'trend_insight':
        appStore.addInsight(message.data)
        break

      case 'equipment_state':
        appStore.updateEquipmentState(message.data)
        break

      case 'anomaly_filter_update':
        if (message.data?.filters && Array.isArray(message.data.filters)) {
          appStore.setAnomalyFilters(message.data.filters)
        }
        break

      case 'settings_updated':
        if (message.data) {
          appStore.setThresholdSettings(message.data)
        }
        break

      case 'cesmii_work_order':
        appStore.addCesmiiWorkOrder(message.data)
        break
    }
  }

  function send(data: unknown) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (rateInterval) {
      clearInterval(rateInterval)
      rateInterval = null
    }
    if (ws) {
      ws.onclose = null // prevent reconnect on intentional close
      ws.close()
      ws = null
    }
    connectionStore.setConnected(false)
  }

  // Message rate tracking - calculate rate every second
  rateInterval = setInterval(() => {
    connectionStore.updateRate(connectionStore.messagesSinceLastRate)
  }, 1000)

  // Auto-connect on composable initialization
  connect()

  // Auto-disconnect on scope disposal
  onScopeDispose(() => {
    disconnect()
  })

  return {
    isConnected,
    messageRate,
    send,
    disconnect
  }
}
