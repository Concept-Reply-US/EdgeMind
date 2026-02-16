// CHAT - Chat panel functionality

import { connection } from './state.js';
import { escapeHtml } from './utils.js';

// Chat Widget
connection.chatSessionId = 'session-' + Date.now();
let chatAutoScroll = true; // Track if we should auto-scroll during streaming

let chatHistory = []; // {role: 'user'|'assistant', content: string}
let currentStreamText = ''; // Current streaming response
let isStreaming = false;

// Event emitter for chat updates
export const chatEvents = new EventTarget();

const USER_ICON = '<svg class="avatar" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
const AGENT_ICON = '<svg class="avatar" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';

export { USER_ICON, AGENT_ICON, chatHistory, isStreaming, currentStreamText };

const CHAT_WELCOME = `
<div class="chat-welcome">
    <svg class="chat-welcome-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
    <h3>Edge Mind Assistant</h3>
    <p>Ask me about factory metrics, OEE performance, production lines, or anomaly detection.</p>
    <div class="suggested-questions">
        <button class="suggested-question" onclick="handleSuggestedQuestion('What is impacting Enterprise B\\'s OEE?')">What is impacting Enterprise B's OEE?</button>
        <button class="suggested-question" onclick="handleSuggestedQuestion('Which equipment has been down the longest?')">Which equipment has been down the longest?</button>
        <button class="suggested-question" onclick="handleSuggestedQuestion('Where is waste coming from in Enterprise A?')">Where is waste coming from in Enterprise A?</button>
        <button class="suggested-question" onclick="handleSuggestedQuestion('What is the status of Enterprise C batches?')">What is the status of Enterprise C batches?</button>
    </div>
</div>`;

export function handleSuggestedQuestion(question) {
    document.getElementById('chat-input').value = question;
    sendChatMessage();
}

function parseMarkdown(text) {
    return marked.parse(text);
}

export function toggleChatPanel() {
    const panel = document.getElementById('chat-panel');
    const toggle = document.getElementById('chat-toggle');
    const modalContent = document.getElementById('card-modal-content');

    if (!panel || !toggle) return;

    connection.isChatPanelOpen = !connection.isChatPanelOpen;
    
    // If in fullscreen modal, restore first
    if (panel.parentElement === modalContent) {
        document.querySelector('.chat-widget').appendChild(panel);
        panel.style.position = '';
        panel.style.width = '';
        panel.style.height = '';
        document.getElementById('card-modal-overlay').classList.remove('active');
        document.body.style.overflow = '';
    }
    
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
        document.getElementById('chat-input').focus();
        // Show welcome on first open
        const messages = document.getElementById('chat-messages');
        if (!messages.innerHTML.trim()) {
            messages.innerHTML = CHAT_WELCOME;
        }
    }
}

