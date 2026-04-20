"use client"

import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ZAxis
} from 'recharts'
import { Activity } from 'lucide-react'
import type { RiskCategory } from '@/lib/types'

export function AltitudeRiskChart() {
  const { conjunctions, satellites } = useDashboard()

  const chartData = useMemo(() => {
    return conjunctions.map(conj => {
      const satellite = satellites.find(s => s.id === conj.primarySatelliteId)
      return {
        altitude: satellite?.altitude ?? 0,
        riskScore: conj.riskScore,
        missDistance: conj.missDistance,
        riskCategory: conj.riskCategory,
        name: satellite?.name ?? 'Unknown',
        secondaryObject: conj.secondaryObjectName
      }
    }).filter(d => d.altitude > 0)
  }, [conjunctions, satellites])

  const getRiskColor = (category: RiskCategory) => {
    switch (category) {
      case 'Low': return 'var(--risk-low)'
      case 'Medium': return 'var(--risk-medium)'
      case 'High': return 'var(--risk-high)'
      default: return 'var(--muted)'
    }
  }

  // Group by orbit type for better visualization
  const orbitRanges = [
    { name: 'LEO', min: 160, max: 2000 },
    { name: 'MEO', min: 2000, max: 35786 },
    { name: 'GEO', min: 35786, max: 40000 },
  ]

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Altitude vs Risk Distribution
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {chartData.length} events
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="var(--border)" 
                opacity={0.5}
              />
              <XAxis 
                dataKey="altitude" 
                type="number"
                domain={[0, 'dataMax']}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                label={{ 
                  value: 'Altitude (km)', 
                  position: 'bottom', 
                  offset: -5,
                  style: { fill: 'var(--muted-foreground)', fontSize: 10 }
                }}
              />
              <YAxis 
                dataKey="riskScore"
                type="number"
                domain={[0, 1]}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toFixed(1)}
                label={{ 
                  value: 'Risk Score', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'var(--muted-foreground)', fontSize: 10 }
                }}
              />
              <ZAxis 
                dataKey="missDistance" 
                type="number" 
                range={[50, 400]} 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--foreground)'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'altitude') return [`${value.toFixed(0)} km`, 'Altitude']
                  if (name === 'riskScore') return [value.toFixed(3), 'Risk Score']
                  return [value, name]
                }}
                labelFormatter={(_, payload) => {
                  if (payload && payload.length > 0) {
                    const data = payload[0].payload
                    return `${data.name} vs ${data.secondaryObject}`
                  }
                  return ''
                }}
              />
              <Scatter name="Conjunctions" data={chartData}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getRiskColor(entry.riskCategory)}
                    opacity={0.8}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          {(['Low', 'Medium', 'High'] as RiskCategory[]).map(category => (
            <div key={category} className="flex items-center gap-1.5">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: getRiskColor(category) }}
              />
              <span className="text-muted-foreground">{category}</span>
            </div>
          ))}
        </div>
        
        {/* Orbit bands info */}
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>LEO: 160-2000km</span>
          <span>MEO: 2000-35786km</span>
          <span>GEO: ~35786km</span>
        </div>
      </CardContent>
    </Card>
  )
}
