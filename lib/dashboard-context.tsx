"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type {
  Satellite,
  ConjunctionEvent,
  PredictionResult,
  OptimizationResult,
  Alert,
  SimulationState,
  HistoricalDataPoint,
  SystemStatus,
  DashboardState,
  RiskCategory
} from './types'

interface DashboardContextType extends DashboardState {
  // Satellite actions
  setSelectedSatellite: (id: string | null) => void
  setSatellites: (satellites: Satellite[]) => void
  
  // Conjunction actions
  setSelectedConjunction: (id: string | null) => void
  setConjunctions: (conjunctions: ConjunctionEvent[]) => void
  addConjunction: (conjunction: ConjunctionEvent) => void
  
  // Prediction actions
  setPrediction: (prediction: PredictionResult | null) => void
  
  // Optimization actions
  setOptimization: (result: OptimizationResult | null) => void
  
  // Alert actions
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => void
  acknowledgeAlert: (id: string) => void
  clearAlerts: () => void
  
  // Simulation actions
  setSimulationState: (state: Partial<SimulationState>) => void
  toggleSimulation: () => void
  resetSimulation: () => void
  advanceSimulation: () => void
  
  // Historical data
  addHistoricalPoint: (point: HistoricalDataPoint) => void
  setHistoricalData: (data: HistoricalDataPoint[]) => void
  
  // System status
  setSystemStatus: (status: Partial<SystemStatus>) => void
  
  // Utility
  getRiskColor: (category: RiskCategory) => string
  getRiskGlowClass: (category: RiskCategory) => string
}

const initialSimulationState: SimulationState = {
  isRunning: false,
  isPaused: false,
  currentIndex: 0,
  totalDataPoints: 0,
  updateInterval: 5000,
  lastUpdate: new Date().toISOString(),
  dataSource: 'demo'
}

const initialSystemStatus: SystemStatus = {
  mlModelLoaded: false,
  quboSolverReady: false,
  dataLoaded: false,
  lastDataUpdate: new Date().toISOString(),
  connectionStatus: 'disconnected'
}

const DashboardContext = createContext<DashboardContextType | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [satellites, setSatellitesState] = useState<Satellite[]>([])
  const [conjunctions, setConjunctionsState] = useState<ConjunctionEvent[]>([])
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(null)
  const [selectedConjunctionId, setSelectedConjunctionId] = useState<string | null>(null)
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null)
  const [lastOptimization, setLastOptimization] = useState<OptimizationResult | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [simulation, setSimulation] = useState<SimulationState>(initialSimulationState)
  const [historicalData, setHistoricalDataState] = useState<HistoricalDataPoint[]>([])
  const [systemStatus, setSystemStatusState] = useState<SystemStatus>(initialSystemStatus)

  const setSelectedSatellite = useCallback((id: string | null) => {
    setSelectedSatelliteId(id)
  }, [])

  const setSatellites = useCallback((sats: Satellite[]) => {
    setSatellitesState(sats)
  }, [])

  const setSelectedConjunction = useCallback((id: string | null) => {
    setSelectedConjunctionId(id)
  }, [])

  const setConjunctions = useCallback((conjs: ConjunctionEvent[]) => {
    setConjunctionsState(conjs)
  }, [])

  const addConjunction = useCallback((conjunction: ConjunctionEvent) => {
    setConjunctionsState(prev => [...prev, conjunction])
  }, [])

  const setPrediction = useCallback((prediction: PredictionResult | null) => {
    setCurrentPrediction(prediction)
  }, [])

  const setOptimization = useCallback((result: OptimizationResult | null) => {
    setLastOptimization(result)
  }, [])

  const addAlert = useCallback((alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      acknowledged: false
    }
    setAlerts(prev => [newAlert, ...prev].slice(0, 50)) // Keep max 50 alerts
  }, [])

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, acknowledged: true } : alert
    ))
  }, [])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  const setSimulationState = useCallback((state: Partial<SimulationState>) => {
    setSimulation(prev => ({ ...prev, ...state }))
  }, [])

  const toggleSimulation = useCallback(() => {
    setSimulation(prev => ({
      ...prev,
      isRunning: !prev.isRunning,
      isPaused: false
    }))
  }, [])

  const resetSimulation = useCallback(() => {
    setSimulation(prev => ({
      ...prev,
      currentIndex: 0,
      isRunning: false,
      isPaused: false
    }))
  }, [])

  const advanceSimulation = useCallback(() => {
    setSimulation(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % Math.max(prev.totalDataPoints, 1),
      lastUpdate: new Date().toISOString()
    }))
  }, [])

  const addHistoricalPoint = useCallback((point: HistoricalDataPoint) => {
    setHistoricalDataState(prev => [...prev, point].slice(-500)) // Keep last 500 points
  }, [])

  const setHistoricalData = useCallback((data: HistoricalDataPoint[]) => {
    setHistoricalDataState(data)
  }, [])

  const setSystemStatus = useCallback((status: Partial<SystemStatus>) => {
    setSystemStatusState(prev => ({ ...prev, ...status }))
  }, [])

  const getRiskColor = useCallback((category: RiskCategory): string => {
    switch (category) {
      case 'Low': return 'var(--risk-low)'
      case 'Medium': return 'var(--risk-medium)'
      case 'High': return 'var(--risk-high)'
      default: return 'var(--muted)'
    }
  }, [])

  const getRiskGlowClass = useCallback((category: RiskCategory): string => {
    switch (category) {
      case 'Low': return 'glow-risk-low'
      case 'Medium': return 'glow-risk-medium'
      case 'High': return 'glow-risk-high'
      default: return ''
    }
  }, [])

  return (
    <DashboardContext.Provider
      value={{
        satellites,
        conjunctions,
        selectedSatelliteId,
        selectedConjunctionId,
        currentPrediction,
        lastOptimization,
        alerts,
        simulation,
        historicalData,
        systemStatus,
        setSelectedSatellite,
        setSatellites,
        setSelectedConjunction,
        setConjunctions,
        addConjunction,
        setPrediction,
        setOptimization,
        addAlert,
        acknowledgeAlert,
        clearAlerts,
        setSimulationState,
        toggleSimulation,
        resetSimulation,
        advanceSimulation,
        addHistoricalPoint,
        setHistoricalData,
        setSystemStatus,
        getRiskColor,
        getRiskGlowClass
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
