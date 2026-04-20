"use client"

import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'
import { PieChartIcon } from 'lucide-react'
import type { RiskCategory } from '@/lib/types'

export function ProbabilityChart() {
  const { conjunctions } = useDashboard()

  const chartData = useMemo(() => {
    const counts = conjunctions.reduce((acc, conj) => {
      acc[conj.riskCategory] = (acc[conj.riskCategory] || 0) + 1
      return acc
    }, {} as Record<RiskCategory, number>)

    return [
      { name: 'Low', value: counts['Low'] || 0, color: 'var(--risk-low)' },
      { name: 'Medium', value: counts['Medium'] || 0, color: 'var(--risk-medium)' },
      { name: 'High', value: counts['High'] || 0, color: 'var(--risk-high)' },
    ].filter(d => d.value > 0)
  }, [conjunctions])

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number
    cy: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    percent: number
  }) => {
    if (percent < 0.05) return null // Don't show labels for small slices
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="var(--foreground)" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Risk Distribution
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {total} total events
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke="var(--background)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--foreground)'
                }}
                formatter={(value: number, name: string) => [
                  `${value} event${value !== 1 ? 's' : ''} (${((value / total) * 100).toFixed(1)}%)`,
                  `${name} Risk`
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Custom Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {chartData.map((entry) => (
            <div 
              key={entry.name}
              className="flex items-center gap-2 text-xs"
            >
              <div 
                className="h-3 w-3 rounded-sm shrink-0" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-mono font-medium text-foreground">{entry.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
