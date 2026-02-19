<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { OEEBreakdown, FactoryStatusEnterprise } from '@/types'

const loading = ref(true)

interface EnterpriseColumn {
  name: string
  oee: number | null
  sites: Array<{ name: string; oee: number | null }>
  equipmentCounts: {
    running: number
    stopped: number
    faulted: number
    idle: number
  }
}

const enterprises = ref<EnterpriseColumn[]>([])

function getOeeClass(value: number | null): string {
  if (value === null) return 'oee-amber'
  if (value >= 85) return 'oee-green'
  if (value >= 70) return 'oee-amber'
  return 'oee-red'
}

function countEquipmentStates(states: any[], enterprise: string) {
  const counts = { running: 0, stopped: 0, faulted: 0, idle: 0 }
  if (!Array.isArray(states)) return counts

  states.forEach(eq => {
    if (eq.enterprise !== enterprise) return
    const name = (eq.stateName || eq.state || '').toLowerCase()
    if (name === 'running' || name === 'execute') {
      counts.running++
    } else if (name === 'down' || name === 'stopped' || name === 'aborted') {
      counts.stopped++
    } else if (name === 'fault' || name === 'faulted') {
      counts.faulted++
    } else if (name === 'idle' || name === 'standby') {
      counts.idle++
    }
  })
  return counts
}

async function fetchAndRender() {
  try {
    const [compRes, equipRes] = await Promise.all([
      fetch('/api/enterprise/comparison'),
      fetch('/api/equipment/states')
    ])

    if (!compRes.ok || !equipRes.ok) {
      throw new Error('Failed to fetch data')
    }

    const [compData, equipData] = await Promise.all([
      compRes.json() as Promise<{ oeeBreakdown?: { data?: OEEBreakdown }, factoryStatus?: { enterprises?: FactoryStatusEnterprise[] } }>,
      equipRes.json() as Promise<{ states?: any[] }>
    ])

    const oeeData = compData.oeeBreakdown || {}
    const statusData = compData.factoryStatus || {}

    const enterpriseNames = ['Enterprise A', 'Enterprise B', 'Enterprise C']
    const oeeMap = oeeData.data || {}
    const statusList = statusData.enterprises || []
    const equipmentStates = equipData.states || []

    const statusMap: Record<string, FactoryStatusEnterprise> = {}
    statusList.forEach((e: FactoryStatusEnterprise) => {
      statusMap[e.name] = e
    })

    enterprises.value = enterpriseNames.map(name => {
      const oee = oeeMap[name]?.oee ?? null
      const enterpriseStatus = statusMap[name] || { name, sites: [] }
      const sitesArray = enterpriseStatus.sites || []
      const sites = sitesArray.map((s: import('@/types').FactoryStatusSite) => ({
        name: s.name,
        oee: s.oee ?? null
      }))
      const equipmentCounts = countEquipmentStates(equipmentStates, name)

      return {
        name,
        oee,
        sites,
        equipmentCounts
      }
    })
  } catch (error) {
    console.error('Enterprise comparison fetch error:', error)
  } finally {
    loading.value = false
  }
}

let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  fetchAndRender()
  refreshInterval = setInterval(fetchAndRender, 30000)
})

onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<template>
  <div class="enterprise-comparison">
    <div class="view-header">
      <h1 class="view-title">Enterprise Comparison</h1>
    </div>

    <!-- Skeleton shown while initial data is loading -->
    <div v-if="loading" class="enterprise-comparison-grid">
      <div v-for="n in 3" :key="n" class="enterprise-column skeleton-column">
        <!-- Header -->
        <div class="skeleton skeleton-title"></div>

        <!-- OEE value block -->
        <div class="skeleton skeleton-oee-value"></div>
        <div class="skeleton skeleton-oee-label"></div>

        <!-- Sites section -->
        <div class="enterprise-section">
          <div class="skeleton skeleton-section-heading"></div>
          <div class="enterprise-sites-list">
            <div v-for="s in 3" :key="s" class="enterprise-site-row">
              <div class="skeleton skeleton-site-name"></div>
              <div class="skeleton skeleton-site-oee"></div>
            </div>
          </div>
        </div>

        <!-- Equipment section -->
        <div class="enterprise-section">
          <div class="skeleton skeleton-section-heading"></div>
          <div class="equipment-state-counts">
            <div v-for="e in 4" :key="e" class="equipment-state-item">
              <div class="skeleton skeleton-state-count"></div>
              <div class="skeleton skeleton-state-label"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="enterprise-comparison-grid">
      <div v-for="ent in enterprises" :key="ent.name" class="enterprise-column">
        <div class="enterprise-column-header">
          <h3 class="enterprise-name">{{ ent.name }}</h3>
        </div>

        <div class="enterprise-oee-value" :class="getOeeClass(ent.oee)">
          {{ ent.oee !== null ? ent.oee.toFixed(1) : 'N/A' }}<span class="oee-unit">%</span>
        </div>
        <div class="enterprise-oee-label">Overall OEE (24h avg)</div>

        <div class="enterprise-section">
          <h4 class="enterprise-section-title">Sites</h4>
          <div class="enterprise-sites-list">
            <template v-if="ent.sites.length > 0">
              <div v-for="site in ent.sites" :key="site.name" class="enterprise-site-row">
                <span class="site-name">{{ site.name }}</span>
                <span class="site-oee" :class="getOeeClass(site.oee)">
                  {{ site.oee !== null ? site.oee.toFixed(1) + '%' : 'N/A' }}
                </span>
              </div>
            </template>
            <div v-else class="enterprise-site-row">
              <span class="site-name" style="color: var(--text-dim);">No site data available</span>
            </div>
          </div>
        </div>

        <div class="enterprise-section">
          <h4 class="enterprise-section-title">Equipment Status</h4>
          <div class="equipment-state-counts">
            <div class="equipment-state-item state-running">
              <span class="state-count">{{ ent.equipmentCounts.running }}</span>
              <span class="state-label">Running</span>
            </div>
            <div class="equipment-state-item state-stopped">
              <span class="state-count">{{ ent.equipmentCounts.stopped }}</span>
              <span class="state-label">Stopped</span>
            </div>
            <div class="equipment-state-item state-faulted">
              <span class="state-count">{{ ent.equipmentCounts.faulted }}</span>
              <span class="state-label">Faulted</span>
            </div>
            <div class="equipment-state-item state-idle">
              <span class="state-count">{{ ent.equipmentCounts.idle }}</span>
              <span class="state-label">Idle</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.enterprise-comparison {
  padding: 20px;
}

.view-header {
  padding: 0 0 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.view-title {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--persona-color, var(--accent-cyan));
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.enterprise-comparison-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.enterprise-column {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  padding: 24px;
  transition: all 0.3s ease;
}

.enterprise-column:hover {
  border-color: var(--persona-color, var(--accent-cyan));
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.15);
}

.enterprise-column-header {
  margin-bottom: 16px;
}

.enterprise-name {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--persona-color, var(--accent-cyan));
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.enterprise-oee-value {
  font-size: 3rem;
  font-weight: 700;
  font-family: 'Share Tech Mono', monospace;
  text-align: center;
  line-height: 1;
  margin: 12px 0 4px;
}

.enterprise-oee-value .oee-unit {
  font-size: 1.5rem;
  opacity: 0.7;
}

.enterprise-oee-label {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-dim);
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.oee-green {
  color: #10b981;
}

.oee-amber {
  color: #f59e0b;
}

.oee-red {
  color: #ef4444;
}

.enterprise-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.enterprise-section-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0 0 12px;
}

.enterprise-sites-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.enterprise-site-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.site-name {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.site-oee {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
  font-weight: 700;
}

.equipment-state-counts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.equipment-state-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.state-count {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.state-label {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.state-running .state-count {
  color: #10b981;
}

.state-stopped .state-count {
  color: #ef4444;
}

.state-faulted .state-count {
  color: #f59e0b;
}

.state-idle .state-count {
  color: #6b7280;
}

@media (max-width: 1024px) {
  .enterprise-comparison-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Skeleton loading ─────────────────────────────────────────── */

@keyframes skeleton-shimmer {
  0% {
    background-position: -400px 0;
  }
  100% {
    background-position: 400px 0;
  }
}

.skeleton {
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.10) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 800px 100%;
  animation: skeleton-shimmer 1.6s ease-in-out infinite;
}

/* Individual skeleton block dimensions — sized to mirror the real elements */

.skeleton-title {
  height: 1.1rem;
  width: 60%;
  margin-bottom: 16px;
}

.skeleton-oee-value {
  height: 3rem;
  width: 55%;
  margin: 12px auto 4px;
}

.skeleton-oee-label {
  height: 0.75rem;
  width: 70%;
  margin: 0 auto 20px;
}

.skeleton-section-heading {
  height: 0.75rem;
  width: 40%;
  margin-bottom: 12px;
}

.skeleton-site-name {
  height: 0.875rem;
  width: 55%;
}

.skeleton-site-oee {
  height: 0.875rem;
  width: 20%;
}

.skeleton-state-count {
  height: 1.5rem;
  width: 40%;
  margin-bottom: 6px;
}

.skeleton-state-label {
  height: 0.7rem;
  width: 60%;
}
</style>
