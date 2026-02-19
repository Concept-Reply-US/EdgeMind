<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  expandable?: boolean
  span?: number
}>(), {
  expandable: false,
  span: 6
})

const emit = defineEmits<{
  expand: []
}>()
</script>

<template>
  <div class="card" :style="{ gridColumn: `span ${span}` }">
    <div class="card-title">
      {{ title }}
      <button v-if="expandable" class="card-expand-btn" @click="emit('expand')" title="Maximize">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
        </svg>
      </button>
    </div>
    <slot />
  </div>
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
}

.card-expand-btn:hover {
  color: var(--accent-cyan);
  background: rgba(0, 255, 255, 0.1);
}
</style>
