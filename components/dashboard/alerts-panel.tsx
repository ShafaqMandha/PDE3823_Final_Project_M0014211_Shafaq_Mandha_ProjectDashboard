"use client"

import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Info,
  X,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert } from '@/lib/types'

export function AlertsPanel() {
  const { alerts, acknowledgeAlert, clearAlerts } = useDashboard()

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-risk-high" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-risk-medium" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-risk-low" />
      case 'info':
        return <Info className="h-4 w-4 text-primary" />
    }
  }

  const getAlertBgClass = (type: Alert['type'], acknowledged: boolean) => {
    if (acknowledged) return 'bg-secondary/30 opacity-60'
    
    switch (type) {
      case 'critical':
        return 'bg-risk-high/10 border-risk-high/30'
      case 'warning':
        return 'bg-risk-medium/10 border-risk-medium/30'
      case 'success':
        return 'bg-risk-low/10 border-risk-low/30'
      case 'info':
        return 'bg-primary/10 border-primary/30'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {unacknowledgedCount}
              </Badge>
            )}
          </CardTitle>
          {alerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAlerts}
              className="h-8 gap-1 text-xs text-muted-foreground"
            >
              <Trash2 className="h-3 w-3" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-0">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No alerts</p>
            <p className="text-xs text-muted-foreground/70">
              Alerts will appear here when risk levels change
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "relative rounded-lg border p-3 transition-all",
                    getAlertBgClass(alert.type, alert.acknowledged)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn(
                          "text-sm font-medium",
                          alert.acknowledged ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {alert.title}
                        </h4>
                        {!alert.acknowledged && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0 -mt-0.5 -mr-1"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs mt-0.5 line-clamp-2",
                        alert.acknowledged ? "text-muted-foreground/70" : "text-muted-foreground"
                      )}>
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground/70">
                          {formatTime(alert.timestamp)}
                        </span>
                        {alert.conjunctionId && (
                          <Badge variant="outline" className="text-xs h-5">
                            {alert.conjunctionId.slice(-6)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Unacknowledged indicator */}
                  {!alert.acknowledged && alert.type === 'critical' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-risk-high" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
