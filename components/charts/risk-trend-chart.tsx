"use client"

import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts'
import { TrendingUp } from 'lucide-react'

export function RiskTrendChart() {
  const { historicalData, selectedSatelliteId, satellites } = useDashboard()

  const chartData = useMemo(() => {
    // Filter data for selected satellite or show aggregate
    let filteredData = selectedSatelliteId
      ? historicalData.filter(d => d.satelliteId === selectedSatelliteId)
      : historicalData

    // Group by timestamp and average if needed
    const grouped = filteredData.reduce((acc, item) => {
      const date = new Date(item.timestamp)
      const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      
      if (!acc[key]) {
        acc[key] = { timestamp: key, riskScores: [], missDistances: [] }
      }
      acc[key].riskScores.push(item.riskScore)
      acc[key].missDistances.push(item.missDistance)
      return acc
    }, {} as Record<string, { timestamp: string; riskScores: number[]; missDistances: number[] }>)

    return Object.values(grouped).map(item => ({
      timestamp: item.timestamp,
      riskScore: item.riskScores.reduce((a, b) => a + b, 0) / item.riskScores.length,
      missDistance: item.missDistances.reduce((a, b) => a + b, 0) / item.missDistances.length / 1000 // Convert to km
    })).slice(-14) // Last 14 days
  }, [historicalData, selectedSatelliteId])

  const selectedSatelliteName = selectedSatelliteId 
    ? satellites.find(s => s.id === selectedSatelliteId)?.name 
    : 'All Satellites'

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Risk Trend
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {selectedSatelliteName}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="var(--border)" 
                opacity={0.5}
                vertical={false}
              />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[0, 1]}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--foreground)'
                }}
                formatter={(value: number, name: string) => [
                  name === 'riskScore' ? value.toFixed(3) : `${value.toFixed(1)} km`,
                  name === 'riskScore' ? 'Risk Score' : 'Avg Miss Distance'
                ]}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              
              {/* Threshold lines (3 levels) */}
              <ReferenceLine 
                y={0.66} 
                stroke="var(--risk-high)" 
                strokeDasharray="5 5" 
                opacity={0.5}
              />
              <ReferenceLine 
                y={0.33} 
                stroke="var(--risk-medium)" 
                strokeDasharray="5 5" 
                opacity={0.5}
              />

              <Area
                type="monotone"
                dataKey="riskScore"
                fill="url(#riskGradient)"
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="riskScore"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ fill: 'var(--primary)', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: 'var(--primary)' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-px w-4 bg-risk-high" style={{ borderStyle: 'dashed' }} />
            <span className="text-muted-foreground">High (0.66)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px w-4 bg-risk-medium" style={{ borderStyle: 'dashed' }} />
            <span className="text-muted-foreground">Medium (0.33)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
