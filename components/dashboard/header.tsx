"use client"

import { useState, useEffect } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RefreshCw, 
  Settings, 
  Download,
  Circle,
  Wifi,
  WifiOff,
  Database,
  Cpu
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
}

export function Header({ title = "Dashboard" }: HeaderProps) {
  const [mounted, setMounted] = useState(false)
  const { 
    simulation, 
    systemStatus, 
    toggleSimulation, 
    resetSimulation,
    setSimulationState
  } = useDashboard()

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatLastUpdate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    })
  }

  const getConnectionStatusColor = () => {
    switch (systemStatus.connectionStatus) {
      case 'connected': return 'text-risk-low'
      case 'disconnected': return 'text-muted-foreground'
      case 'error': return 'text-destructive'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-6">
      {/* Left: Title and Status */}
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        
        {/* System Status Indicators */}
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-1.5">
            {systemStatus.connectionStatus === 'connected' ? (
              <Wifi className={cn("h-4 w-4", getConnectionStatusColor())} />
            ) : (
              <WifiOff className={cn("h-4 w-4", getConnectionStatusColor())} />
            )}
            <span className="text-xs text-muted-foreground capitalize">
              {systemStatus.connectionStatus}
            </span>
          </div>

          {/* Data Status */}
          <div className="flex items-center gap-1.5">
            <Database className={cn(
              "h-4 w-4",
              systemStatus.dataLoaded ? "text-risk-low" : "text-muted-foreground"
            )} />
            <span className="text-xs text-muted-foreground">
              {systemStatus.dataLoaded ? 'Data Loaded' : 'No Data'}
            </span>
          </div>

          {/* ML Model Status */}
          <div className="flex items-center gap-1.5">
            <Cpu className={cn(
              "h-4 w-4",
              systemStatus.mlModelLoaded ? "text-risk-low" : "text-muted-foreground"
            )} />
            <span className="text-xs text-muted-foreground">
              {systemStatus.mlModelLoaded ? 'ML Ready' : 'ML Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-4">
        {/* Simulation Status */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-2">
          <div className="flex items-center gap-2">
            <Circle 
              className={cn(
                "h-2 w-2 fill-current",
                simulation.isRunning && !simulation.isPaused 
                  ? "text-risk-low animate-pulse" 
                  : "text-muted-foreground"
              )} 
            />
            <span className="text-sm font-medium text-foreground">
              {simulation.isRunning && !simulation.isPaused ? 'Live' : 'Paused'}
            </span>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="font-mono">{simulation.currentIndex + 1}</span>
            <span>/</span>
            <span className="font-mono">{simulation.totalDataPoints || '—'}</span>
          </div>
          
          <div className="h-4 w-px bg-border" />
          
          <span className="font-mono text-xs text-muted-foreground">
            {mounted ? formatLastUpdate(simulation.lastUpdate) : '--:--:--'}
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSimulation}
            className="h-9 w-9"
          >
            {simulation.isRunning && !simulation.isPaused ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={resetSimulation}
            className="h-9 w-9"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSimulationState({ lastUpdate: new Date().toISOString() })}
            className="h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <span className="text-xs text-muted-foreground">Speed:</span>
              <span className="font-mono text-sm">{simulation.updateInterval / 1000}s</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSimulationState({ updateInterval: 2000 })}>
              2 seconds (Fast)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSimulationState({ updateInterval: 5000 })}>
              5 seconds (Normal)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSimulationState({ updateInterval: 10000 })}>
              10 seconds (Slow)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSimulationState({ updateInterval: 1000 })}>
              1 second (Demo)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Export as CSV</DropdownMenuItem>
            <DropdownMenuItem>Export as JSON</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Generate Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
