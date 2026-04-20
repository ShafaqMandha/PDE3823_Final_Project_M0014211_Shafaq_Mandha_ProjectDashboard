"use client"

import { useState, useMemo } from 'react'
import { useDashboard } from '@/lib/dashboard-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Activity,
  Download,
  FileSpreadsheet,
  ArrowRight,
  Shield,
  AlertTriangle as AlertTriangleIcon,
  Wrench,
  Archive,
  LineChart,
  Orbit,
  Cpu,
  Target,
  Rocket
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ConjunctionEvent, RiskCategory } from '@/lib/types'

type SortField = 'tca' | 'missDistance' | 'relativeVelocity' | 'riskScore'
type SortDirection = 'asc' | 'desc'

const ITEMS_PER_PAGE = 10

export function ConjunctionTable() {
  const { conjunctions, satellites, setSelectedConjunction, selectedConjunctionId } = useDashboard()
  
  const [sortField, setSortField] = useState<SortField>('tca')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilters, setRiskFilters] = useState<RiskCategory[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [workflowOpen, setWorkflowOpen] = useState(false)

  // Get satellite name by ID
  const getSatelliteName = (id: string) => {
    return satellites.find(s => s.id === id)?.name ?? 'Unknown'
  }

  // Filter and sort data
  const processedData = useMemo(() => {
    let data = [...conjunctions]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      data = data.filter(c => 
        c.id.toLowerCase().includes(query) ||
        getSatelliteName(c.primarySatelliteId).toLowerCase().includes(query) ||
        c.secondaryObjectName.toLowerCase().includes(query)
      )
    }

    // Apply risk filter
    if (riskFilters.length > 0) {
      data = data.filter(c => riskFilters.includes(c.riskCategory))
    }

    // Sort
    data.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'tca':
          comparison = new Date(a.tca).getTime() - new Date(b.tca).getTime()
          break
        case 'missDistance':
          comparison = a.missDistance - b.missDistance
          break
        case 'relativeVelocity':
          comparison = a.relativeVelocity - b.relativeVelocity
          break
        case 'riskScore':
          comparison = a.riskScore - b.riskScore
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return data
  }, [conjunctions, searchQuery, riskFilters, sortField, sortDirection, satellites])

  // Pagination
  const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE)
  const paginatedData = processedData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  const getRiskBadgeClass = (category: RiskCategory) => {
    switch (category) {
      case 'Low': return 'bg-risk-low/20 text-risk-low border-risk-low/30'
      case 'Medium': return 'bg-risk-medium/20 text-risk-medium border-risk-medium/30'
      case 'High': return 'bg-risk-high/20 text-risk-high border-risk-high/30 animate-pulse'
      default: return ''
    }
  }

  const formatTCA = (tca: string) => {
    const date = new Date(tca)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h`
    } else if (hours > 0) {
      return `${hours}h ${Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))}m`
    } else {
      const mins = Math.floor(diff / (1000 * 60))
      return mins > 0 ? `${mins}m` : 'Now'
    }
  }

  const toggleRiskFilter = (category: RiskCategory) => {
    setRiskFilters(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
    setCurrentPage(1)
  }

  // Download functions
  const downloadCSV = (data: ConjunctionEvent[], filename: string) => {
    const headers = [
      'ID', 'Primary Satellite', 'Secondary Object', 'TCA', 
      'Miss Distance (m)', 'Relative Velocity (km/s)', 
      'Collision Probability', 'Risk Score', 'Risk Category'
    ]
    
    const csvContent = [
      headers.join(','),
      ...data.map(c => [
        c.id,
        getSatelliteName(c.primarySatelliteId),
        c.secondaryObjectName,
        c.tca,
        c.missDistance.toFixed(2),
        c.relativeVelocity.toFixed(4),
        c.collisionProbability.toExponential(4),
        c.riskScore.toFixed(4),
        c.riskCategory
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const downloadByRiskLevel = (riskLevel: RiskCategory) => {
    const filteredData = conjunctions.filter(c => c.riskCategory === riskLevel)
    if (filteredData.length === 0) return
    downloadCSV(filteredData, `conjunction_events_${riskLevel.toLowerCase()}_risk.csv`)
  }

  const downloadAllSorted = () => {
    // Sort by risk category: High first, then Medium, then Low
    const sortedData = [...conjunctions].sort((a, b) => {
      const order: Record<RiskCategory, number> = { High: 0, Medium: 1, Low: 2 }
      return order[a.riskCategory] - order[b.riskCategory]
    })
    downloadCSV(sortedData, 'conjunction_events_all_sorted.csv')
  }

  // Get counts per risk level
  const riskCounts = useMemo(() => {
    return {
      High: conjunctions.filter(c => c.riskCategory === 'High').length,
      Medium: conjunctions.filter(c => c.riskCategory === 'Medium').length,
      Low: conjunctions.filter(c => c.riskCategory === 'Low').length,
    }
  }, [conjunctions])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Conjunction Events
            <Badge variant="secondary" className="ml-2">
              {processedData.length}
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9 w-[200px]"
              />
            </div>

            {/* Risk Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Risk
                  {riskFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {riskFilters.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(['Low', 'Medium', 'High'] as RiskCategory[]).map(category => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={riskFilters.includes(category)}
                    onCheckedChange={() => toggleRiskFilter(category)}
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead>Secondary</TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('tca')}
                >
                  <div className="flex items-center gap-1">
                    TCA
                    <SortIcon field="tca" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('missDistance')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Miss Dist
                    <SortIcon field="missDistance" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('relativeVelocity')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Rel Vel
                    <SortIcon field="relativeVelocity" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('riskScore')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Risk
                    <SortIcon field="riskScore" />
                  </div>
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No conjunction events found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((conj) => (
                  <TableRow 
                    key={conj.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedConjunctionId === conj.id && "bg-primary/5",
                      conj.riskCategory === 'High' && "bg-risk-high/5"
                    )}
                    onClick={() => setSelectedConjunction(conj.id)}
                  >
                    <TableCell className="font-mono text-xs">
                      {conj.id.slice(-8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getSatelliteName(conj.primarySatelliteId)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {conj.secondaryObjectName}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">
                          {formatTCA(conj.tca)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(conj.tca).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {conj.missDistance >= 1000 
                        ? `${(conj.missDistance / 1000).toFixed(2)} km`
                        : `${conj.missDistance.toFixed(0)} m`
                      }
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {conj.relativeVelocity.toFixed(2)} km/s
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {conj.riskScore.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getRiskBadgeClass(conj.riskCategory))}
                      >
                        {conj.riskCategory}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, processedData.length)} of{' '}
              {processedData.length} events
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Download Section */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Export Data</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadAllSorted}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download All (Sorted by Risk)
              </Button>
            </div>

            {/* Download by Risk Level */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadByRiskLevel('High')}
                disabled={riskCounts.High === 0}
                className="gap-2 border-risk-high/30 hover:bg-risk-high/10 hover:text-risk-high"
              >
                <AlertTriangleIcon className="h-4 w-4 text-risk-high" />
                <span>High Risk</span>
                <Badge variant="secondary" className="ml-auto bg-risk-high/20 text-risk-high">
                  {riskCounts.High}
                </Badge>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadByRiskLevel('Medium')}
                disabled={riskCounts.Medium === 0}
                className="gap-2 border-risk-medium/30 hover:bg-risk-medium/10 hover:text-risk-medium"
              >
                <Shield className="h-4 w-4 text-risk-medium" />
                <span>Medium Risk</span>
                <Badge variant="secondary" className="ml-auto bg-risk-medium/20 text-risk-medium">
                  {riskCounts.Medium}
                </Badge>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadByRiskLevel('Low')}
                disabled={riskCounts.Low === 0}
                className="gap-2 border-risk-low/30 hover:bg-risk-low/10 hover:text-risk-low"
              >
                <Shield className="h-4 w-4 text-risk-low" />
                <span>Low Risk</span>
                <Badge variant="secondary" className="ml-auto bg-risk-low/20 text-risk-low">
                  {riskCounts.Low}
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* Workflow Guide */}
        <Collapsible open={workflowOpen} onOpenChange={setWorkflowOpen} className="mt-6">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto border border-border rounded-lg hover:bg-secondary/50">
              <div className="flex items-center gap-3">
                <Wrench className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-sm">Processing Workflow Guide</p>
                  <p className="text-xs text-muted-foreground">Recommended tools for processing downloaded CDM data</p>
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", workflowOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Low Risk Processing */}
              <div className="rounded-lg border border-risk-low/30 bg-risk-low/5 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-risk-low" />
                  <h4 className="font-medium text-risk-low">Low-Risk CDM Processing</h4>
                </div>
                <div className="space-y-3">
                  <WorkflowStep 
                    icon={<Wrench className="h-4 w-4" />}
                    title="RABBIT Analysis"
                    description="Use the RABBIT toolkit (MATLAB) for quick safety assessment"
                  />
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  <WorkflowStep 
                    icon={<LineChart className="h-4 w-4" />}
                    title="Visualize in Python"
                    description="Plot and confirm safe orbits using Python tools"
                  />
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  <WorkflowStep 
                    icon={<Archive className="h-4 w-4" />}
                    title="Archive Safe Event"
                    description="Log the event as safe - no action required"
                  />
                </div>
              </div>

              {/* High Risk Processing */}
              <div className="rounded-lg border border-risk-high/30 bg-risk-high/5 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangleIcon className="h-5 w-5 text-risk-high" />
                  <h4 className="font-medium text-risk-high">High-Risk CDM Processing</h4>
                </div>
                <div className="space-y-3">
                  <WorkflowStep 
                    icon={<Target className="h-4 w-4" />}
                    title="Simulate Close Approach"
                    description="Run MATLAB Toolbox simulations to analyze conjunction risk"
                  />
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  <WorkflowStep 
                    icon={<Orbit className="h-4 w-4" />}
                    title="Orbit Planning (GMAT)"
                    description="Use GMAT to calculate delta-v for avoidance maneuvers"
                  />
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  <WorkflowStep 
                    icon={<Cpu className="h-4 w-4" />}
                    title="Quantum Optimization (QUBO)"
                    description="Use digital annealing to optimize maneuver in complex environments"
                  />
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  <WorkflowStep 
                    icon={<LineChart className="h-4 w-4" />}
                    title="Adjust Covariance"
                    description="Reduce uncertainty in the maneuver outcome"
                  />
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  <WorkflowStep 
                    icon={<Rocket className="h-4 w-4" />}
                    title="Recommend Maneuver"
                    description="Final output: optimized, actionable maneuver plan"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

// Workflow step component
function WorkflowStep({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="flex items-start gap-3 p-2 rounded-md bg-card/50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
