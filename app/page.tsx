"use client"

import * as React from "react"
import { ChatInterface } from "@/components/chat-interface"
import { SettingsDrawer } from "@/components/settings-drawer"
import { SessionSidebar } from "@/components/session-sidebar"
import { SessionCreator } from "@/components/session-creator"
import { SessionProvider, useSession } from "@/lib/session/context"
import { STORAGE_KEY, DEFAULT_MODEL, MCP_STORAGE_KEY, MCP_SETTINGS_KEY, SIDEBAR_STATE_KEY } from "@/lib/constants"
import { McpEnabledSettings, McpServerConfig, useMcpConnection } from "@/lib/mcp"
import { ToolRegistry, getDefaultTools, getDefaultToolNames } from "@/lib/tools"
import { Loader2 } from "lucide-react"


interface SettingsData {
  openaiApiKey: string
  openaiBaseUrl: string
  model: string
  systemPrompt: string
  transitiveThinking: boolean
  enabledBuiltInTools: string[]
  maxToolIterations: number
}

interface WorkspaceSettingsExport {
  version: number
  exportedAt: string
  settings: SettingsData
  mcpServers: McpServerConfig[]
  mcpChatSettings: McpEnabledSettings
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isSettingsData(value: unknown): value is SettingsData {
  if (!isObject(value)) return false
  return (
    typeof value.openaiApiKey === "string" &&
    typeof value.openaiBaseUrl === "string" &&
    typeof value.model === "string" &&
    (value.systemPrompt === undefined || typeof value.systemPrompt === "string") &&
    (value.transitiveThinking === undefined || typeof value.transitiveThinking === "boolean") &&
    (value.enabledBuiltInTools === undefined ||
      (Array.isArray(value.enabledBuiltInTools) && value.enabledBuiltInTools.every((item) => typeof item === "string"))) &&
    (value.maxToolIterations === undefined || typeof value.maxToolIterations === "number")
  )
}

function normalizeSettingsData(value: SettingsData): SettingsData {
  const defaultToolNames = getDefaultToolNames()
  const enabledBuiltInTools = (value.enabledBuiltInTools || defaultToolNames).filter((name) =>
    defaultToolNames.includes(name)
  )

  const rawMax = value.maxToolIterations ?? 5
  const maxToolIterations = rawMax === -1 ? -1 : Math.max(1, Math.floor(rawMax))

  return {
    openaiApiKey: value.openaiApiKey,
    openaiBaseUrl: value.openaiBaseUrl,
    model: value.model,
    systemPrompt: value.systemPrompt || "",
    transitiveThinking: value.transitiveThinking ?? false,
    enabledBuiltInTools,
    maxToolIterations,
  }
}

function isMcpEnabledSettings(value: unknown): value is McpEnabledSettings {
  if (!isObject(value)) return false
  if (typeof value.mcpEnabled !== "boolean") return false
  if (value.mcpServerId !== undefined && typeof value.mcpServerId !== "string") return false
  return true
}

function isMcpServerConfig(value: unknown): value is McpServerConfig {
  if (!isObject(value)) return false
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.url === "string" &&
    typeof value.enabled === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.description === undefined || typeof value.description === "string") &&
    (value.apiKey === undefined || typeof value.apiKey === "string")
  )
}

function parseStoredMcpServers(stored: string | null): McpServerConfig[] {
  if (!stored) return []
  const parsed: unknown = JSON.parse(stored)
  if (!Array.isArray(parsed) || !parsed.every(isMcpServerConfig)) {
    throw new Error("Invalid MCP server config format")
  }
  return parsed
}

function parseStoredMcpChatSettings(stored: string | null): McpEnabledSettings {
  if (!stored) return { mcpEnabled: false }
  const parsed: unknown = JSON.parse(stored)
  if (!isMcpEnabledSettings(parsed)) {
    throw new Error("Invalid MCP chat settings format")
  }
  return parsed
}

/**
 * Inner content component that uses useSession hook.
 * Must be rendered inside SessionProvider.
 */
