"use client"

import * as React from "react"
import { Settings, Plus, Trash2, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"

import {
  McpServerConfig,
  loadMcpServers,
  saveMcpServer,
  removeMcpServer,
  toggleMcpServer,
} from "@/lib/mcp"

interface McpConfigDialogProps {
  onServerChange?: () => void
}

export function McpConfigDialog({ onServerChange }: McpConfigDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [servers, setServers] = React.useState<McpServerConfig[]>([])
  const [editingServer, setEditingServer] = React.useState<McpServerConfig | null>(null)
  const [isAddingNew, setIsAddingNew] = React.useState(false)

  // Load servers when dialog opens
  React.useEffect(() => {
    if (open) {
      setServers(loadMcpServers())
    }
  }, [open])

  const handleAddNew = () => {
    setEditingServer({
      id: crypto.randomUUID(),
      name: "",
      url: "",
      enabled: true,
      description: "",
      apiKey: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setIsAddingNew(true)
  }

  const handleSave = () => {
    if (!editingServer) return

    // Validate
    if (!editingServer.name.trim() || !editingServer.url.trim()) {
      alert("Name and URL are required")
      return
    }

    // Validate URL format
    try {
      new URL(editingServer.url)
    } catch {
      alert("Invalid URL format")
      return
    }

    saveMcpServer(editingServer)
    setServers(loadMcpServers())
    setEditingServer(null)
    setIsAddingNew(false)
    onServerChange?.()
  }

  const handleCancel = () => {
    setEditingServer(null)
    setIsAddingNew(false)
  }

  const handleEdit = (server: McpServerConfig) => {
    setEditingServer(server)
    setIsAddingNew(false)
  }

  const handleDelete = (serverId: string) => {
    if (confirm("Are you sure you want to delete this MCP server configuration?")) {
      removeMcpServer(serverId)
      setServers(loadMcpServers())
      onServerChange?.()
    }
  }

  const handleToggle = (serverId: string, enabled: boolean) => {
    toggleMcpServer(serverId, enabled)
    setServers(loadMcpServers())
    onServerChange?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Configure MCP servers">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>MCP Server Configuration</DialogTitle>
          <DialogDescription>
            Configure Model Context Protocol (MCP) servers to extend the AI agent with custom tools and resources.
          </DialogDescription>
        </DialogHeader>

        {editingServer ? (
          // Edit form
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Server Name *</Label>
              <Input
                id="name"
                placeholder="My MCP Server"
                value={editingServer.name}
                onChange={(e) =>
                  setEditingServer({ ...editingServer, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url">Server URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://mcp-server.example.com"
                value={editingServer.url}
                onChange={(e) =>
                  setEditingServer({ ...editingServer, url: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Full URL to your MCP server endpoint (must support CORS for browser access)
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of this server"
                value={editingServer.description || ""}
                onChange={(e) =>
                  setEditingServer({ ...editingServer, description: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apiKey">API Key (optional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Bearer token for authentication"
                value={editingServer.apiKey || ""}
                onChange={(e) =>
                  setEditingServer({ ...editingServer, apiKey: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Optional authentication token (stored locally in browser)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={editingServer.enabled}
                onCheckedChange={(checked) =>
                  setEditingServer({ ...editingServer, enabled: checked })
                }
              />
              <Label htmlFor="enabled">Enable this server</Label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {isAddingNew ? "Add Server" : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          // Server list
          <>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {servers.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No MCP servers configured</p>
                    <p className="text-sm mt-2">Click "Add Server" to get started</p>
                  </div>
                )}
                {servers.map((server) => (
                  <div
                    key={server.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{server.name}</h4>
                          {server.enabled ? (
                            <Badge variant="default" className="text-xs">
                              <Power className="h-3 w-3 mr-1" />
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {server.url}
                        </p>
                        {server.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {server.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(server)}
                          aria-label="Edit server"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(server.id)}
                          aria-label="Delete server"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`toggle-${server.id}`}
                        checked={server.enabled}
                        onCheckedChange={(checked) => handleToggle(server.id, checked)}
                      />
                      <Label htmlFor={`toggle-${server.id}`} className="text-sm">
                        {server.enabled ? "Enabled" : "Disabled"}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                {servers.length} server{servers.length !== 1 ? "s" : ""} configured
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
