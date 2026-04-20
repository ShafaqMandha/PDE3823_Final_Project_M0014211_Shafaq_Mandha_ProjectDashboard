"use client"

import { useEffect, useState } from 'react'
import { DashboardProvider, useDashboard } from '@/lib/dashboard-context'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { RiskOverview } from '@/components/dashboard/risk-overview'
import { RiskGauge } from '@/components/dashboard/risk-gauge'
import { SatelliteSelector } from '@/components/dashboard/satellite-selector'
import { SatelliteInfo } from '@/components/dashboard/satellite-info'
import { ConjunctionTable } from '@/components/dashboard/conjunction-table'
import { AlertsPanel } from '@/components/dashboard/alerts-panel'
import { OptimizationPanel } from '@/components/dashboard/optimization-panel'
import { RiskTrendChart } from '@/components/charts/risk-trend-chart'
import { AltitudeRiskChart } from '@/components/charts/altitude-risk-chart'
import { FeatureImportanceChart } from '@/components/charts/feature-importance-chart'
import { ProbabilityChart } from '@/components/charts/probability-chart'
import { useSimulation } from '@/hooks/use-simulation'
import type { Satellite, ConjunctionEvent, HistoricalDataPoint } from '@/lib/types'

function DashboardContent() {
  const { 
    alerts, 
    setSatellites, 
    setConjunctions, 
    setHistoricalData,
    setSimulationState,
    setSystemStatus 
  } = useDashboard()

  // Initialize simulation
  useSimulation()

  const [loadError, setLoadError] = useState<string | null>(null)

  // Load initial CSV data
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        setLoadError(null)
        setSystemStatus({ connectionStatus: 'disconnected', dataLoaded: false })

        const res = await fetch('/api/data?limit=3000')
        if (!res.ok) throw new Error(`Failed to load data: ${res.status}`)
        const json = (await res.json()) as {
          satellites: Satellite[]
          conjunctions: ConjunctionEvent[]
          historicalData: HistoricalDataPoint[]
        }

        if (cancelled) return

        setSatellites(json.satellites)
        setConjunctions(json.conjunctions)
        setHistoricalData(json.historicalData)
        setSimulationState({ 
          totalDataPoints: json.conjunctions.length,
          dataSource: 'uploaded'
        })
        setSystemStatus({
          dataLoaded: true,
          mlModelLoaded: true,
          quboSolverReady: true,
          connectionStatus: 'connected'
        })
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : String(e)
        setLoadError(msg)
        setSystemStatus({ connectionStatus: 'error', dataLoaded: false })
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [setSatellites, setConjunctions, setHistoricalData, setSimulationState, setSystemStatus])

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar alertCount={unacknowledgedAlerts} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header title="Collision Risk Overview" />

        {/* Dashboard Grid */}
        <main className="flex-1 overflow-auto p-6">
          {loadError && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Failed to load `data/train_data.csv`: {loadError}
            </div>
          )}
          <div className="grid gap-6 grid-cols-12 auto-rows-min">
            {/* Row 1: Satellite Selection and Risk Overview */}
            <div className="col-span-12 lg:col-span-4">
              <SatelliteSelector />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <RiskOverview />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <RiskGauge />
            </div>

            {/* Row 2: Satellite Info and Alerts */}
            <div className="col-span-12 lg:col-span-6">
              <SatelliteInfo />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <AlertsPanel />
            </div>

            {/* Row 3: Charts */}
            <div className="col-span-12 lg:col-span-6">
              <RiskTrendChart />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <AltitudeRiskChart />
            </div>

            {/* Row 4: More Charts */}
            <div className="col-span-12 lg:col-span-4">
              <FeatureImportanceChart />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <ProbabilityChart />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <OptimizationPanel />
            </div>

            {/* Row 5: Conjunction Events Table */}
            <div className="col-span-12">
              <ConjunctionTable />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}
