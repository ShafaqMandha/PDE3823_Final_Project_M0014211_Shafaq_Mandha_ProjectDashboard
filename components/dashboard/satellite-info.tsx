"use client"

import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Satellite, Globe, Gauge, Compass, Clock, Orbit } from 'lucide-react'

export function SatelliteInfo() {
  const { satellites, selectedSatelliteId, simulation } = useDashboard()

  const selectedSatellite = satellites.find(s => s.id === selectedSatelliteId)

  if (!selectedSatelliteId) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Satellite className="h-4 w-4" />
            Satellite Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Satellite className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a satellite to view detailed information
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!selectedSatellite) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Satellite className="h-4 w-4" />
            Satellite Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const infoItems = [
    {
      icon: Globe,
      label: 'NORAD ID',
      value: selectedSatellite.noradId,
      mono: true
    },
    {
      icon: Orbit,
      label: 'Orbit Type',
      value: selectedSatellite.orbitType,
      badge: true
    },
    {
      icon: Gauge,
      label: 'Altitude',
      value: `${selectedSatellite.altitude.toFixed(1)} km`,
      mono: true
    },
    {
      icon: Gauge,
      label: 'Velocity',
      value: `${selectedSatellite.velocity.toFixed(2)} km/s`,
      mono: true
    },
    {
      icon: Compass,
      label: 'Inclination',
      value: `${selectedSatellite.inclination.toFixed(2)}°`,
      mono: true
    },
    {
      icon: Orbit,
      label: 'Eccentricity',
      value: selectedSatellite.eccentricity.toFixed(5),
      mono: true
    },
  ]

  const orbitalElements = [
    { label: 'RAAN', value: `${selectedSatellite.raan.toFixed(2)}°` },
    { label: 'Arg. Perigee', value: `${selectedSatellite.argOfPerigee.toFixed(2)}°` },
    { label: 'Mean Anomaly', value: `${selectedSatellite.meanAnomaly.toFixed(2)}°` },
  ]

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Satellite className="h-4 w-4" />
            Satellite Information
          </CardTitle>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Updated: {new Date(simulation.lastUpdate).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Satellite Name */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Satellite className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-balance">{selectedSatellite.name}</h3>
            <p className="text-xs text-muted-foreground">
              Epoch: {new Date(selectedSatellite.epoch).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          {infoItems.map((item, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3"
            >
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                {item.badge ? (
                  <Badge variant="outline" className="mt-0.5">
                    {item.value}
                  </Badge>
                ) : (
                  <p className={`text-sm font-medium text-foreground ${item.mono ? 'font-mono' : ''}`}>
                    {item.value}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Orbital Elements */}
        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-2">Orbital Elements</p>
          <div className="flex gap-4">
            {orbitalElements.map((elem, index) => (
              <div key={index} className="flex-1 text-center">
                <p className="text-xs text-muted-foreground">{elem.label}</p>
                <p className="font-mono text-sm font-medium text-foreground">{elem.value}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
