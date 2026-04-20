"use client"

import { useState } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Zap, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle,
  TrendingDown,
  Fuel,
  Clock,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateMockOptimization } from '@/lib/mock-data'
import type { OptimizationResult } from '@/lib/types'

export function OptimizationPanel() {
  const { 
    selectedConjunctionId, 
    conjunctions, 
    lastOptimization, 
    setOptimization 
  } = useDashboard()

  const [isOptimizing, setIsOptimizing] = useState(false)
  const [progress, setProgress] = useState(0)

  const selectedConjunction = conjunctions.find(c => c.id === selectedConjunctionId)

  const handleOptimize = async () => {
    if (!selectedConjunction) return

    setIsOptimizing(true)
    setProgress(0)

    // Keep UX responsive: show progress while awaiting backend compute.
    const startedAt = performance.now()
    const interval = window.setInterval(() => {
      setProgress(p => (p >= 95 ? 95 : p + 5))
    }, 120)

    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          conjunctionId: selectedConjunction.id,
          // Use riskScore as Pc0 proxy for now (0..1). If you have true Pc, send Pc0 instead.
          riskScore: selectedConjunction.riskScore,
          missDistance: selectedConjunction.missDistance,
          maxDeltaV: 0.3,
          axes: ['r', 't', 'n'],
          dvLevels: [0.0, 0.01, 0.03, 0.06],
          pcReductionScale: 5.0,
          wPc: 1000.0,
          wDv: 50.0,
          solver: 'SA',
          saReads: 400,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.details || err?.error || `HTTP ${res.status}`)
      }

      const result = (await res.json()) as OptimizationResult
      setOptimization(result)
    } catch (e) {
      // Fallback to mock so the UI still works if Python deps aren't installed yet.
      const fallback = generateMockOptimization(selectedConjunction.id, selectedConjunction.riskScore)
      setOptimization({
        ...fallback,
        success: false,
        message: `QUBO backend unavailable (${e instanceof Error ? e.message : String(e)}). Showing mock result.`,
      })
    } finally {
      window.clearInterval(interval)
      setProgress(100)
      // Let the bar reach 100 briefly for perceived completion.
      const elapsed = performance.now() - startedAt
      const delay = Math.max(0, 250 - elapsed)
      window.setTimeout(() => {
        setIsOptimizing(false)
        setProgress(0)
      }, delay)
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 0.66) return 'text-risk-high'
    if (score >= 0.33) return 'text-risk-medium'
    return 'text-risk-low'
  }

  if (!selectedConjunctionId || !selectedConjunction) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4" />
            QUBO Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a conjunction event to optimize
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Click on an event in the table below
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Zap className="h-4 w-4" />
            QUBO Optimization
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">
            {selectedConjunctionId.slice(-8)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Risk */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
          <div>
            <p className="text-xs text-muted-foreground">Current Risk Score</p>
            <p className={cn(
              "font-mono text-2xl font-bold",
              getRiskColor(selectedConjunction.riskScore)
            )}>
              {selectedConjunction.riskScore.toFixed(3)}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              selectedConjunction.riskCategory === 'High' && "border-risk-high text-risk-high",
              selectedConjunction.riskCategory === 'Medium' && "border-risk-medium text-risk-medium"
            )}
          >
            {selectedConjunction.riskCategory}
          </Badge>
        </div>

        {/* Optimize Button */}
        <Button 
          className="w-full gap-2"
          onClick={handleOptimize}
          disabled={isOptimizing}
        >
          {isOptimizing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Running QUBO Solver...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Run Maneuver Optimization
            </>
          )}
        </Button>

        {/* Progress Bar */}
        {isOptimizing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Solving QUBO problem... {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Optimization Results */}
        {lastOptimization && lastOptimization.conjunctionId === selectedConjunctionId && (
          <div className="space-y-3">
            <Separator />
            
            <div className="flex items-center gap-2 text-risk-low">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Optimization Complete</span>
            </div>

            {lastOptimization.bestManeuver && (
              <>
                {/* Best Maneuver */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">
                      Recommended Maneuver
                    </span>
                    <Badge className="bg-primary text-primary-foreground">
                      {lastOptimization.bestManeuver.type}
                    </Badge>
                  </div>

                  {/* Risk Comparison */}
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Before</p>
                      <p className={cn(
                        "font-mono text-lg font-bold",
                        getRiskColor(lastOptimization.originalRiskScore)
                      )}>
                        {lastOptimization.originalRiskScore.toFixed(3)}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">After</p>
                      <p className={cn(
                        "font-mono text-lg font-bold",
                        getRiskColor(lastOptimization.bestManeuver.newRiskScore)
                      )}>
                        {lastOptimization.bestManeuver.newRiskScore.toFixed(3)}
                      </p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 rounded bg-secondary/50 p-2">
                      <TrendingDown className="h-3 w-3 text-risk-low" />
                      <div>
                        <p className="text-muted-foreground">Risk Reduction</p>
                        <p className="font-mono font-medium text-risk-low">
                          -{lastOptimization.bestManeuver.riskReduction.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded bg-secondary/50 p-2">
                      <Zap className="h-3 w-3 text-primary" />
                      <div>
                        <p className="text-muted-foreground">Delta-V</p>
                        <p className="font-mono font-medium">
                          {lastOptimization.bestManeuver.deltaV.toFixed(2)} m/s
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded bg-secondary/50 p-2">
                      <Fuel className="h-3 w-3 text-risk-medium" />
                      <div>
                        <p className="text-muted-foreground">Fuel Cost</p>
                        <p className="font-mono font-medium">
                          {lastOptimization.bestManeuver.fuelCost.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded bg-secondary/50 p-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Burn Time</p>
                        <p className="font-mono font-medium">
                          {lastOptimization.bestManeuver.burnDuration.toFixed(0)}s
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Solver Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>QUBO Energy: {lastOptimization.quboEnergy.toFixed(2)}</span>
                  <span>{lastOptimization.solverIterations} iterations</span>
                  <span>{lastOptimization.computeTime.toFixed(0)}ms</span>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
