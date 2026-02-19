export interface MqttMessage {
  topic: string
  value: string | number
  timestamp?: string
}

export interface Insight {
  id?: string
  text?: string
  summary?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  timestamp?: string
  anomalies?: Anomaly[]
  demoTriggered?: boolean
  demoScenario?: string
  enterprise?: string
  insightsEnabled?: boolean
}

export interface Anomaly {
  id?: string
  type: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  enterprise?: string
  site?: string
  machine?: string
  metric?: string
  value?: number
  threshold?: number
  timestamp?: string
}

export interface Stats {
  messageCount: number
  anomalyCount: number
  lastUpdate: string | null
}

export interface OEEData {
  average: number | null
  period?: string
  availability?: number
  performance?: number
  quality?: number
}

export interface OEEBreakdown {
  [enterprise: string]: {
    oee: number
    availability?: number
    performance?: number
    quality?: number
  }
}

export interface EquipmentState {
  id: string
  name: string
  state: string
  enterprise: string
  site: string
  reason?: string
  color?: string
}

export interface ThresholdSettings {
  oeeBaseline: number
  oeeWorldClass: number
  availabilityMin: number
  defectRateWarning: number
  defectRateCritical: number
}

export interface DemoScenario {
  id: string
  name: string
  description: string
  duration?: number
  status?: 'idle' | 'running' | 'completed'
}

export interface AnomalyProfile {
  id: string
  name: string
  type: string
  description: string
}

export interface CesmiiWorkOrder {
  id: string
  type?: string
  enterprise?: string
  site?: string
  status?: string
  payload?: Record<string, unknown>
  receivedAt?: string
}

export interface FactoryStatusEnterprise {
  enterprise: string
  oee?: number
  sites?: FactoryStatusSite[]
}

export interface FactoryStatusSite {
  site: string
  oee?: number
  lines?: number
}

export interface LineOEE {
  line: string
  enterprise: string
  site: string
  oee: number
  availability?: number
  performance?: number
  quality?: number
}

export interface WasteLine {
  line: string
  site: string
  enterprise: string
  total: number
}

export interface QualitySummary {
  [enterprise: string]: {
    avg: number
    total: number
    trend: 'rising' | 'falling' | 'stable'
  }
}

export type PersonaType = 'coo' | 'plant' | 'demo'
export type InsightFilter = 'all' | 'anomalies' | 'trends' | 'recommendations'
export type EventFilter = 'all' | 'mqtt' | 'equipment' | 'oee'

// Chart.js types re-export
export type { ChartData, ChartOptions } from 'chart.js'
