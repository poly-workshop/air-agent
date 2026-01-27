"use client"

import * as React from "react"
import { Settings } from "lucide-react"
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
import { ThemeSelector } from "@/components/theme-selector"

interface SettingsData {
  openaiApiKey: string
  openaiBaseUrl: string
  mcpSettings: string
}

interface SettingsDialogProps {
  settings: SettingsData
  onSettingsChange: (settings: SettingsData) => void
}

export function SettingsDialog({ settings, onSettingsChange }: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = React.useState(settings)

  const handleSave = () => {
    onSettingsChange(localSettings)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your OpenAI API settings and MCP configuration. Settings are stored locally in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={localSettings.openaiApiKey}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, openaiApiKey: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="baseUrl">OpenAI Base URL (optional)</Label>
            <Input
              id="baseUrl"
              type="url"
              placeholder="https://api.openai.com/v1"
              value={localSettings.openaiBaseUrl}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, openaiBaseUrl: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mcpSettings">MCP Settings (JSON)</Label>
            <textarea
              id="mcpSettings"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder='{"key": "value"}'
              value={localSettings.mcpSettings}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, mcpSettings: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Theme</Label>
            <ThemeSelector />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
