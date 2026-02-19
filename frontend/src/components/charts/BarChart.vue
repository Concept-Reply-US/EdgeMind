<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { Chart } from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'

const props = withDefaults(defineProps<{
  chartData: ChartData<'bar'>
  options?: ChartOptions<'bar'>
  height?: number
}>(), {
  height: 380
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart<'bar'> | null = null

function createChart() {
  if (!canvasRef.value) return
  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(canvasRef.value, {
    type: 'bar',
    data: props.chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...props.options
    }
  })
}

watch(() => [props.chartData, props.options], () => {
  if (chartInstance) {
    chartInstance.data = props.chartData
    if (props.options) {
      chartInstance.options = { responsive: true, maintainAspectRatio: false, ...props.options }
    }
    chartInstance.update('none')
  } else {
    createChart()
  }
}, { deep: true })

// Use onMounted via a watcher on canvasRef
watch(canvasRef, (el) => {
  if (el) createChart()
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

defineExpose({ chartInstance: () => chartInstance })
</script>

<template>
  <div class="chart-wrapper" :style="{ height: height + 'px' }">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.chart-wrapper {
  position: relative;
  width: 100%;
}

.chart-wrapper canvas {
  width: 100% !important;
}
</style>
