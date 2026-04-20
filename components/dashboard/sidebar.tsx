"use client"

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useDashboard } from '@/lib/dashboard-context'
import {
  Satellite,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileText,
  CheckCircle,
} from 'lucide-react'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle')
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addAlert } = useDashboard()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file extension (CDM files are typically .xml or .cdm)
    const validExtensions = ['.xml', '.cdm', '.csv', '.json']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    
    if (!validExtensions.includes(ext)) {
      addAlert({
        type: 'warning',
        title: 'Invalid File Type',
        message: `Please upload a CDM file (.xml, .cdm, .csv, or .json). Got: ${ext}`
      })
      return
    }

    setUploadStatus('uploading')
    setFileName(file.name)

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500))

    setUploadStatus('success')
    addAlert({
      type: 'success',
      title: 'CDM Uploaded',
      message: `Successfully loaded ${file.name}. Processing conjunction data...`
    })

    // Reset after 3 seconds
    setTimeout(() => {
      setUploadStatus('idle')
    }, 3000)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Satellite className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-sidebar-foreground">FURSAN</span>
              <span className="text-xs text-muted-foreground">Collision Risk System</span>
            </div>
          )}
        </div>

        {/* CDM Upload Section */}
        <div className={cn(
          "border-b border-sidebar-border p-3",
          collapsed && "flex justify-center"
        )}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xml,.cdm,.csv,.json"
            className="hidden"
          />
          
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={triggerFileUpload}
                  disabled={uploadStatus === 'uploading'}
                  className={cn(
                    "h-9 w-9",
                    uploadStatus === 'success' && "border-risk-low text-risk-low"
                  )}
                >
                  {uploadStatus === 'uploading' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : uploadStatus === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Upload CDM File
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={triggerFileUpload}
                disabled={uploadStatus === 'uploading'}
                className={cn(
                  "w-full justify-start gap-2",
                  uploadStatus === 'success' && "border-risk-low text-risk-low"
                )}
              >
                {uploadStatus === 'uploading' ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Uploading...</span>
                  </>
                ) : uploadStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Uploaded</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload CDM</span>
                  </>
                )}
              </Button>
              
              {fileName && uploadStatus === 'success' && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/50">
                  <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {fileName}
                  </span>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground px-1">
                Accepts: .xml, .cdm, .csv, .json
              </p>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Collapse Button */}
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full justify-center text-muted-foreground hover:text-foreground",
              !collapsed && "justify-between"
            )}
          >
            {!collapsed && <span className="text-xs">Collapse</span>}
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
