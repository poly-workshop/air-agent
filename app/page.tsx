"use client"

import * as React from "react"
import { ChatInterface } from "@/components/chat-interface"
import { SettingsDialog } from "@/components/settings-dialog"
import { McpConfigDialog } from "@/components/mcp-config-dialog"
import { STORAGE_KEY, DEFAULT_MODEL } from "@/lib/constants"

interface SettingsData {
  openaiApiKey: string
  openaiBaseUrl: string
  model: string
}

export default function Home() {
  const [settings, setSettings] = React.useState<SettingsData>({
    openaiApiKey: "",
    openaiBaseUrl: "",
    model: DEFAULT_MODEL,
  })
  const [mcpConfigKey, setMcpConfigKey] = React.useState(0)

  // Load settings from localStorage on mount
  React.useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY)
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (e) {
        console.error("Failed to load settings:", e)
      }
    }
  }, [])

  // Save settings to localStorage
  const handleSettingsChange = (newSettings: SettingsData) => {
    setSettings(newSettings)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
  }

  // Trigger re-render of chat interface when MCP config changes
  const handleMcpConfigChange = () => {
    setMcpConfigKey((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Air Agent</h1>
            <p className="text-sm text-muted-foreground">
              AI Chat Interface powered by OpenAI
            </p>
          </div>
          <div className="flex gap-2">
            <McpConfigDialog onServerChange={handleMcpConfigChange} />
            <SettingsDialog
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <ChatInterface
          key={mcpConfigKey}
          apiKey={settings.openaiApiKey}
          baseUrl={settings.openaiBaseUrl}
          model={settings.model}
        />
      </main>
    </div>
  )
}
