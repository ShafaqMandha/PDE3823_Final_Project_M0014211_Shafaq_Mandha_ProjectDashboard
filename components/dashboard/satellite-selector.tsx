"use client"

import { useState } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Check, ChevronsUpDown, Satellite, Cpu, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SatelliteSelector() {
  const [open, setOpen] = useState(false)
  const [isRunningPrediction, setIsRunningPrediction] = useState(false)
  
  const { 
    satellites, 
    selectedSatelliteId, 
    setSelectedSatellite,
    conjunctions,
    setPrediction
  } = useDashboard()

  const selectedSatellite = satellites.find(s => s.id === selectedSatelliteId)

  // Get conjunction count for each satellite
  const getConjunctionCount = (satelliteId: string) => {
    return conjunctions.filter(c => c.primarySatelliteId === satelliteId).length
  }

  // Get highest risk for a satellite
  const getHighestRisk = (satelliteId: string) => {
    const satConjunctions = conjunctions.filter(c => c.primarySatelliteId === satelliteId)
    if (satConjunctions.length === 0) return null
    return satConjunctions.reduce((max, c) => c.riskScore > max.riskScore ? c : max)
  }

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'Low': return 'outline'
      case 'Medium': return 'secondary'
      case 'High': return 'default'
      case 'Critical': return 'destructive'
      default: return 'outline'
    }
  }

  const handleRunPrediction = async () => {
    if (!selectedSatelliteId) return
    
    setIsRunningPrediction(true)
    
    try {
      const relevantConjunction = conjunctions.find(
        c => c.primarySatelliteId === selectedSatelliteId
      )
      if (!relevantConjunction?.features) return

      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ features: relevantConjunction.features }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        const details =
          payload && typeof payload === 'object' && 'details' in payload
            ? String((payload as any).details)
            : null
        throw new Error(details ? `Prediction failed: ${details}` : `Prediction failed: ${res.status}`)
      }
      const prediction = payload
      setPrediction(prediction)
    } finally {
      setIsRunningPrediction(false)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Satellite Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Satellite Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-12"
            >
              <div className="flex items-center gap-3">
                <Satellite className="h-4 w-4 text-muted-foreground" />
                {selectedSatellite ? (
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{selectedSatellite.name}</span>
                    <span className="text-xs text-muted-foreground">
                      NORAD: {selectedSatellite.noradId}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select a satellite...</span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[350px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search satellites..." />
              <CommandList>
                <CommandEmpty>No satellite found.</CommandEmpty>
                <CommandGroup>
                  {satellites.map((satellite) => {
                    const highestRisk = getHighestRisk(satellite.id)
                    const conjCount = getConjunctionCount(satellite.id)
                    
                    return (
                      <CommandItem
                        key={satellite.id}
                        value={`${satellite.name} ${satellite.noradId}`}
                        onSelect={() => {
                          setSelectedSatellite(satellite.id)
                          setOpen(false)
                        }}
                        className="py-3"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedSatelliteId === satellite.id 
                              ? "opacity-100" 
                              : "opacity-0"
                          )}
                        />
                        <div className="flex flex-1 items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-medium">{satellite.name}</span>
                            <span className="text-xs text-muted-foreground">
                              NORAD: {satellite.noradId} | {satellite.orbitType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {conjCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {conjCount} event{conjCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {highestRisk && (
                              <Badge 
                                variant={getRiskBadgeVariant(highestRisk.riskCategory)}
                                className="text-xs"
                              >
                                {highestRisk.riskCategory}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Quick Stats */}
        {selectedSatellite && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-secondary/50 p-2">
              <p className="text-xs text-muted-foreground">Orbit</p>
              <p className="font-mono text-sm font-medium">{selectedSatellite.orbitType}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2">
              <p className="text-xs text-muted-foreground">Altitude</p>
              <p className="font-mono text-sm font-medium">{Math.round(selectedSatellite.altitude)} km</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-2">
              <p className="text-xs text-muted-foreground">Events</p>
              <p className="font-mono text-sm font-medium">{getConjunctionCount(selectedSatellite.id)}</p>
            </div>
          </div>
        )}

        {/* Run Prediction Button */}
        <Button 
          className="w-full gap-2"
          onClick={handleRunPrediction}
          disabled={!selectedSatelliteId || isRunningPrediction}
        >
          {isRunningPrediction ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Running ML Model...
            </>
          ) : (
            <>
              <Cpu className="h-4 w-4" />
              Run Risk Prediction
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
