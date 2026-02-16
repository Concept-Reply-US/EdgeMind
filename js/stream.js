// STREAM - MQTT message stream display

import { state } from './state.js';
import { escapeHtml } from './utils.js';

/**
 * Get event type from topic
 */
function getEventType(topic) {
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('oee')) return 'oee';
    if (lowerTopic.includes('state')) return 'state';
    if (lowerTopic.includes('alarm')) return 'alarm';
    return 'other';
}

/**
 * Check if message matches current filter
 */
function matchesFilter(message) {
    if (state.eventFilter === 'all') return true;
    const eventType = getEventType(message.topic);
    return eventType === state.eventFilter;
}

/**
 * Add MQTT message to the stream display
 */
export function addMQTTMessageToStream(message) {
    if (state.streamPaused) return;

    const stream = document.getElementById('mqtt-stream');
    if (!stream) return;

    // Check if message matches current filter
    if (!matchesFilter(message)) return;

    if (state.stats.messageCount === 1) {
        stream.innerHTML = '';
    }

    const timestamp = new Date(message.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });

    const line = document.createElement('div');
    line.className = 'stream-line';

    const eventType = getEventType(message.topic);
    line.setAttribute('data-event-type', eventType);

    const escapedTopic = escapeHtml(message.topic);
    const escapedPayload = typeof message.payload === 'object'
        ? escapeHtml(JSON.stringify(message.payload))
        : escapeHtml(String(message.payload));

    line.innerHTML = `
        <span class="stream-timestamp">[${timestamp}]</span>
        <span class="stream-topic">${escapedTopic}</span>
        <span class="stream-value">${escapedPayload}</span>
    `;

    const isAtBottom = stream.scrollHeight - stream.scrollTop <= stream.clientHeight + 10;

    stream.appendChild(line);

    const maxWhileScrolled = 100;
    const normalMax = 30;

    if (isAtBottom) {
        while (stream.children.length > normalMax) {
            stream.removeChild(stream.firstChild);
        }
        stream.scrollTop = stream.scrollHeight;
    } else {
        while (stream.children.length > maxWhileScrolled) {
            stream.removeChild(stream.firstChild);
        }
    }
}

/**
 * Filter events by type
 */
export function filterEvents(eventType, clickedTab) {
    state.eventFilter = eventType;

    document.querySelectorAll('.event-tab:not(.pause-btn)').forEach(tab => {
        tab.classList.remove('active');
    });
    if (clickedTab) clickedTab.classList.add('active');

    const stream = document.getElementById('mqtt-stream');
    if (!stream) return;

    // Clear stream and re-render from state.messages with new filter
    stream.innerHTML = '';
    state.messages.forEach(msg => addMQTTMessageToStream(msg));
}

/**
 * Toggle stream pause/resume
 */
export function toggleStreamPause() {
    state.streamPaused = !state.streamPaused;

    const pauseBtn = document.getElementById('stream-pause-btn');
    const pauseBtnText = document.getElementById('pause-btn-text');
    const stream = document.getElementById('mqtt-stream');

    if (state.streamPaused) {
        pauseBtn.classList.add('paused');
        pauseBtnText.textContent = '▶ Resume';
        stream.classList.add('paused');
    } else {
        pauseBtn.classList.remove('paused');
        pauseBtnText.textContent = '⏸ Pause';
        stream.classList.remove('paused');
    }
}
