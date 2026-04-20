// Satellite Collision Risk Dashboard Types

export interface Satellite {
  id: string
  name: string
  noradId: string
  orbitType: 'LEO' | 'MEO' | 'GEO' | 'HEO'
  altitude: number // km
  velocity: number // km/s
  inclination: number // degrees
  eccentricity: number
  raan: number // Right Ascension of Ascending Node
  argOfPerigee: number
  meanAnomaly: number
  epoch: string
}

export interface ConjunctionEvent {
  id: string
  primarySatelliteId: string
  secondarySatelliteId: string
  secondaryObjectName: string
  tca: string // Time of Closest Approach (ISO string)
  missDistance: number // meters
  relativeVelocity: number // km/s
  collisionProbability: number // 0-1
  riskScore: number // 0-1
  riskCategory: RiskCategory
  radialDistance: number // meters
  inTrackDistance: number // meters
  crossTrackDistance: number // meters
  combinedSize: number // meters
  dataSource: string
  createdAt: string
  features?: Record<string, number>
}

export type RiskCategory = 'Low' | 'Medium' | 'High'

export interface PredictionInput {
  satelliteId: string
  altitude: number
  velocity: number
  inclination: number
  eccentricity: number
  missDistance: number
  relativeVelocity: number
  radialDistance: number
  inTrackDistance: number
  crossTrackDistance: number
  combinedSize: number
  timeToTca: number // hours
}

export interface PredictionResult {
  riskScore: number
  riskCategory: RiskCategory
  collisionProbability: number
  confidence: number
  featureImportance: Record<string, number>
  modelVersion: string
  timestamp: string
}

export interface OptimizationInput {
  conjunctionId: string
  currentRiskScore: number
  satelliteId: string
  altitude: number
  velocity: number
  missDistance: number
  relativeVelocity: number
  timeToTca: number
  fuelRemaining: number // percentage
  maxDeltaV: number // m/s
}

export interface ManeuverOption {
  id: string
  type: 'Prograde' | 'Retrograde' | 'Radial-In' | 'Radial-Out' | 'Normal' | 'Anti-Normal'
  deltaV: number // m/s
  burnDuration: number // seconds
  executionTime: string // ISO string
  newMissDistance: number // meters
  newRiskScore: number
  riskReduction: number // percentage
  fuelCost: number // percentage
  confidence: number
}

export interface OptimizationResult {
  success: boolean
  conjunctionId: string
  originalRiskScore: number
  bestManeuver: ManeuverOption | null
  alternativeManeuvers: ManeuverOption[]
  quboEnergy: number
  solverIterations: number
  computeTime: number // ms
  message: string
  timestamp: string
}

export interface Alert {
  id: string
  type: 'critical' | 'warning' | 'info' | 'success'
  title: string
  message: string
  conjunctionId?: string
  satelliteId?: string
  timestamp: string
  acknowledged: boolean
}

export interface SimulationState {
  isRunning: boolean
  isPaused: boolean
  currentIndex: number
  totalDataPoints: number
  updateInterval: number // ms
  lastUpdate: string
  dataSource: 'demo' | 'uploaded' | 'live'
}

export interface DashboardState {
  satellites: Satellite[]
  conjunctions: ConjunctionEvent[]
  selectedSatelliteId: string | null
  selectedConjunctionId: string | null
  currentPrediction: PredictionResult | null
  lastOptimization: OptimizationResult | null
  alerts: Alert[]
  simulation: SimulationState
  historicalData: HistoricalDataPoint[]
  systemStatus: SystemStatus
}

export interface HistoricalDataPoint {
  timestamp: string
  satelliteId: string
  riskScore: number
  collisionProbability: number
  missDistance: number
  altitude: number
}

export interface SystemStatus {
  mlModelLoaded: boolean
  quboSolverReady: boolean
  dataLoaded: boolean
  lastDataUpdate: string
  connectionStatus: 'connected' | 'disconnected' | 'error'
}

export interface ChartDataPoint {
  timestamp: string
  value: number
  label?: string
  category?: string
}

export interface FeatureValue {
  name: string
  value: number
  importance: number
}

// CSV Data Row Interface (for parsing uploaded data)
export interface CSVDataRow {
  satellite_id: string
  satellite_name: string
  norad_id: string
  orbit_type: string
  altitude: number
  velocity: number
  inclination: number
  eccentricity: number
  secondary_object: string
  tca: string
  miss_distance: number
  relative_velocity: number
  radial_distance: number
  in_track_distance: number
  cross_track_distance: number
  combined_size: number
  collision_probability?: number
  risk_score?: number
  [key: string]: string | number | undefined
}

// Filter Options
export interface FilterOptions {
  riskCategories: RiskCategory[]
  satelliteIds: string[]
  orbitTypes: Satellite['orbitType'][]
  timeRange: {
    start: string | null
    end: string | null
  }
  minRiskScore: number
  maxRiskScore: number
}

// Export Options
export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf'
  includeCharts: boolean
  includeAlerts: boolean
  includeOptimization: boolean
  dateRange: {
    start: string
    end: string
  }
}
