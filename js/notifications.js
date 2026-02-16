// PUSH NOTIFICATIONS - Toast notifications for demo anomalies

import { escapeHtml } from './utils.js';

const MAX_NOTIFICATIONS = 3;
const DEFAULT_DISMISS_MS = 15000;

/**
 * Show a push notification toast
 * @param {Object} options - Notification options
 * @param {string} options.summary - The notification text (required)
 * @param {string} [options.severity='default'] - Severity level: 'low', 'medium', 'high', 'default'
 * @param {string} [options.badge='ALERT'] - Badge text
 * @param {string} [options.meta] - Optional footer text
 * @param {number} [options.dismissMs=15000] - Auto-dismiss timeout in milliseconds
 */
export function showNotification({ summary, severity = 'default', badge = 'ALERT', meta, dismissMs = DEFAULT_DISMISS_MS }) {
    // Fix 1: Validate severity against whitelist
    const VALID_SEVERITIES = ['low', 'medium', 'high', 'default'];
    const safeSeverity = VALID_SEVERITIES.includes(severity) ? severity : 'default';

    // Fix 2: Coerce dismissMs to number with safe bounds
    const safeDismissMs = Math.max(1000, Math.min(60000, parseInt(dismissMs, 10) || DEFAULT_DISMISS_MS));

    // Get or create container
    let container = document.getElementById('push-notifications');
    if (!container) {
        container = document.createElement('div');
        container.id = 'push-notifications';
        container.className = 'push-notification-container';
        document.body.appendChild(container);
    }

    // Create timestamp
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `push-notification severity-${safeSeverity}`;

    const sanitizedSummary = escapeHtml(summary);
    const sanitizedBadge = escapeHtml(badge);
    const sanitizedMeta = meta ? escapeHtml(meta) : null;

    notification.innerHTML = `
        <button class="notification-dismiss" aria-label="Dismiss">&times;</button>
        <div class="notification-header">
            <span class="notification-badge severity-${safeSeverity}">${sanitizedBadge}</span>
            <span class="notification-timestamp">${timestamp}</span>
        </div>
        <div class="notification-body">${sanitizedSummary}</div>
        ${sanitizedMeta ? `<div class="notification-meta">${sanitizedMeta}</div>` : ''}
        <div class="notification-timer severity-${safeSeverity}" style="animation-duration: ${safeDismissMs}ms;"></div>
    `;

    // Fix 3: Store timeout ID on notification element for cleanup
    notification._dismissTimeout = null;
    notification._isDismissing = false;

    // Set up dismiss button
    const dismissBtn = notification.querySelector('.notification-dismiss');
    dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissNotification(notification);
    });

    // Set up hover pause/resume
    let remainingTime = safeDismissMs;
    let startTime = Date.now();
    const timerBar = notification.querySelector('.notification-timer');

    const startAutoClose = () => {
        startTime = Date.now();
        notification._dismissTimeout = setTimeout(() => {
            dismissNotification(notification);
        }, remainingTime);
    };

    const pauseAutoClose = () => {
        clearTimeout(notification._dismissTimeout);
        // Fix 4: Guard against negative remainingTime
        remainingTime = Math.max(0, remainingTime - (Date.now() - startTime));
        timerBar.style.animationPlayState = 'paused';
    };

    const resumeAutoClose = () => {
        // If remainingTime is 0, dismiss immediately instead of setting 0ms timeout
        if (remainingTime === 0) {
            dismissNotification(notification);
        } else {
            startAutoClose();
            timerBar.style.animationPlayState = 'running';
        }
    };

    notification.addEventListener('mouseenter', pauseAutoClose);
    notification.addEventListener('mouseleave', resumeAutoClose);

    // Append to container
    container.appendChild(notification);

    // Enforce max notifications (remove oldest)
    const notifications = container.querySelectorAll('.push-notification');
    if (notifications.length > MAX_NOTIFICATIONS) {
        const oldest = notifications[0];
        dismissNotification(oldest);
    }

    // Start auto-dismiss timer
    startAutoClose();
}

/**
 * Dismiss a notification with animation
 */
function dismissNotification(notification) {
    // Fix 3: Prevent double-dismiss and clear timeout
    if (notification._isDismissing) return;
    notification._isDismissing = true;
    clearTimeout(notification._dismissTimeout);

    notification.classList.add('dismissing');
    notification.addEventListener('transitionend', () => {
        notification.remove();
    }, { once: true });

    // Fallback: remove after 500ms if transitionend doesn't fire
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 500);
}
