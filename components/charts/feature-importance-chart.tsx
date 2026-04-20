"use client"

import { useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Layers } from 'lucide-react'

export function FeatureImportanceChart() {
  const { currentPrediction } = useDashboard()

  const chartData = useMemo(() => {
    if (!currentPrediction?.featureImportance) {
      // Default mock data when no prediction
      return [
        { name: 'Miss Distance', importance: 0.25, shortName: 'Miss Dist' },
        { name: 'Relative Velocity', importance: 0.18, shortName: 'Rel Vel' },
        { name: 'Time to TCA', importance: 0.12, shortName: 'Time TCA' },
        { name: 'Radial Distance', importance: 0.10, shortName: 'Radial' },
        { name: 'Combined Size', importance: 0.08, shortName: 'Size' },
        { name: 'Inclination Delta', importance: 0.06, shortName: 'Inc Delta' },
        { name: 'Eccentricity', importance: 0.04, shortName: 'Ecc' },
        { name: 'Altitude', importance: 0.03, shortName: 'Alt' },
      ]
    }

    return Object.entries(currentPrediction.featureImportance)
      .map(([name, importance]) => ({
        name,
        importance,
        shortName: name.split(' ').map(w => w.slice(0, 4)).join(' ')
      }))
      .sort((a, b) => b.importance - a.importance)
  }, [currentPrediction])

  // Color scale based on importance
  const getBarColor = (importance: number) => {
    if (importance >= 0.2) return 'var(--primary)'
    if (importance >= 0.1) return 'var(--accent)'
    return 'var(--muted-foreground)'
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Feature Importance
          </CardTitle>
          {currentPrediction && (
            <span className="text-xs text-muted-foreground">
              {currentPrediction.modelVersion}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <XAxis 
                type="number"
                domain={[0, 0.3]}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <YAxis 
                dataKey="shortName"
                type="category"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--foreground)'
                }}
                formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Importance']}
                labelFormatter={(_, payload) => {
                  if (payload && payload.length > 0) {
                    return payload[0].payload.name
                  }
                  return ''
                }}
              />
              <Bar 
                dataKey="importance" 
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.importance)}
                    opacity={0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Info text */}
        <p className="text-xs text-muted-foreground text-center mt-3">
          Feature contribution to risk prediction
        </p>
      </CardContent>
    </Card>
  )
}
