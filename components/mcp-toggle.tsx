"use client"

import * as React from "react"
import { Network, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

import { McpServerConfig, loadMcpServers } from "@/lib/mcp"

interface McpToggleProps {
  enabled: boolean
  serverId?: string
  onToggle: (enabled: boolean, serverId?: string) => void
}

export function McpToggle({ enabled, serverId, onToggle }: McpToggleProps) {
  const [servers, setServers] = React.useState<McpServerConfig[]>([])
  const [open, setOpen] = React.useState(false)

  // Load servers on mount and when dialog is opened
  React.useEffect(() => {
    const loadServers = () => {
      const allServers = loadMcpServers()
      setServers(allServers.filter((s) => s.enabled))
    }
    
    loadServers()
    
    // Reload when storage changes (e.g., from MCP config dialog)
    const handleStorageChange = () => {
      loadServers()
    }
    
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const handleToggle = () => {
    if (enabled) {
      // Turning off
      onToggle(false, undefined)
    } else {
      // Turning on - select first available server if none selected
      const firstServer = servers[0]
      if (firstServer) {
        onToggle(true, firstServer.id)
      }
    }
  }

  const handleServerChange = (newServerId: string) => {
    onToggle(true, newServerId)
  }

  const selectedServer = servers.find((s) => s.id === serverId)
  const hasServers = servers.length > 0

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant={enabled ? "default" : "outline"}
          size="sm"
          onClick={handleToggle}
          disabled={!hasServers}
          aria-label={enabled ? "Disable MCP" : "Enable MCP"}
        >
          <Network className="h-4 w-4 mr-2" />
          {enabled ? "MCP Enabled" : "MCP Disabled"}
        </Button>
        {!hasServers && (
          <p className="text-xs text-muted-foreground">
            Configure MCP servers to enable
          </p>
        )}
      </div>
      
      {enabled && hasServers && (
        <div className="flex items-center gap-2">
          <Label htmlFor="mcp-server" className="text-sm">
            Server:
          </Label>
          <Select value={serverId || ""} onValueChange={handleServerChange}>
            <SelectTrigger id="mcp-server" className="w-[200px]">
              <SelectValue placeholder="Select server" />
            </SelectTrigger>
            <SelectContent>
              {servers.map((server) => (
                <SelectItem key={server.id} value={server.id}>
                  {server.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedServer && (
            <Badge variant="outline" className="text-xs">
              {selectedServer.name}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
