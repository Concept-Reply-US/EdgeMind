<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { Chart } from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'

const props = withDefaults(defineProps<{
  chartData: ChartData<'doughnut'>
  options?: ChartOptions<'doughnut'>
  height?: number
}>(), {
  height: 300
})

const emit = defineEmits<{
  'chart-click': [payload: { label: string; value: number; datasetIndex: number; index: number }]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart<'doughnut'> | null = null

function handleChartClick(_event: any, elements: any[]) {
  if (elements.length > 0) {
    const element = elements[0]
    if (!element) return
    const datasetIndex = element.datasetIndex
    const index = element.index
    const label = (props.chartData.labels?.[index] as string) || ''
    const dataset = props.chartData.datasets[datasetIndex]
    const value = (dataset?.data[index] as number) || 0

    emit('chart-click', { label, value, datasetIndex, index })
  }
}

function createChart() {
  if (!canvasRef.value) return
  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: props.chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...props.options,
      onClick: handleChartClick
    }
  })
}

watch(() => [props.chartData, props.options], () => {
  if (chartInstance) {
    chartInstance.data = props.chartData
    if (props.options) {
      chartInstance.options = { responsive: true, maintainAspectRatio: false, ...props.options, onClick: handleChartClick }
    }
    chartInstance.update('none')
  } else {
    createChart()
  }
}, { deep: true })

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
