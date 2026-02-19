<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { useConnectionStore } from '@/stores/connection'

const connectionStore = useConnectionStore()
const messagesRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const input = ref('')
const sending = ref(false)
const showWelcome = ref(true)

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const messages = ref<ChatMessage[]>([])
const chatHistory = ref<Array<{ role: string; content: string }>>([])

const suggestedQuestions = [
  "What is impacting Enterprise B's OEE?",
  "Which equipment has been down the longest?",
  "Where is waste coming from in Enterprise A?",
  "What is the status of Enterprise C batches?"
]

function askSuggested(question: string) {
  input.value = question
  sendMessage()
}

async function sendMessage() {
  const prompt = input.value.trim()
  if (!prompt || sending.value) return

  showWelcome.value = false
  sending.value = true
  input.value = ''

  messages.value.push({ role: 'user', content: prompt })
  messages.value.push({ role: 'assistant', content: '', streaming: true })
  chatHistory.value.push({ role: 'user', content: prompt })

  await nextTick()
  scrollToBottom()

  const assistantIndex = messages.value.length - 1

  try {
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        sessionId: connectionStore.chatSessionId || 'session-' + Date.now(),
        messages: chatHistory.value.slice(0, -1)
      })
    })

    if (!response.ok) throw new Error('Chat failed')

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let streamText = ''
    let lastWasTool = false

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          const content = line.slice(6).trim()
          if (content === '[DONE]') continue
          try {
            const data = JSON.parse(content)
            if (data.type === 'tool') {
              if (streamText.length > 0 && !streamText.endsWith('\n\n')) streamText += '\n\n'
              streamText += `*${data.name}*`
              lastWasTool = true
            } else {
              const newText = typeof data === 'string' ? data : (data.text || data.content || '')
              if (lastWasTool && newText.trim()) streamText += '\n\n'
              streamText += newText
              lastWasTool = false
            }
          } catch {
            if (lastWasTool && content.trim()) streamText += '\n\n'
            streamText += content
            lastWasTool = false
          }
        }
      }
      messages.value[assistantIndex] = { role: 'assistant', content: streamText, streaming: true }
      await nextTick()
      scrollToBottom()
    }

    messages.value[assistantIndex] = { role: 'assistant', content: streamText }
    chatHistory.value.push({ role: 'assistant', content: streamText })

    // Keep history manageable
    if (chatHistory.value.length > 20) {
      chatHistory.value.splice(0, chatHistory.value.length - 20)
    }
  } catch {
    messages.value[assistantIndex] = { role: 'assistant', content: 'Error: Could not reach assistant' }
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function togglePanel() {
  connectionStore.toggleChatPanel()
  if (connectionStore.isChatPanelOpen) {
    nextTick(() => inputRef.value?.focus())
  }
}

onMounted(() => {
  if (!connectionStore.chatSessionId) {
    connectionStore.chatSessionId = 'session-' + Date.now()
  }
})
</script>

<template>
  <div class="chat-widget">
    <!-- Toggle Button -->
    <button class="chat-toggle" @click="togglePanel" title="Chat with Edge Mind">
      <svg viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    </button>

    <!-- Chat Panel -->
    <div class="chat-panel" :class="{ open: connectionStore.isChatPanelOpen }">
      <div class="chat-wrapper">
        <div class="chat-header">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="chat-title" style="font-family: 'Orbitron', sans-serif; font-size: 0.85rem; font-weight: 700; color: var(--accent-cyan);">
              EDGE MIND ASSISTANT
            </span>
            <button class="chat-close" @click="togglePanel">&times;</button>
          </div>
        </div>

        <div class="chat-body">
          <div ref="messagesRef" class="chat-messages">
            <!-- Welcome -->
            <div v-if="showWelcome" class="chat-welcome">
              <svg class="chat-welcome-icon" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              <h3>Edge Mind Assistant</h3>
              <p>Ask about factory metrics, OEE, production lines, or anomalies.</p>
              <div class="suggested-questions">
                <button
                  v-for="q in suggestedQuestions"
                  :key="q"
                  class="suggested-question"
                  @click="askSuggested(q)"
                >
                  {{ q }}
                </button>
              </div>
            </div>

            <!-- Messages -->
            <div
              v-for="(msg, i) in messages"
              :key="i"
              class="chat-message"
              :class="[msg.role, { streaming: msg.streaming }]"
            >
              <div class="bubble">{{ msg.content || '...' }}</div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="chat-input-area">
            <input
              ref="inputRef"
              v-model="input"
              class="chat-input"
              placeholder="Ask about your factory..."
              :disabled="sending"
              @keydown="handleKeydown"
            />
            <button class="chat-send" :disabled="sending || !input.trim()" @click="sendMessage">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  font-family: 'Rajdhani', sans-serif;
}

.chat-toggle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta));
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 255, 255, 0.4);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.chat-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 30px rgba(0, 255, 255, 0.6);
}

.chat-toggle svg {
  width: 28px;
  height: 28px;
  fill: var(--bg-dark);
}

.chat-panel {
  display: none;
  position: absolute;
  padding: 0;
  bottom: 70px;
  right: 0;
  width: 380px;
  height: 500px;
  background: var(--bg-card);
  border: 2px solid var(--accent-cyan);
  border-radius: 12px;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 255, 0.2);
}

.chat-panel.open {
  display: block;
}

.chat-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.chat-header {
  padding: 10px;
  background: rgba(0, 255, 255, 0.1);
  border-bottom: 1px solid rgba(0, 255, 255, 0.3);
}

.chat-close {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  padding: 0;
}

.chat-close:hover {
  color: var(--accent-red);
}

.chat-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-message {
  max-width: 85%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-message .bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-message.user {
  align-self: flex-end;
  align-items: flex-end;
}

.chat-message.user .bubble {
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta));
  color: var(--bg-dark);
  border-bottom-right-radius: 4px;
}

.chat-message.assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.chat-message.assistant .bubble {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(0, 255, 255, 0.2);
}

.chat-message.streaming::after {
  content: '▋';
  animation: blink 1s infinite;
}

.chat-welcome {
  text-align: center;
  padding: 0 20px;
  color: var(--text-dim);
}

.chat-welcome-icon {
  width: 48px;
  height: 48px;
  fill: var(--accent-cyan);
  margin-bottom: 15px;
  opacity: 0.7;
}

.chat-welcome h3 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  color: var(--accent-cyan);
  margin: 0 0 10px 0;
}

.chat-welcome p {
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0;
}

.suggested-questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 15px;
}

.suggested-question {
  padding: 10px 15px;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
}

.suggested-question:hover {
  background: rgba(0, 255, 255, 0.2);
  border-color: var(--accent-cyan);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.chat-input-area {
  position: relative;
  padding: 15px;
  border-top: 1px solid rgba(0, 255, 255, 0.3);
  display: flex;
  gap: 10px;
}

.chat-input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  outline: none;
}

.chat-input:focus {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
}

.chat-send {
  padding: 10px 16px;
  background: var(--accent-cyan);
  border: none;
  border-radius: 8px;
  color: var(--bg-dark);
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chat-send:hover {
  background: var(--accent-magenta);
  box-shadow: 0 0 15px rgba(255, 0, 255, 0.4);
}

.chat-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