export async function sendChatMessage(sourceInput = null) {
    const active = document.activeElement;
    const input = sourceInput || (active?.classList?.contains('chat-input') ? active : null) || document.querySelector('.chat-input');
    const prompt = input?.value?.trim();
    
    if (!prompt) return;
    
    // Find the messages container (original only - modal syncs via MutationObserver)
    const messages = document.getElementById('chat-messages');
    
    // Clear welcome if present
    if (messages?.querySelector('.chat-welcome')) {
        messages.innerHTML = '';
    }
    
    // Add user message
    if (messages) {
        messages.innerHTML += `<div class="chat-message user">${USER_ICON}<div class="bubble">${escapeHtml(prompt)}</div></div>`;
        // Cap DOM nodes to prevent memory leak
        while (messages.children.length > 50) {
            messages.removeChild(messages.firstChild);
        }
    }
    
    // Clear all inputs and disable all send buttons
    document.querySelectorAll('.chat-input').forEach(el => el.value = '');
    document.querySelectorAll('.chat-send').forEach(el => el.disabled = true);
    
    // Add assistant placeholder
    let assistantBubble = null;
    if (messages) {
        const assistantMsg = document.createElement('div');
        assistantMsg.className = 'chat-message assistant streaming';
        assistantMsg.innerHTML = `${AGENT_ICON}<div class="bubble"></div>`;
        messages.appendChild(assistantMsg);
        assistantBubble = assistantMsg.querySelector('.bubble');
        messages.scrollTop = messages.scrollHeight;
    }
    
    chatHistory.push({ role: 'user', content: prompt });
    if (chatHistory.length > 20) {
        chatHistory.splice(0, chatHistory.length - 20);
    }
    currentStreamText = '';
    isStreaming = true;
    
    try {
        const response = await fetch('/api/agent/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, sessionId: connection.chatSessionId, messages: chatHistory.slice(0, -1) })
        });
        
        if (!response.ok) throw new Error('Chat failed');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let lastWasTool = false;
        
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
                if (line.startsWith('data: ')) {
                    const content = line.slice(6).trim();
                    if (content === '[DONE]') continue;
                    try {
                        const data = JSON.parse(content);
                        if (data.type === 'tool') {
                            if (currentStreamText.length > 0 && !currentStreamText.endsWith('\n\n')) currentStreamText += '\n\n';
                            currentStreamText += `🔧 *${data.name}*`;
                            lastWasTool = true;
                        } else {
                            const newText = typeof data === 'string' ? data : (data.text || data.content || '');
                            if (lastWasTool && newText.trim()) currentStreamText += '\n\n';
                            currentStreamText += newText;
                            lastWasTool = false;
                        }
                    } catch {
                        if (lastWasTool && content.trim()) currentStreamText += '\n\n';
                        currentStreamText += content;
                        lastWasTool = false;
                    }
                }
            }
            if (assistantBubble) {
                assistantBubble.innerHTML = parseMarkdown(currentStreamText);
                if (messages && chatAutoScroll) messages.scrollTop = messages.scrollHeight;
            }
        }
        
        isStreaming = false;
        chatHistory.push({ role: 'assistant', content: currentStreamText });
        if (chatHistory.length > 20) {
            chatHistory.splice(0, chatHistory.length - 20);
        }
        document.querySelectorAll('.chat-send').forEach(el => el.disabled = false);
        if (assistantBubble) {
            assistantBubble.closest('.chat-message')?.classList.remove('streaming');
            // Cap DOM nodes after assistant message completes
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                while (messagesContainer.children.length > 50) {
                    messagesContainer.removeChild(messagesContainer.firstChild);
                }
            }
        }
    } catch (err) {
        isStreaming = false;
        document.querySelectorAll('.chat-send').forEach(el => el.disabled = false);
        if (assistantBubble) {
            assistantBubble.textContent = 'Error: Could not reach assistant';
            assistantBubble.closest('.chat-message')?.classList.remove('streaming');
        }
    }
}

// Subscribe a chat container to events
export function subscribeChatContainer(messagesEl, inputEl, sendBtnEl) {
    let assistantBubble = null;
    
    const onUserMessage = (e) => {
        const { prompt } = e.detail;
        if (messagesEl.querySelector('.chat-welcome')) messagesEl.innerHTML = '';
        messagesEl.innerHTML += `<div class="chat-message user">${USER_ICON}<div class="bubble">${escapeHtml(prompt)}</div></div>`;
        if (inputEl) inputEl.value = '';
        if (sendBtnEl) sendBtnEl.disabled = true;
        
        const assistantMsg = document.createElement('div');
        assistantMsg.className = 'chat-message assistant streaming';
        assistantMsg.innerHTML = `${AGENT_ICON}<div class="bubble"></div>`;
        messagesEl.appendChild(assistantMsg);
        assistantBubble = assistantMsg.querySelector('.bubble');
        
        chatAutoScroll = true;
        messagesEl.scrollTop = messagesEl.scrollHeight;
    };
    
    const onStream = (e) => {
        if (assistantBubble) {
            assistantBubble.innerHTML = parseMarkdown(e.detail.text);
            if (chatAutoScroll) messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    };
    
    const onComplete = () => {
        if (assistantBubble) assistantBubble.closest('.chat-message')?.classList.remove('streaming');
        if (sendBtnEl) sendBtnEl.disabled = false;
        updateScrollToBottomBtn(messagesEl);
    };
    
    const onError = (_e) => {
        if (assistantBubble) {
            assistantBubble.textContent = 'Error: Could not reach assistant';
            assistantBubble.closest('.chat-message')?.classList.remove('streaming');
        }
        if (sendBtnEl) sendBtnEl.disabled = false;
    };
    
    chatEvents.addEventListener('user-message', onUserMessage);
    chatEvents.addEventListener('stream', onStream);
    chatEvents.addEventListener('complete', onComplete);
    chatEvents.addEventListener('error', onError);
    
    // Return cleanup function
    return () => {
        chatEvents.removeEventListener('user-message', onUserMessage);
        chatEvents.removeEventListener('stream', onStream);
        chatEvents.removeEventListener('complete', onComplete);
        chatEvents.removeEventListener('error', onError);
    };
}

export function updateScrollToBottomBtn(container) {
    const panel = container.closest('.chat-panel, .chat-wrapper, .chat-body, .card');
    const btn = panel?.querySelector('.chat-input-area .chat-scroll-btn');
    if (!btn) return;
    
    const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
    chatAutoScroll = isNearBottom;
    btn.classList.toggle('visible', !isNearBottom);
}