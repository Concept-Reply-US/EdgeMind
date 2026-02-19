<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePersonaStore } from '@/stores/persona'
import { useConnectionStore } from '@/stores/connection'
import type { PersonaType } from '@/types'

const router = useRouter()
const route = useRoute()
const personaStore = usePersonaStore()
const connectionStore = useConnectionStore()

const personas = [
  {
    key: 'coo' as PersonaType,
    label: 'COO',
    shortcut: '1',
    icon: 'grid'
  },
  {
    key: 'plant' as PersonaType,
    label: 'Plant Mgr',
    shortcut: '2',
    icon: 'wrench'
  },
  {
    key: 'demo' as PersonaType,
    label: 'Demo Ctrl',
    shortcut: '3',
    icon: 'play'
  }
]

interface SubNavItem {
  label: string
  routeName: string
}

const subNavItems: Record<PersonaType, SubNavItem[]> = {
  coo: [
    { label: 'Dashboard', routeName: 'coo-dashboard' },
    { label: 'Enterprise Comparison', routeName: 'coo-enterprise' },
    { label: 'Trend Analysis', routeName: 'coo-trends' },
    { label: 'Agent Q&A', routeName: 'coo-agent' }
  ],
  plant: [
    { label: 'Line Status', routeName: 'plant-line-status' },
    { label: 'OEE Drill-down', routeName: 'plant-oee-drilldown' },
    { label: 'Equipment Health', routeName: 'plant-equipment' },
    { label: 'Alerts & Work Orders', routeName: 'plant-alerts' }
  ],
  demo: [
    { label: 'Scenario Selector', routeName: 'demo-scenarios' },
    { label: 'Inject Anomaly', routeName: 'demo-inject' },
    { label: 'Timer', routeName: 'demo-timer' }
  ]
}

const currentSubNav = computed(() => subNavItems[personaStore.activePersona])

function switchPersona(key: PersonaType) {
  personaStore.setPersona(key)
  const defaultRoutes: Record<PersonaType, string> = {
    coo: 'coo-dashboard',
    plant: 'plant-line-status',
    demo: 'demo-scenarios'
  }
  router.push({ name: defaultRoutes[key] })
}

function navigateToView(routeName: string) {
  personaStore.setView(routeName)
  router.push({ name: routeName })
}

function isActiveSubNav(routeName: string): boolean {
  return route.name === routeName
}
</script>

<template>
  <div class="command-bar">
    <div class="command-bar__left">
      <div class="logo">REPLY</div>
      <div class="divider"></div>
      <div class="title">EDGE MIND</div>
    </div>

    <div class="command-bar__center">
      <button
        v-for="persona in personas"
        :key="persona.key"
        class="persona-chip"
        :class="{ active: personaStore.activePersona === persona.key }"
        :data-persona="persona.key"
        @click="switchPersona(persona.key)"
      >
        <!-- COO icon -->
        <svg v-if="persona.key === 'coo'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="4" y="4" width="16" height="16" rx="1"/>
          <line x1="8" y1="8" x2="8" y2="10"/>
          <line x1="12" y1="8" x2="12" y2="10"/>
          <line x1="16" y1="8" x2="16" y2="10"/>
          <line x1="8" y1="13" x2="8" y2="15"/>
          <line x1="12" y1="13" x2="12" y2="15"/>
          <line x1="16" y1="13" x2="16" y2="15"/>
        </svg>
        <!-- Plant icon -->
        <svg v-if="persona.key === 'plant'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
        <!-- Demo icon -->
        <svg v-if="persona.key === 'demo'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
        </svg>
        <span>{{ persona.label }}</span>
        <span class="persona-chip__shortcut">{{ persona.shortcut }}</span>
      </button>
    </div>

    <div class="command-bar__right">
      <div class="status" :class="{ disconnected: !connectionStore.isConnected }">
        <div class="status__dot" :style="{ background: connectionStore.isConnected ? 'var(--accent-green)' : 'var(--accent-red)' }"></div>
        <span>{{ connectionStore.isConnected ? 'SYSTEM ONLINE' : 'RECONNECTING...' }}</span>
      </div>
    </div>
  </div>

  <!-- Sub Navigation -->
  <div class="sub-nav">
    <div class="sub-nav__panel active">
      <button
        v-for="item in currentSubNav"
        :key="item.routeName"
        class="sub-nav__item"
        :class="{ active: isActiveSubNav(item.routeName) }"
        @click="navigateToView(item.routeName)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.command-bar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 48px;
    background: var(--bg-dark);
    border-bottom: 1px solid rgba(0, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 1010;
}

