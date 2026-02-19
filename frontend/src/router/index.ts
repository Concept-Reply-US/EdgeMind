import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/coo/dashboard'
    },
    {
      path: '/coo',
      redirect: '/coo/dashboard',
      children: [
        { path: 'dashboard', name: 'coo-dashboard', component: () => import('@/views/coo/Dashboard.vue') },
        { path: 'enterprise', name: 'coo-enterprise', component: () => import('@/views/coo/Enterprise.vue') },
        { path: 'trends', name: 'coo-trends', component: () => import('@/views/coo/Trends.vue') },
        { path: 'agent', name: 'coo-agent', component: () => import('@/views/coo/Agent.vue') },
      ]
    },
    {
      path: '/plant',
      redirect: '/plant/line-status',
      children: [
        { path: 'line-status', name: 'plant-line-status', component: () => import('@/views/plant/LineStatus.vue') },
        { path: 'oee-drilldown', name: 'plant-oee-drilldown', component: () => import('@/views/plant/OEEDrilldown.vue') },
        { path: 'equipment', name: 'plant-equipment', component: () => import('@/views/plant/Equipment.vue') },
        { path: 'alerts', name: 'plant-alerts', component: () => import('@/views/plant/Alerts.vue') },
        { path: 'cesmii', name: 'plant-cesmii', component: () => import('@/views/plant/CesmiiWorkOrders.vue') },
        { path: 'process-trends', name: 'plant-process-trends', component: () => import('@/views/plant/ProcessTrends.vue') },
      ]
    },
    {
      path: '/demo',
      redirect: '/demo/scenarios',
      children: [
        { path: 'scenarios', name: 'demo-scenarios', component: () => import('@/views/demo/Scenarios.vue') },
        { path: 'inject', name: 'demo-inject', component: () => import('@/views/demo/Inject.vue') },
        { path: 'timer', name: 'demo-timer', component: () => import('@/views/demo/Timer.vue') },
      ]
    },
  ]
})

export default router
