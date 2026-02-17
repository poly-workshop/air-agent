"use client"

import { useState, type KeyboardEvent } from "react"
import { Lightbulb, Code, BarChart3, Calendar, Send, AlertCircle, Network } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { McpToggle } from "@/components/mcp-toggle"
import { cn } from "@/lib/utils"

interface SessionCreatorProps {
  onStartSession: (message: string) => void
  apiKeyConfigured: boolean
  mcpEnabled?: boolean
  mcpStatus?: string
  mcpError?: string
  mcpServerId?: string
  onMcpToggle?: (enabled: boolean, serverId?: string) => void
  /** Passed to McpToggle to force server list refresh */
  mcpConfigKey?: number
}

const RECOMMENDED_QUESTIONS = [
  {
    category: "Creative Writing",
    icon: Lightbulb,
    question: "Write a short poem about spring",
    color: "text-amber-500",
  },
  {
    category: "Programming",
    icon: Code,
    question: "Explain how React useEffect works",
    color: "text-blue-500",
  },
  {
    category: "Analysis",
    icon: BarChart3,
    question: "Analyze the pros and cons of remote work",
    color: "text-green-500",
  },
  {
    category: "Planning",
    icon: Calendar,
    question: "Help me create a Python learning plan",
    color: "text-purple-500",
  },
] as const

export function SessionCreator({
  onStartSession,
  apiKeyConfigured,
  mcpEnabled,
  mcpStatus,
  mcpError,
  mcpServerId,
  onMcpToggle,
  mcpConfigKey,
}: SessionCreatorProps) {
  const [input, setInput] = useState("")

  const disabled = !apiKeyConfigured

  const handleCardClick = (question: string) => {
    if (disabled) return
    onStartSession(question)
  }

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onStartSession(trimmed)
    setInput("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-2">Start a new conversation</h2>
      <p className="text-muted-foreground mb-8">Choose a topic or type your question</p>

      {disabled && (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Please configure your API key in Settings first</span>
        </div>
      )}

      {onMcpToggle && (
        <div className="flex flex-col items-center gap-2 mb-6">
          <McpToggle
            enabled={mcpEnabled ?? false}
            serverId={mcpServerId}
            onToggle={onMcpToggle}
            refreshKey={mcpConfigKey}
          />
          {mcpEnabled && mcpStatus === "connected" && (
            <Badge variant="default" className="text-xs">
              <Network className="h-3 w-3 mr-1" />
              MCP Connected
            </Badge>
          )}
          {mcpEnabled && mcpStatus === "connecting" && (
            <Badge variant="outline" className="text-xs">
              <Network className="h-3 w-3 mr-1" />
              MCP Connecting...
            </Badge>
          )}
          {mcpEnabled && mcpStatus === "error" && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              MCP Error: {mcpError}
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
        {RECOMMENDED_QUESTIONS.map((item) => {
          const Icon = item.icon
          return (
            <Card
              key={item.category}
              className={cn(
                "transition-colors",
                disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:bg-accent"
              )}
              onClick={() => handleCardClick(item.question)}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleCardClick(item.question)
                }
              }}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", item.color)} />
                <div>
                  <div className="font-medium text-sm">{item.category}</div>
                  <div className="text-sm text-muted-foreground mt-1">{item.question}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex gap-2 w-full">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question..."
          disabled={disabled}
          className="resize-none min-h-[44px] max-h-[120px]"
          rows={1}
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          size="icon"
          className="shrink-0 self-end"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
