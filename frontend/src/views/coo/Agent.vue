<script setup lang="ts">
import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'edgemind_coo_recent_questions'
const MAX_RECENT = 5

const question = ref('')
const responseText = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const recentQuestions = ref<string[]>([])
const sessionId = ref<string | null>(null)

const suggestedQuestions = [
  'What is our overall OEE across all enterprises?',
  'Which enterprise has the highest waste rate?',
  'Show me downtime incidents from the last shift',
  'What are the top 3 quality issues right now?',
  'Compare OEE between Enterprise A and Enterprise B',
  'What equipment is currently down?'
]

function formatResponse(text: string): string {
  if (!text) return ''
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>')
}

function loadRecentQuestions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    recentQuestions.value = stored ? JSON.parse(stored) : []
  } catch {
    recentQuestions.value = []
  }
}

function saveQuestion(q: string) {
  try {
    const filtered = recentQuestions.value.filter(item => item !== q)
    filtered.unshift(q)
    recentQuestions.value = filtered.slice(0, MAX_RECENT)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentQuestions.value))
  } catch {
    // localStorage unavailable
  }
}

async function sendQuestion(q?: string) {
  const finalQuestion = q || question.value.trim()
  if (!finalQuestion) return

  question.value = ''
  isLoading.value = true
  errorMessage.value = ''
  responseText.value = ''

  saveQuestion(finalQuestion)

  try {
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: finalQuestion,
        sessionId: sessionId.value
      })
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.message || errData.error || `Server returned ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let fullText = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const content = line.slice(6).trim()
        if (content === '[DONE]') continue
        try {
          const data = JSON.parse(content)
          if (data.type === 'tool') {
            if (fullText.length > 0 && !fullText.endsWith('\n\n')) fullText += '\n\n'
            fullText += `🔧 ${data.name}`
          } else {
            const newText = typeof data === 'string' ? data : (data.text || data.content || '')
            fullText += newText
          }
        } catch {
          fullText += content
        }
      }
      responseText.value = fullText || 'Analyzing...'
    }

    const sid = response.headers.get('X-Session-Id')
    if (sid) sessionId.value = sid

    responseText.value = fullText || 'No response received.'
  } catch (error: any) {
    console.error('COO Agent Q&A error:', error)
    errorMessage.value = error.message || 'Failed to get response from agent.'
  } finally {
    isLoading.value = false
  }
}

function askSuggested(q: string) {
  question.value = q
  sendQuestion(q)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendQuestion()
  }
}

onMounted(() => {
  loadRecentQuestions()
})
</script>

<template>
  <div class="agent-qa-container">
    <div class="view-header">
      <h1 class="view-title">Agent Q&A</h1>
    </div>

    <!-- Suggested Questions -->
    <div class="suggested-questions-section">
      <h3 class="section-title">Suggested Questions</h3>
      <div class="suggested-questions-grid">
        <button
          v-for="(q, idx) in suggestedQuestions"
          :key="idx"
          class="suggested-q-btn"
          @click="askSuggested(q)"
        >
          {{ q }}
        </button>
      </div>
    </div>

    <!-- Input Area -->
    <div class="agent-input-section">
      <h3 class="section-title">Ask a Question</h3>
      <div class="agent-input-area">
        <textarea
          v-model="question"
          class="agent-textarea"
          placeholder="Ask about factory performance, equipment status, quality metrics..."
          @keydown="handleKeydown"
        ></textarea>
        <button class="agent-send-btn" :disabled="isLoading || !question.trim()" @click="sendQuestion()">
          {{ isLoading ? 'Analyzing...' : 'Send' }}
        </button>
      </div>
    </div>

    <!-- Response Area -->
    <div class="agent-response-section">
      <h3 class="section-title">Response</h3>
      <div class="agent-response">
        <div v-if="isLoading" class="agent-loading">
          <div class="agent-loading-spinner"></div>
          <div class="agent-loading-text">Analyzing factory data...</div>
        </div>
        <div v-else-if="errorMessage" class="agent-response-error">
          <strong>Error:</strong> {{ errorMessage }}
        </div>
        <div v-else-if="responseText" class="agent-response-content" v-html="formatResponse(responseText)"></div>
        <div v-else class="agent-response-placeholder">
          Your response will appear here. Try asking a question or use one of the suggested questions above.
        </div>
      </div>
    </div>

    <!-- Recent Questions -->
    <div v-if="recentQuestions.length > 0" class="recent-questions">
      <h3 class="recent-questions-title">Recent Questions</h3>
      <button
        v-for="(q, idx) in recentQuestions"
        :key="idx"
        class="recent-question-btn"
        @click="askSuggested(q)"
      >
        {{ q }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.agent-qa-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.view-header {
  padding: 0;
}

.view-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--persona-color, var(--accent-cyan));
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.section-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0 0 12px;
}

.suggested-questions-section {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
}

.suggested-questions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.suggested-q-btn {
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.suggested-q-btn:hover {
  border-color: var(--persona-color, var(--accent-cyan));
  background: rgba(0, 255, 255, 0.08);
  color: var(--persona-color, var(--accent-cyan));
  transform: translateY(-1px);
}

.agent-input-section {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
}

.agent-input-area {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.agent-textarea {
  flex: 1;
  min-height: 100px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.agent-textarea:focus {
  outline: none;
  border-color: var(--persona-color, var(--accent-cyan));
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
}

.agent-textarea::placeholder {
  color: var(--text-dim);
}

.agent-send-btn {
  padding: 14px 28px;
  background: var(--persona-color, var(--accent-cyan));
  color: var(--bg-dark);
  border: none;
  border-radius: 10px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.agent-send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 255, 255, 0.4);
}

.agent-send-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-dim);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.agent-response-section {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
}

.agent-response {
  min-height: 120px;
}

.agent-response-placeholder {
  color: var(--text-dim);
  font-size: 0.95rem;
  text-align: center;
  padding: 30px 0;
}

.agent-response-content {
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.7;
}

.agent-response-content :deep(strong) {
  color: var(--persona-color, var(--accent-cyan));
}

.agent-response-content :deep(ul) {
  margin: 10px 0;
  padding-left: 20px;
}

.agent-response-content :deep(li) {
  margin-bottom: 6px;
}

.agent-response-error {
  color: var(--accent-red);
  font-size: 0.95rem;
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.agent-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 16px;
}

.agent-loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid var(--persona-color, var(--accent-cyan));
  border-radius: 50%;
  animation: coo-spin 0.8s linear infinite;
}

@keyframes coo-spin {
  to {
    transform: rotate(360deg);
  }
}

.agent-loading-text {
  color: var(--text-dim);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.recent-questions {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
}

.recent-questions-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0 0 10px;
}

.recent-question-btn {
  display: block;
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  color: var(--text-dim);
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.88rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recent-question-btn:hover {
  border-color: var(--persona-color, var(--accent-cyan));
  color: var(--text-primary);
  background: rgba(0, 255, 255, 0.05);
}

@media (max-width: 1024px) {
  .suggested-questions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .suggested-questions-grid {
    grid-template-columns: 1fr;
  }

  .agent-input-area {
    flex-direction: column;
  }

  .agent-send-btn {
    width: 100%;
  }
}
</style>
