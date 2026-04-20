"use client"

import { useEffect, useRef, useCallback } from 'react'
import { useDashboard } from '@/lib/dashboard-context'

export function useSimulation() {
  const {
    simulation,
    conjunctions,
    selectedSatelliteId,
    advanceSimulation,
    setPrediction,
    addHistoricalPoint,
  } = useDashboard()

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Simulation tick
  const tick = useCallback(() => {
    // Advance the simulation index (acts as a "refresh" heartbeat)
    advanceSimulation()

    // Update prediction for selected satellite
    if (selectedSatelliteId) {
      const relevantConjunction = conjunctions.find(
        c => c.primarySatelliteId === selectedSatelliteId
      )
      if (relevantConjunction?.features) {
        fetch('/api/predict', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ features: relevantConjunction.features }),
        })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Prediction failed: ${r.status}`))))
          .then((prediction) => setPrediction(prediction))
          .catch(() => null)
        
        // Add to historical data
        addHistoricalPoint({
          timestamp: new Date().toISOString(),
          satelliteId: selectedSatelliteId,
          riskScore: relevantConjunction.riskScore,
          collisionProbability: relevantConjunction.collisionProbability,
          missDistance: relevantConjunction.missDistance,
          altitude: 0 // Would come from satellite data
        })
      }
    }
  }, [
    conjunctions, 
    selectedSatelliteId, 
    advanceSimulation, 
    setPrediction, 
    addHistoricalPoint,
  ])

  // Handle simulation start/stop
  useEffect(() => {
    if (simulation.isRunning && !simulation.isPaused) {
      // Start the interval
      intervalRef.current = setInterval(tick, simulation.updateInterval)
    } else {
      // Clear the interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [simulation.isRunning, simulation.isPaused, simulation.updateInterval, tick])

  return {
    isRunning: simulation.isRunning,
    isPaused: simulation.isPaused,
    currentIndex: simulation.currentIndex,
    totalDataPoints: simulation.totalDataPoints
  }
}
