<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import CommandBar from '@/components/CommandBar.vue'
import Footer from '@/components/Footer.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import SettingsModal from '@/components/modals/SettingsModal.vue'
import NotificationToast from '@/components/ui/NotificationToast.vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { usePersonaStore } from '@/stores/persona'

const route = useRoute()
const personaStore = usePersonaStore()
const showSettings = ref(false)

// Auto-connect WebSocket
useWebSocket()

// Keyboard shortcuts (1/2/3)
useKeyboardShortcuts()

// Sync theme with persona
watchEffect(() => {
  document.body.setAttribute('data-theme', personaStore.theme)
})

// Sync persona from route
watchEffect(() => {
  const path = route.path
  if (path.startsWith('/coo')) personaStore.setPersona('coo')
  else if (path.startsWith('/plant')) personaStore.setPersona('plant')
  else if (path.startsWith('/demo')) personaStore.setPersona('demo')
})
</script>

<template>
  <CommandBar @toggle-settings="showSettings = !showSettings" />
  <div class="content">
    <RouterView />
  </div>
  <Footer />
  <ChatPanel />
  <SettingsModal :show="showSettings" @close="showSettings = false" />
  <NotificationToast />
</template>

<style>
/* Layout — global (not scoped) so child views can use .content, .dashboard-grid */
.content {
  margin-top: 88px;
  max-width: 1800px;
  margin-left: auto;
  margin-right: auto;
  padding: 24px 20px;
  position: relative;
  z-index: 1;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}
</style>
