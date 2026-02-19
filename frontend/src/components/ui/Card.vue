<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  expandable?: boolean
  span?: number
}>(), {
  expandable: true,
  span: 6
})

const isExpanded = ref(false)

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && isExpanded.value) {
    isExpanded.value = false
  }
}

function handleBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('card-modal-overlay')) {
    isExpanded.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div class="card" :style="{ gridColumn: `span ${span}` }">
    <div class="card-title">
      {{ title }}
      <button
        v-if="expandable"
        class="card-expand-btn"
        @click="isExpanded = true"
        title="Maximize"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
        </svg>
      </button>
    </div>
    <slot />
  </div>

  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="isExpanded"
        class="card-modal-overlay"
        @click="handleBackdropClick"
      >
        <div class="card-modal-container">
          <div class="card-modal-header">
            <h3 class="card-modal-title">{{ title }}</h3>
            <button class="card-modal-close" @click="isExpanded = false" title="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="card-modal-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.card {
  background: var(--bg-card);
  border: 1px solid rgba(0, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-magenta));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.card:hover {
  border-color: rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
}

.card:hover::before {
  opacity: 1;
}

.card-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--persona-color, var(--accent-cyan));
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-expand-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-expand-btn:hover {
  color: var(--accent-cyan);
  background: rgba(0, 255, 255, 0.1);
  transform: scale(1.1);
}

/* Modal Overlay */
.card-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  padding: 20px;
}

.card-modal-container {
  background: var(--bg-card);
  border: 2px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  width: 90vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 60px rgba(0, 255, 255, 0.3);
  overflow: hidden;
}

.card-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 2px solid rgba(0, 255, 255, 0.2);
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(255, 0, 255, 0.05));
  flex-shrink: 0;
}

.card-modal-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--accent-cyan);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.card-modal-close {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-modal-close:hover {
  color: var(--accent-red);
  background: rgba(255, 51, 102, 0.15);
  transform: scale(1.1);
}

.card-modal-body {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

/* Smooth transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-active .card-modal-container,
.modal-fade-leave-active .card-modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .card-modal-container,
.modal-fade-leave-to .card-modal-container {
  transform: scale(0.9) translateY(-20px);
  opacity: 0;
}

/* Custom scrollbar for modal body */
.card-modal-body::-webkit-scrollbar {
  width: 8px;
}

.card-modal-body::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.card-modal-body::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.3);
  border-radius: 4px;
}

.card-modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 255, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .card-modal-container {
    width: 95vw;
    height: 95vh;
  }

  .card-modal-header {
    padding: 15px 18px;
  }

  .card-modal-title {
    font-size: 1rem;
  }

  .card-modal-body {
    padding: 18px;
  }
}
</style>
