"use client"

import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react'

export function RiskOverview() {
  const { currentPrediction, selectedSatelliteId, satellites, conjunctions } = useDashboard()

  // Get the selected satellite and its most critical conjunction
  const selectedSatellite = satellites.find(s => s.id === selectedSatelliteId)
  const relevantConjunctions = conjunctions.filter(c => c.primarySatelliteId === selectedSatelliteId)
  const mostCritical = relevantConjunctions.sort((a, b) => b.riskScore - a.riskScore)[0]

  // Use prediction if available, otherwise use conjunction data
  const riskScore = currentPrediction?.riskScore ?? mostCritical?.riskScore ?? 0
  const riskCategory = currentPrediction?.riskCategory ?? mostCritical?.riskCategory ?? 'Low'
  const confidence = currentPrediction?.confidence ?? 0.95
  const probability = currentPrediction?.collisionProbability ?? mostCritical?.collisionProbability ?? 0

  const getRiskColorClass = () => {
    switch (riskCategory) {
      case 'Low': return 'text-risk-low'
      case 'Medium': return 'text-risk-medium'
      case 'High': return 'text-risk-high'
      default: return 'text-muted-foreground'
    }
  }

  const getRiskBgClass = () => {
    switch (riskCategory) {
      case 'Low': return 'bg-risk-low/10 border-risk-low/30'
      case 'Medium': return 'bg-risk-medium/10 border-risk-medium/30'
      case 'High': return 'bg-risk-high/10 border-risk-high/30 animate-pulse-slow'
      default: return 'bg-muted/10 border-muted/30'
    }
  }

  const getRiskIcon = () => {
    switch (riskCategory) {
      case 'Low': return <ShieldCheck className="h-5 w-5 text-risk-low" />
      case 'Medium': return <AlertTriangle className="h-5 w-5 text-risk-medium" />
      case 'High': return <ShieldAlert className="h-5 w-5 text-risk-high" />
      default: return <Minus className="h-5 w-5 text-muted-foreground" />
    }
  }

  // Format probability in scientific notation
  const formatProbability = (prob: number) => {
    if (prob === 0) return '0'
    const exp = Math.floor(Math.log10(prob))
    const mantissa = prob / Math.pow(10, exp)
    return `${mantissa.toFixed(2)}e${exp}`
  }

  if (!selectedSatelliteId) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <ShieldCheck className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Select a satellite to view risk assessment</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("h-full transition-all duration-500", getRiskBgClass())}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Risk Assessment
          </CardTitle>
          <Badge variant="outline" className={cn("gap-1", getRiskColorClass())}>
            {getRiskIcon()}
            {riskCategory}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Risk Score */}
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "font-mono text-5xl font-bold tracking-tight transition-colors duration-300",
              getRiskColorClass()
            )}>
              {riskScore.toFixed(3)}
            </span>
            <span className="text-sm text-muted-foreground">/ 1.000</span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {/* Collision Probability */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Collision Probability</p>
              <p className="font-mono text-lg font-semibold text-foreground">
                {formatProbability(probability)}
              </p>
            </div>

            {/* Model Confidence */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Model Confidence</p>
              <p className="font-mono text-lg font-semibold text-foreground">
                {(confidence * 100).toFixed(1)}%
              </p>
            </div>

            {/* Active Conjunctions */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Active Conjunctions</p>
              <p className="font-mono text-lg font-semibold text-foreground">
                {relevantConjunctions.length}
              </p>
            </div>

            {/* Model Version */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Model Version</p>
              <p className="font-mono text-sm text-foreground">
                {currentPrediction?.modelVersion ?? 'v2.1.0'}
              </p>
            </div>
          </div>

          {/* Risk Trend Indicator */}
          {mostCritical && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Next TCA:</span>
              <span className="font-mono text-xs text-foreground">
                {new Date(mostCritical.tca).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
