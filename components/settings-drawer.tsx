"use client"

import * as React from "react"
import { Settings, Download, Upload } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ThemeSelector } from "@/components/theme-selector"
import { McpConfigDialog } from "@/components/mcp-config-dialog"
import { getDefaultTools } from "@/lib/tools"

interface SettingsData {
  openaiApiKey: string
  openaiBaseUrl: string
  model: string
  systemPrompt: string
  transitiveThinking: boolean
  enabledBuiltInTools: string[]
  maxToolIterations: number
}

interface SettingsDrawerProps {
  settings: SettingsData
  onSettingsChange: (settings: SettingsData) => void
  onExport: () => void
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onMcpConfigChange: () => void
}

export function SettingsDrawer({
  settings,
  onSettingsChange,
  onExport,
  onImport,
  onMcpConfigChange,
}: SettingsDrawerProps) {
  const [localSettings, setLocalSettings] = React.useState(settings)
  const [open, setOpen] = React.useState(false)
  const importInputRef = React.useRef<HTMLInputElement>(null)
  const builtInTools = React.useMemo(() => getDefaultTools(), [])

  React.useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = () => {
    onSettingsChange(localSettings)
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const toggleBuiltInTool = (toolName: string, enabled: boolean) => {
    const nextTools = enabled
      ? Array.from(new Set([...localSettings.enabledBuiltInTools, toolName]))
      : localSettings.enabledBuiltInTools.filter((name) => name !== toolName)

    setLocalSettings({
      ...localSettings,
      enabledBuiltInTools: nextTools,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open settings" className="fixed right-4 top-4 z-40">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="!left-auto right-0 top-0 h-screen w-full max-w-md overflow-y-auto !translate-x-0 !translate-y-0 rounded-none sm:rounded-none">
        <DialogHeader>
          <DialogTitle>Workspace Settings</DialogTitle>
          <DialogDescription>
            Manage API, MCP, theme and workspace import/export in one place.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="drawer-apiKey">OpenAI API Key</Label>
            <Input
              id="drawer-apiKey"
              type="password"
              placeholder="sk-..."
              value={localSettings.openaiApiKey}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, openaiApiKey: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="drawer-model">Model</Label>
            <Input
              id="drawer-model"
              type="text"
              placeholder="gpt-4o-mini"
              value={localSettings.model}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, model: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="drawer-baseUrl">OpenAI Base URL (optional)</Label>
            <Input
              id="drawer-baseUrl"
              type="url"
              placeholder="https://api.openai.com/v1"
              value={localSettings.openaiBaseUrl}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, openaiBaseUrl: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="drawer-systemPrompt">System Prompt (optional)</Label>
            <Textarea
              id="drawer-systemPrompt"
              placeholder="You are a professional assistant. Current time: {{current_time}}; Current location: {{current_location}}"
              value={localSettings.systemPrompt}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, systemPrompt: e.target.value })
              }
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {"Supported template variables: {{current_time}}, {{current_location}}, {{current_time_iso}}, {{current_timezone}}."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="drawer-maxToolIterations">Max Tool Iterations</Label>
            <Input
              id="drawer-maxToolIterations"
              type="number"
              min={-1}
              step={1}
              placeholder="5"
              value={localSettings.maxToolIterations}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "" || raw === "-") return
                const num = parseInt(raw, 10)
                if (Number.isNaN(num) || num <= 0) return
                setLocalSettings({ ...localSettings, maxToolIterations: num })
              }}
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of tool call rounds per message. Set to -1 for unlimited.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-1">
              <Label htmlFor="drawer-transitiveThinking">Transitive Thinking</Label>
              <p className="text-xs text-muted-foreground">
                Encourage multi-hop reasoning by chaining intermediate relations before final conclusions.
              </p>
            </div>
            <Switch
              id="drawer-transitiveThinking"
              checked={localSettings.transitiveThinking}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, transitiveThinking: checked })
              }
              aria-label="Toggle Transitive Thinking"
            />
          </div>

          <div className="grid gap-2">
            <Label>Theme</Label>
            <ThemeSelector />
          </div>

          <div className="border-t pt-4 grid gap-3">
            <Label>Built-in Tools</Label>
            {builtInTools.map((tool) => {
              const toolName = tool.definition.function.name
              const enabled = localSettings.enabledBuiltInTools.includes(toolName)

              return (
                <div key={toolName} className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium break-all">{toolName}</p>
                    <p className="text-xs text-muted-foreground">
                      {tool.definition.function.description}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => toggleBuiltInTool(toolName, checked)}
                    aria-label={`Toggle tool ${toolName}`}
                  />
                </div>
              )
            })}
          </div>

          <div className="border-t pt-4 grid gap-2">
            <Label>MCP Servers</Label>
            <McpConfigDialog
              onServerChange={onMcpConfigChange}
              trigger={<Button variant="outline">Manage MCP Servers</Button>}
            />
          </div>

          <div className="border-t pt-4 grid gap-2">
            <Label>Workspace File</Label>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                void onImport(event)
              }}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={onExport} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={handleImportClick} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => setLocalSettings(settings)}>
            Reset
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
