<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  size?: number
}>(), {
  size: 180
})

const radius = computed(() => props.size / 2 - 12)
const circumference = computed(() => 2 * Math.PI * radius.value)
const offset = computed(() => {
  const clampedValue = Math.max(0, Math.min(100, props.value))
  return circumference.value - (clampedValue / 100) * circumference.value
})
const center = computed(() => props.size / 2)

const gaugeColor = computed(() => {
  if (props.value >= 85) return 'var(--accent-green)'
  if (props.value >= 65) return 'var(--accent-amber)'
  return 'var(--accent-red)'
})

const displayValue = computed(() => {
  if (props.value == null || isNaN(props.value)) return '--'
  return props.value.toFixed(1) + '%'
})
</script>

<template>
  <div class="oee-gauge-container">
    <div class="oee-gauge" :style="{ width: size + 'px', height: size + 'px' }">
      <svg :width="size" :height="size">
        <circle
          class="oee-gauge-bg"
          :cx="center"
          :cy="center"
          :r="radius"
        />
        <circle
          class="oee-gauge-fill"
          :cx="center"
          :cy="center"
          :r="radius"
          :stroke="gaugeColor"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="offset"
        />
      </svg>
      <div class="oee-gauge-text">
        <div class="oee-value" :style="{ color: gaugeColor }">{{ displayValue }}</div>
        <div class="oee-label">Overall OEE</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.oee-gauge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: rgba(0, 255, 255, 0.05);
  border-radius: 8px;
}

.oee-gauge {
  position: relative;
}

.oee-gauge svg {
  transform: rotate(-90deg);
}

.oee-gauge-bg {
  fill: none;
  stroke: rgba(0, 255, 255, 0.1);
  stroke-width: 12;
}

.oee-gauge-fill {
  fill: none;
  stroke-width: 12;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s ease-out, stroke 0.3s ease;
}

.oee-gauge-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.oee-value {
  font-family: 'Orbitron', sans-serif;
  font-size: 2.5rem;
  font-weight: 900;
}

.oee-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.8rem;
  color: var(--text-dim);
  text-transform: uppercase;
}
</style>
