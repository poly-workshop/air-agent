"use client"

import * as React from "react"
import { ChatInterface } from "@/components/chat-interface"
import { SettingsDialog } from "@/components/settings-dialog"

interface SettingsData {
  openaiApiKey: string
  openaiBaseUrl: string
  mcpSettings: string
}

export default function Home() {
  const [settings, setSettings] = React.useState<SettingsData>({
    openaiApiKey: "",
    openaiBaseUrl: "",
    mcpSettings: "{}",
  })

  // Load settings from localStorage on mount
  React.useEffect(() => {
    const savedSettings = localStorage.getItem("air-agent-settings")
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
    localStorage.setItem("air-agent-settings", JSON.stringify(newSettings))
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Air Agent</h1>
            <p className="text-sm text-muted-foreground">
              AI Chat Interface powered by Vercel AI SDK
            </p>
          </div>
          <SettingsDialog
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <ChatInterface
          apiKey={settings.openaiApiKey}
          baseUrl={settings.openaiBaseUrl}
        />
      </main>
    </div>
  )
}
