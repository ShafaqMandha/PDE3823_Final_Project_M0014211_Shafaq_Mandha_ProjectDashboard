"use client"

import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function RiskGauge() {
  const { currentPrediction, selectedSatelliteId, conjunctions } = useDashboard()

  // Get the risk score
  const relevantConjunction = conjunctions.find(c => c.primarySatelliteId === selectedSatelliteId)
  const riskScore = currentPrediction?.riskScore ?? relevantConjunction?.riskScore ?? 0
  const riskCategory = currentPrediction?.riskCategory ?? relevantConjunction?.riskCategory ?? 'Low'

  // SVG dimensions
  const size = 200
  const strokeWidth = 20
  const radius = (size - strokeWidth) / 2
  const center = size / 2

  // Arc calculations (180 degrees, from left to right)
  const startAngle = -180
  const endAngle = 0
  const angleRange = endAngle - startAngle

  // Calculate the current angle based on risk score
  const currentAngle = startAngle + (riskScore * angleRange)

  // Convert angle to radians
  const toRadians = (angle: number) => (angle * Math.PI) / 180

  // Calculate arc path
  const createArcPath = (start: number, end: number) => {
    const startRad = toRadians(start)
    const endRad = toRadians(end)
    
    const x1 = center + radius * Math.cos(startRad)
    const y1 = center + radius * Math.sin(startRad)
    const x2 = center + radius * Math.cos(endRad)
    const y2 = center + radius * Math.sin(endRad)
    
    const largeArc = Math.abs(end - start) > 180 ? 1 : 0
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  // Calculate needle position
  const needleAngle = toRadians(currentAngle)
  const needleLength = radius - 10
  const needleX = center + needleLength * Math.cos(needleAngle)
  const needleY = center + needleLength * Math.sin(needleAngle)

  // Threshold markers (3 levels: Low, Medium, High)
  const thresholds = [
    { value: 0, label: '0', color: 'var(--risk-low)' },
    { value: 0.33, label: '0.33', color: 'var(--risk-medium)' },
    { value: 0.66, label: '0.66', color: 'var(--risk-high)' },
    { value: 1, label: '1.0', color: 'var(--risk-high)' },
  ]

  const getGaugeColor = () => {
    switch (riskCategory) {
      case 'Low': return 'var(--risk-low)'
      case 'Medium': return 'var(--risk-medium)'
      case 'High': return 'var(--risk-high)'
      default: return 'var(--muted)'
    }
  }

  // Generate gradient stops for the colored arc (3 levels)
  const gradientStops = useMemo(() => [
    { offset: '0%', color: 'var(--risk-low)' },
    { offset: '30%', color: 'var(--risk-low)' },
    { offset: '40%', color: 'var(--risk-medium)' },
    { offset: '60%', color: 'var(--risk-medium)' },
    { offset: '70%', color: 'var(--risk-high)' },
    { offset: '100%', color: 'var(--risk-high)' },
  ], [])

  if (!selectedSatelliteId) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Risk Gauge
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-4">
          <svg width={size} height={size / 2 + 30} className="opacity-30">
            <path
              d={createArcPath(startAngle, endAngle)}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="text-muted"
            />
          </svg>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Risk Gauge
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <svg width={size} height={size / 2 + 40} className="overflow-visible">
          <defs>
            {/* Gradient for the background arc */}
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {gradientStops.map((stop, i) => (
                <stop key={i} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
            
            {/* Glow filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <path
            d={createArcPath(startAngle, endAngle)}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.3}
          />

          {/* Colored arc (full gradient) */}
          <path
            d={createArcPath(startAngle, endAngle)}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.2}
          />

          {/* Active arc up to current value */}
          <path
            d={createArcPath(startAngle, currentAngle)}
            fill="none"
            stroke={getGaugeColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter="url(#glow)"
            className="transition-all duration-500"
          />

          {/* Threshold tick marks */}
          {thresholds.map((threshold, i) => {
            const angle = toRadians(startAngle + (threshold.value * angleRange))
            const innerRadius = radius - strokeWidth / 2 - 8
            const outerRadius = radius + strokeWidth / 2 + 8
            const labelRadius = radius + strokeWidth / 2 + 20
            
            const x1 = center + innerRadius * Math.cos(angle)
            const y1 = center + innerRadius * Math.sin(angle)
            const x2 = center + outerRadius * Math.cos(angle)
            const y2 = center + outerRadius * Math.sin(angle)
            const labelX = center + labelRadius * Math.cos(angle)
            const labelY = center + labelRadius * Math.sin(angle)

            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--border)"
                  strokeWidth={2}
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-xs font-mono"
                >
                  {threshold.label}
                </text>
              </g>
            )
          })}

          {/* Needle */}
          <g className="transition-transform duration-500">
            {/* Needle shadow */}
            <line
              x1={center}
              y1={center}
              x2={needleX}
              y2={needleY}
              stroke={getGaugeColor()}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.3}
              filter="url(#glow)"
            />
            {/* Needle */}
            <line
              x1={center}
              y1={center}
              x2={needleX}
              y2={needleY}
              stroke={getGaugeColor()}
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Center dot */}
            <circle
              cx={center}
              cy={center}
              r={8}
              fill={getGaugeColor()}
              filter="url(#glow)"
            />
            <circle
              cx={center}
              cy={center}
              r={4}
              fill="var(--background)"
            />
          </g>

          {/* Value display */}
          <text
            x={center}
            y={center + 30}
            textAnchor="middle"
            className="fill-foreground font-mono text-2xl font-bold"
          >
            {riskScore.toFixed(3)}
          </text>
          <text
            x={center}
            y={center + 50}
            textAnchor="middle"
            className="fill-muted-foreground text-xs"
          >
            {riskCategory} Risk
          </text>
        </svg>
      </CardContent>
    </Card>
  )
}