.command-bar__left,
.command-bar__right {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 240px;
}

.command-bar__center {
    display: flex;
    align-items: center;
    gap: 10px;
}

.logo {
    font-family: 'Orbitron', sans-serif;
    font-weight: 900;
    font-size: 0.95rem;
    color: var(--reply-red);
    letter-spacing: 4px;
}

.divider {
    width: 1px;
    height: 24px;
    background: rgba(0, 255, 255, 0.2);
}

.title {
    font-family: 'Orbitron', sans-serif;
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 3px;
    background: linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.persona-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 14px;
    border-radius: 16px;
    border: 1px solid;
    background: transparent;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    color: var(--text-dim);
    border-color: rgba(0, 255, 255, 0.15);
}

.persona-chip svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
}

.persona-chip__shortcut {
    opacity: 0.5;
    font-size: 0.7rem;
    margin-left: 2px;
}

.persona-chip[data-persona="coo"]:hover {
    background: rgba(0, 255, 255, 0.08);
    color: var(--accent-cyan);
    border-color: rgba(0, 255, 255, 0.4);
}

.persona-chip[data-persona="coo"].active {
    background: rgba(0, 255, 255, 0.15);
    color: var(--accent-cyan);
    border-color: rgba(0, 255, 255, 0.6);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    animation: pulse-cyan 3s ease-in-out infinite;
}

.persona-chip[data-persona="plant"]:hover {
    background: rgba(0, 255, 136, 0.08);
    color: var(--accent-green);
    border-color: rgba(0, 255, 136, 0.4);
}

.persona-chip[data-persona="plant"].active {
    background: rgba(0, 255, 136, 0.15);
    color: var(--accent-green);
    border-color: rgba(0, 255, 136, 0.6);
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
    animation: pulse-green 3s ease-in-out infinite;
}

.persona-chip[data-persona="demo"]:hover {
    background: rgba(255, 191, 0, 0.08);
    color: var(--accent-amber);
    border-color: rgba(255, 191, 0, 0.4);
}

.persona-chip[data-persona="demo"].active {
    background: rgba(255, 191, 0, 0.15);
    color: var(--accent-amber);
    border-color: rgba(255, 191, 0, 0.6);
    box-shadow: 0 0 20px rgba(255, 191, 0, 0.3);
    animation: pulse-amber 3s ease-in-out infinite;
}

.persona-chip.active::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 2px;
    background: currentColor;
}

.status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--accent-green);
}

.status__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-green);
    animation: pulse-dot 2s ease-in-out infinite;
}

.settings-icon {
    width: 20px;
    height: 20px;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s ease;
}

.settings-icon:hover {
    color: var(--accent-cyan);
    transform: rotate(45deg);
}

.sub-nav {
    position: fixed;
    top: 48px;
    left: 0;
    width: 100%;
    height: 40px;
    background: var(--bg-card);
    display: flex;
    align-items: center;
    padding: 0 20px;
    z-index: 1009;
}

.sub-nav__panel {
    display: none;
    gap: 8px;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.sub-nav__panel.active {
    display: flex;
    opacity: 1;
    transform: translateY(0);
}

.sub-nav__item {
    height: 28px;
    padding: 0 12px;
    border-radius: 4px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    position: relative;
}

.sub-nav__item:hover {
    color: var(--persona-color);
    background: rgba(var(--persona-color-rgb), 0.08);
}

.sub-nav__item.active {
    color: var(--persona-color);
    background: rgba(var(--persona-color-rgb), 0.12);
}

.sub-nav__item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--persona-color);
}

.system-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    color: var(--text-dim);
}
</style>
