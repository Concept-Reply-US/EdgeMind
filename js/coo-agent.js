// COO AGENT Q&A VIEW - Conversational factory intelligence

const STORAGE_KEY = 'edgemind_coo_recent_questions';
const MAX_RECENT = 5;

let sessionId = null;

/**
 * Format response text: convert **bold** and bullet points to HTML
 */
function formatResponse(text) {
    if (!text) return '';
    return text
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Bullet points (lines starting with - or *)
        .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
        // Wrap consecutive <li> in <ul>
        .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
        // Numbered lists
        .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
        // Line breaks for remaining text
        .replace(/\n/g, '<br>');
}

/**
 * Load recent questions from localStorage
 */
function loadRecentQuestions() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Save a question to recent history
 */
function saveQuestion(question) {
    try {
        const recent = loadRecentQuestions();
        // Remove duplicate if exists
        const filtered = recent.filter(q => q !== question);
        filtered.unshift(question);
        // Keep last N
        const trimmed = filtered.slice(0, MAX_RECENT);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        renderRecentQuestions(trimmed);
    } catch {
        // localStorage unavailable
    }
}

/**
 * Render recent questions list
 */
function renderRecentQuestions(questions) {
    const container = document.getElementById('coo-recent-questions');
    if (!container) return;

    if (!questions || questions.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <h4 class="recent-questions-title">Recent Questions</h4>
        ${questions.map(q => `
            <button class="recent-question-btn" onclick="askCOOQuestion('${q.replace(/'/g, "\\'")}')">
                ${q}
            </button>
        `).join('')}
    `;
}

/**
 * Show loading state
 */
function showLoading() {
    const responseDiv = document.getElementById('coo-agent-response');
    if (responseDiv) {
        responseDiv.innerHTML = `
            <div class="agent-loading">
                <div class="agent-loading-spinner"></div>
                <div class="agent-loading-text">Analyzing factory data...</div>
            </div>
        `;
    }
}

/**
 * Show response
 */
function showResponse(answer) {
    const responseDiv = document.getElementById('coo-agent-response');
    if (responseDiv) {
        responseDiv.innerHTML = `
            <div class="agent-response-content">
                ${formatResponse(answer)}
            </div>
        `;
    }
}

/**
 * Show error
 */
function showError(message) {
    const responseDiv = document.getElementById('coo-agent-response');
    if (responseDiv) {
        responseDiv.innerHTML = `
            <div class="agent-response-error">
                <strong>Error:</strong> ${message}
            </div>
        `;
    }
}

/**
 * Send a question to the agent API
 */
export async function sendQuestion(question) {
    const textarea = document.getElementById('coo-agent-input');
    const sendBtn = document.getElementById('coo-agent-send');

    // Get question from textarea if not provided
    const q = question || (textarea ? textarea.value.trim() : '');
    if (!q) return;

    // Clear textarea
    if (textarea) textarea.value = '';

    // Disable send button during request
    if (sendBtn) sendBtn.disabled = true;

    showLoading();
    saveQuestion(q);

    try {
        const response = await fetch('/api/agent/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: q,
                sessionId: sessionId
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || `Server returned ${response.status}`);
        }

        // Handle SSE streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const content = line.slice(6).trim();
                if (content === '[DONE]') continue;
                try {
                    const data = JSON.parse(content);
                    if (data.type === 'tool') {
                        if (fullText.length > 0 && !fullText.endsWith('\n\n')) fullText += '\n\n';
                        fullText += `🔧 ${data.name}`;
                    } else {
                        const newText = typeof data === 'string' ? data : (data.text || data.content || '');
                        fullText += newText;
                    }
                } catch {
                    fullText += content;
                }
            }
            // Update response live as chunks arrive
            showResponse(fullText || 'Analyzing...');
        }

        // Read session ID from response header
        sessionId = response.headers.get('X-Session-Id') || sessionId;
        showResponse(fullText || 'No response received.');
    } catch (error) {
        console.error('COO Agent Q&A error:', error);
        showError(error.message || 'Failed to get response from agent.');
    } finally {
        if (sendBtn) sendBtn.disabled = false;
    }
}

/**
 * Handle a suggested question button click
 */
export function askSuggested(question) {
    const textarea = document.getElementById('coo-agent-input');
    if (textarea) {
        textarea.value = question;
    }
    sendQuestion(question);
}

/**
 * Initialize the Agent Q&A view
 */
export function init() {
    // Set up send button click handler
    const sendBtn = document.getElementById('coo-agent-send');
    if (sendBtn) {
        sendBtn._cooHandler = () => sendQuestion();
        sendBtn.addEventListener('click', sendBtn._cooHandler);
    }

    // Set up Enter key on textarea
    const textarea = document.getElementById('coo-agent-input');
    if (textarea) {
        textarea._cooKeyHandler = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendQuestion();
            }
        };
        textarea.addEventListener('keydown', textarea._cooKeyHandler);
    }

    // Load recent questions
    const recent = loadRecentQuestions();
    renderRecentQuestions(recent);
}

/**
 * Cleanup the Agent Q&A view
 */
export function cleanup() {
    const sendBtn = document.getElementById('coo-agent-send');
    if (sendBtn && sendBtn._cooHandler) {
        sendBtn.removeEventListener('click', sendBtn._cooHandler);
        delete sendBtn._cooHandler;
    }

    const textarea = document.getElementById('coo-agent-input');
    if (textarea && textarea._cooKeyHandler) {
        textarea.removeEventListener('keydown', textarea._cooKeyHandler);
        delete textarea._cooKeyHandler;
    }
}
