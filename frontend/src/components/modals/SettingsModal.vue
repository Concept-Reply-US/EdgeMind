<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import { useAppStore } from '@/stores/app'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const appStore = useAppStore()

const form = ref({
  oeeBaseline: appStore.thresholdSettings.oeeBaseline,
  oeeWorldClass: appStore.thresholdSettings.oeeWorldClass,
  availabilityMin: appStore.thresholdSettings.availabilityMin,
  defectRateWarning: appStore.thresholdSettings.defectRateWarning,
  defectRateCritical: appStore.thresholdSettings.defectRateCritical
})

watch(() => props.show, (shown) => {
  if (shown) {
    form.value = { ...appStore.thresholdSettings }
  }
})

const saving = ref(false)
const errorMsg = ref('')

async function save() {
  errorMsg.value = ''
  for (const [key, value] of Object.entries(form.value)) {
    if (isNaN(value) || value < 0 || value > 100) {
      errorMsg.value = `Invalid ${key}: must be 0-100`
      return
    }
  }

  saving.value = true
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    if (!response.ok) throw new Error('Failed to save')
    const updated = await response.json()
    appStore.setThresholdSettings(updated)
    emit('close')
  } catch {
    errorMsg.value = 'Failed to save settings'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Modal :show="show" title="Threshold Settings" max-width="500px" @close="emit('close')">
    <form class="settings-form" @submit.prevent="save">
      <div class="form-group">
        <label>OEE Baseline (%)</label>
        <input v-model.number="form.oeeBaseline" type="number" min="0" max="100" step="1" />
      </div>
      <div class="form-group">
        <label>OEE World Class (%)</label>
        <input v-model.number="form.oeeWorldClass" type="number" min="0" max="100" step="1" />
      </div>
      <div class="form-group">
        <label>Availability Min (%)</label>
        <input v-model.number="form.availabilityMin" type="number" min="0" max="100" step="1" />
      </div>
      <div class="form-group">
        <label>Defect Rate Warning (%)</label>
        <input v-model.number="form.defectRateWarning" type="number" min="0" max="100" step="0.1" />
      </div>
      <div class="form-group">
        <label>Defect Rate Critical (%)</label>
        <input v-model.number="form.defectRateCritical" type="number" min="0" max="100" step="0.1" />
      </div>
      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="emit('close')">Cancel</button>
        <button type="submit" class="btn-save" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </button>
      </div>
    </form>
  </Modal>
</template>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.form-group input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 6px;
  color: var(--text-primary);
  padding: 10px 14px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-cyan);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
}

.error-msg {
  color: var(--accent-red);
  font-size: 0.85rem;
  font-family: 'Rajdhani', sans-serif;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.btn-cancel, .btn-save {
  padding: 10px 20px;
  border-radius: 6px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
}

.btn-cancel {
  background: transparent;
  color: var(--text-dim);
  border-color: rgba(0, 255, 255, 0.2);
}

.btn-cancel:hover {
  color: var(--text-primary);
  border-color: rgba(0, 255, 255, 0.4);
}

.btn-save {
  background: rgba(0, 255, 255, 0.15);
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
}

.btn-save:hover {
  background: rgba(0, 255, 255, 0.25);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