function HomeContent() {
  const { isLoading, activeSession, createSession } = useSession()

  const [settings, setSettings] = React.useState<SettingsData>({
    openaiApiKey: "",
    openaiBaseUrl: "",
    model: DEFAULT_MODEL,
    systemPrompt: "",
    transitiveThinking: false,
    enabledBuiltInTools: getDefaultToolNames(),
    maxToolIterations: 5,
  })
  const [mcpConfigKey, setMcpConfigKey] = React.useState(0)

  // Tool registry — created once at the app level so MCP tools persist across session switches
  const toolRegistry = React.useMemo(() => {
    const registry = new ToolRegistry()
    getDefaultTools()
      .filter((tool) => settings.enabledBuiltInTools.includes(tool.definition.function.name))
      .forEach((tool) => registry.registerTool(tool))
    return registry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enabledBuiltInTools, mcpConfigKey])

  // MCP connection — lifted to app level so it connects before ChatInterface mounts
  const mcp = useMcpConnection(toolRegistry)

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(true)
  const [isMobile, setIsMobile] = React.useState(false)

  // Load settings from localStorage on mount
  React.useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY)
    if (savedSettings) {
      try {
        const parsed: unknown = JSON.parse(savedSettings)
        if (isSettingsData(parsed)) {
          setSettings(normalizeSettingsData(parsed))
        }
      } catch (e) {
        console.error("Failed to load settings:", e)
      }
    }
  }, [])

  // Load sidebar collapsed state and detect mobile on mount
  React.useEffect(() => {
    const mobile = window.innerWidth < 768
    setIsMobile(mobile)

    if (mobile) {
      setSidebarCollapsed(true)
    } else {
      const stored = localStorage.getItem(SIDEBAR_STATE_KEY)
      setSidebarCollapsed(stored === "true")
    }

    const handleResize = () => {
      const nowMobile = window.innerWidth < 768
      setIsMobile(nowMobile)
      if (nowMobile) {
        setSidebarCollapsed(true)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleToggleCollapse = React.useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      // Only persist on desktop
      if (window.innerWidth >= 768) {
        localStorage.setItem(SIDEBAR_STATE_KEY, String(next))
      }
      return next
    })
  }, [])

  // Close overlay sidebar when clicking backdrop on mobile
  const handleBackdropClick = React.useCallback(() => {
    setSidebarCollapsed(true)
  }, [])

  // Save settings to localStorage
  const handleSettingsChange = (newSettings: SettingsData) => {
    const normalized = normalizeSettingsData(newSettings)
    setSettings(normalized)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  }

  // Trigger re-render of chat interface when MCP config changes
  const handleMcpConfigChange = () => {
    setMcpConfigKey((prev) => prev + 1)
  }

  const handleExportSettings = () => {
    try {
      const exportData: WorkspaceSettingsExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings,
        mcpServers: parseStoredMcpServers(localStorage.getItem(MCP_STORAGE_KEY)),
        mcpChatSettings: parseStoredMcpChatSettings(localStorage.getItem(MCP_SETTINGS_KEY)),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const stamp = new Date().toISOString().replace(/[:.]/g, "-")
      link.href = url
      link.download = `air-agent-workspace-settings-${stamp}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export workspace settings:", error)
      alert("Export failed. Please check browser console for details.")
    }
  }

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)

      if (!isObject(parsed)) {
        throw new Error("Invalid import file")
      }

      let importedCount = 0

      const importedSettings =
        "settings" in parsed ? parsed.settings : parsed
      if (isSettingsData(importedSettings)) {
        const normalized = normalizeSettingsData(importedSettings)
        setSettings(normalized)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
        importedCount += 1
      }

      if ("mcpServers" in parsed) {
        if (!Array.isArray(parsed.mcpServers) || !parsed.mcpServers.every(isMcpServerConfig)) {
          throw new Error("Invalid MCP servers format")
        }
        localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(parsed.mcpServers))
        importedCount += 1
      }

      if ("mcpChatSettings" in parsed) {
        if (!isMcpEnabledSettings(parsed.mcpChatSettings)) {
          throw new Error("Invalid MCP chat settings format")
        }
        localStorage.setItem(MCP_SETTINGS_KEY, JSON.stringify(parsed.mcpChatSettings))
        importedCount += 1
      }

      if (importedCount === 0) {
        throw new Error("No valid settings found in import file")
      }

      setMcpConfigKey((prev) => prev + 1)
      alert("Workspace settings imported successfully")
    } catch (error) {
      console.error("Failed to import workspace settings:", error)
      alert("Import failed. Please ensure this is a valid exported settings JSON file.")
    }
  }

  // Initial message to auto-send in ChatInterface (from SessionCreator)
  const [initialMessage, setInitialMessage] = React.useState<string | undefined>()

  const handleStartSession = React.useCallback(
    async (message: string) => {
      // Set the initial message BEFORE creating the session so that when
      // ChatInterface mounts (triggered by activeSession becoming non-null),
      // the initialMessage prop is already available on the first render.
      setInitialMessage(message)
      await createSession()
    },
    [createSession]
  )

  const handleInitialMessageConsumed = React.useCallback(() => {
    setInitialMessage(undefined)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background">
      <SettingsDrawer
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onExport={handleExportSettings}
        onImport={handleImportSettings}
        onMcpConfigChange={handleMcpConfigChange}
      />
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile overlay backdrop */}
        {isMobile && !sidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/50 z-30"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <div
          className={
            isMobile && !sidebarCollapsed
              ? "fixed inset-y-0 left-0 z-40"
              : "relative z-10"
          }
        >
          <SessionSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeSession ? (
            <ChatInterface
              key={`${activeSession.id}-${mcpConfigKey}`}
              apiKey={settings.openaiApiKey}
              baseUrl={settings.openaiBaseUrl}
              model={settings.model}
              systemPrompt={settings.systemPrompt}
              transitiveThinking={settings.transitiveThinking}
              toolRegistry={toolRegistry}
              maxToolIterations={settings.maxToolIterations}
              mcpEnabled={mcp.mcpEnabled}
              mcpServerId={mcp.mcpServerId}
              mcpStatus={mcp.mcpStatus}
              mcpError={mcp.mcpError}
              mcpReady={mcp.mcpReady}
              onMcpToggle={mcp.handleMcpToggle}
              initialMessage={initialMessage}
              onInitialMessageConsumed={handleInitialMessageConsumed}
            />
          ) : (
            <SessionCreator
              onStartSession={handleStartSession}
              apiKeyConfigured={!!settings.openaiApiKey}
              mcpEnabled={mcp.mcpEnabled}
              mcpStatus={mcp.mcpStatus}
              mcpError={mcp.mcpError}
              mcpServerId={mcp.mcpServerId}
              onMcpToggle={mcp.handleMcpToggle}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <SessionProvider>
      <HomeContent />
    </SessionProvider>
  )
}
