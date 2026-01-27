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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeSelector } from "@/components/theme-selector"

interface SettingsData {
  openaiApiKey: string
  openaiBaseUrl: string
  model: string
}

interface SettingsDialogProps {
  settings: SettingsData
  onSettingsChange: (settings: SettingsData) => void
}

export function SettingsDialog({ settings, onSettingsChange }: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = React.useState(settings)
  const [open, setOpen] = React.useState(false)

  // Sync localSettings when settings prop changes
  React.useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = () => {
    onSettingsChange(localSettings)
    setOpen(false) // Close dialog after saving
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your OpenAI API settings. Settings are stored locally in your browser.
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
            <p className="text-xs text-muted-foreground">
              API key is visible in browser DevTools. Use restricted keys when possible.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model">Model</Label>
            <Select
              value={localSettings.model}
              onValueChange={(value) =>
                setLocalSettings({ ...localSettings, model: value })
              }
            >
              <SelectTrigger id="model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
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
