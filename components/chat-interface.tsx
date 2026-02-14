"use client"

import * as React from "react"
import { Send, Loader2, Wrench, AlertCircle, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { McpToggle } from "@/components/mcp-toggle"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { ToolResult } from "@/components/tool-result"

import { DEFAULT_MODEL, DEFAULT_BASE_URL, MCP_SETTINGS_KEY } from "@/lib/constants"
import { AiSdkService } from "@/lib/ai-sdk"
import { buildSystemPrompt } from "@/lib/prompt-template"
import { ToolRegistry, getDefaultTools, ChatMessage, ToolCall } from "@/lib/tools"
import { McpClient, mcpToolToAirAgentTool, getMcpServer } from "@/lib/mcp"
import { useSession } from "@/lib/session/context"
import { toSessionMessage, fromSessionMessage } from "@/lib/session/types"

function detectUserLanguage(text: string): "Chinese" | "English" {
  const hasCjk = /[\u3400-\u9FFF\uF900-\uFAFF]/.test(text)
  return hasCjk ? "Chinese" : "English"
}

async function generateTransitiveThought(options: {
  apiKey: string
  baseUrl: string
  model: string
  systemPrompt: string
  messages: ChatMessage[]
  outputLanguage: "Chinese" | "English"
}): Promise<string> {
  const response = await fetch(`${options.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      stream: false,
      messages: [
        {
          role: "system",
          content: [
            options.systemPrompt,
            "",
            "You are now in Phase 1 (transitive reasoning draft).",
            "Output only a short Markdown block with this exact structure:",
            "### Reasoning Chain",
            "1. ...",
            "2. ...",
            "3. ...",
            "Requirements:",
            "- Do not provide the final answer",
            "- Do not call tools",
            "- If information is missing, state what is missing clearly",
            `- Write all content in ${options.outputLanguage}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
        ...options.messages,
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Thought phase failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const payload: unknown = await response.json()
  const content =
    typeof payload === "object" &&
    payload !== null &&
    "choices" in payload &&
    Array.isArray((payload as { choices?: unknown[] }).choices)
      ? (payload as { choices: Array<{ message?: { content?: string } }> }).choices[0]?.message?.content
      : ""

  if (!content || !content.trim()) {
    throw new Error("Thought phase returned empty content")
  }

  return content.trim()
}

interface Message {
  id: string
  role: "user" | "assistant" | "tool" | "system"
  content: string
  type?: "transitive-thought"
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

const MAX_REASONING_PREVIEW_LENGTH = 100

function TransitiveThoughtResult({ content }: { content: string }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const firstLine = content.split("\n")[0] || "Reasoning generated"
  const preview =
    firstLine.length > MAX_REASONING_PREVIEW_LENGTH
      ? `${firstLine.slice(0, MAX_REASONING_PREVIEW_LENGTH)}...`
      : firstLine

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full text-xs text-muted-foreground">
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="text-[10px]">Reasoning</Badge>
        <CollapsibleTrigger className="flex items-center gap-1 hover:text-foreground transition-colors">
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-[10px]">{isOpen ? "Hide" : "Show"}</span>
        </CollapsibleTrigger>
      </div>

      {!isOpen && <div className="text-[11px] text-muted-foreground/70 truncate">{preview}</div>}

      <CollapsibleContent className="mt-2">
        <MarkdownRenderer content={content} isUserMessage={false} />
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * Generate a session title from the first message content.
 * Truncates to 30 characters with "..." if longer.
 */
function generateTitleFromMessage(content: string): string {
  const trimmed = content.trim()
  if (trimmed.length <= 30) return trimmed
  return trimmed.slice(0, 30) + "..."
}

interface ChatInterfaceProps {
  apiKey: string
  baseUrl: string
  model: string
  systemPrompt: string
  transitiveThinking: boolean
  enabledBuiltInTools: string[]
  /** Optional initial message to auto-send when the component mounts (e.g. from SessionCreator) */
  initialMessage?: string
  /** Callback to clear the initial message after it has been consumed */
  onInitialMessageConsumed?: () => void
}

export function ChatInterface({
  apiKey,
  baseUrl,
  model,
  systemPrompt,
  transitiveThinking,
  enabledBuiltInTools,
  initialMessage,
  onInitialMessageConsumed,
}: ChatInterfaceProps) {
  const { activeSession, activeSessionId, addMessage, updateSessionTitle } = useSession()

  // Derive persisted messages from the active session
  const persistedMessages: Message[] = React.useMemo(() => {
    if (!activeSession) return []
    return activeSession.messages.map(fromSessionMessage)
  }, [activeSession])

  // Local streaming messages (not yet persisted)
  const [streamingMessages, setStreamingMessages] = React.useState<Message[]>([])

  // Combined messages for display: persisted + streaming
  const messages = React.useMemo(
    () => [...persistedMessages, ...streamingMessages],
    [persistedMessages, streamingMessages]
  )

  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const toolRegistry = React.useMemo(() => {
    const registry = new ToolRegistry()
    getDefaultTools()
      .filter((tool) => enabledBuiltInTools.includes(tool.definition.function.name))
      .forEach((tool) => registry.registerTool(tool))
    return registry
  }, [enabledBuiltInTools])
  const [activeToolCalls, setActiveToolCalls] = React.useState<string[]>([])
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  
  // MCP state
  const [mcpEnabled, setMcpEnabled] = React.useState(false)
  const [mcpServerId, setMcpServerId] = React.useState<string | undefined>()
  const [, setMcpClient] = React.useState<McpClient | null>(null)
  const mcpClientRef = React.useRef<McpClient | null>(null)
  const [mcpStatus, setMcpStatus] = React.useState<string>("disconnected")
  const [mcpError, setMcpError] = React.useState<string | undefined>()

  // Track whether initial message has been consumed
  const initialMessageConsumedRef = React.useRef(false)

  // Track whether MCP initialization is complete (connected or not applicable)
  const [mcpReady, setMcpReady] = React.useState(false)

  // Load MCP settings from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem(MCP_SETTINGS_KEY)
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        setMcpEnabled(settings.mcpEnabled || false)
        setMcpServerId(settings.mcpServerId)
      } catch (e) {
        console.error("Failed to load MCP settings:", e)
      }
    }
  }, [])

  // Handle MCP connection
  React.useEffect(() => {
    let cancelled = false

    const connectMcp = async () => {
      setMcpReady(false)

      // Disconnect existing client
      if (mcpClientRef.current) {
        await mcpClientRef.current.disconnect()
        mcpClientRef.current = null
        setMcpClient(null)
      }

      if (!mcpEnabled || !mcpServerId) {
        setMcpStatus("disconnected")
        if (!cancelled) setMcpReady(true)
        return
      }

      const serverConfig = getMcpServer(mcpServerId)
      if (!serverConfig) {
        setMcpError("Server configuration not found")
        setMcpStatus("error")
        if (!cancelled) setMcpReady(true)
        return
      }

      try {
        const client = new McpClient(serverConfig, (status, err) => {
          setMcpStatus(status)
          setMcpError(err)
        })

        await client.connect()
        
        const mcpTools = await client.listTools()
        
        if (cancelled) {
          await client.disconnect()
          return
        }

        mcpTools.forEach((mcpTool) => {
          const tool = mcpToolToAirAgentTool(mcpTool, client)
          toolRegistry.registerTool(tool)
        })

        mcpClientRef.current = client
        setMcpClient(client)
        setMcpError(undefined)
      } catch (err) {
        console.error("Failed to connect to MCP server:", err)
        if (!cancelled) {
          setMcpError(err instanceof Error ? err.message : "Connection failed")
          setMcpStatus("error")
          setMcpClient(null)
          mcpClientRef.current = null
        }
      } finally {
        if (!cancelled) setMcpReady(true)
      }
    }

    connectMcp()

    return () => {
      cancelled = true
      if (mcpClientRef.current) {
        mcpClientRef.current.disconnect().catch((err) => {
          console.error("Error during MCP cleanup:", err)
        })
        mcpClientRef.current = null
      }
    }
  }, [mcpEnabled, mcpServerId, toolRegistry])

  const handleMcpToggle = (enabled: boolean, serverId?: string) => {
    setMcpEnabled(enabled)
    setMcpServerId(serverId)
    
    const settings = { mcpEnabled: enabled, mcpServerId: serverId }
    localStorage.setItem(MCP_SETTINGS_KEY, JSON.stringify(settings))
  }

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Clear streaming messages when active session changes (user switched sessions)
  React.useEffect(() => {
    setStreamingMessages([])
    setError(null)
  }, [activeSessionId])

  /**
   * Core message sending logic. Handles:
   * 1. Persisting user message to session
   * 2. Auto-generating title on first message
   * 3. Transitive thinking phase
   * 4. AI SDK streaming call
   * 5. Persisting final assistant/tool messages after completion
   */
  const sendMessage = React.useCallback(async (messageContent: string) => {
    if (!messageContent.trim() || !apiKey || !activeSessionId) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent.trim(),
    }

    // Persist user message to session (Req 7.5: don't persist system messages)
    const userSessionMsg = toSessionMessage(userMessage)
    await addMessage(userSessionMsg)

    // Auto-generate title if this is the first message in the session
    const isFirstMessage = persistedMessages.length === 0
    if (isFirstMessage) {
      const title = generateTitleFromMessage(messageContent.trim())
      await updateSessionTitle(activeSessionId, title)
    }

    setIsLoading(true)
    setError(null)
    setActiveToolCalls([])

    // Create a streaming assistant message (local only, not persisted)
    const streamingMessageId = crypto.randomUUID()
    let streamingContent = ""

    try {
      const url = baseUrl || DEFAULT_BASE_URL
      const outputLanguage = detectUserLanguage(userMessage.content)
      const resolvedSystemPrompt = await buildSystemPrompt({
        template: systemPrompt,
        transitiveThinking,
      })

      // Build prior messages from persisted session messages (which now includes the user message we just added)
      // We need to use the messages BEFORE the current user message for the AI context,
      // plus the current user message
      const priorMessages: ChatMessage[] = persistedMessages.map((m) => ({
        role: m.role,
        content: m.content,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id,
        name: m.name,
      }))

      let phaseThought: string | null = null
      if (transitiveThinking) {
        phaseThought = await generateTransitiveThought({
          apiKey,
          baseUrl: url,
          model: model || DEFAULT_MODEL,
          systemPrompt: resolvedSystemPrompt,
          messages: [
            ...priorMessages,
            {
              role: "user",
              content: userMessage.content,
            },
          ],
          outputLanguage,
        })

        // Show transitive thought in streaming (local) state
        const thoughtMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: phaseThought,
          type: "transitive-thought",
        }
        setStreamingMessages([thoughtMessage])
      }

      const executionMessages: ChatMessage[] = [
        ...priorMessages,
        {
          role: "user",
          content: userMessage.content,
        },
        ...(phaseThought
          ? [
              {
                role: "assistant" as const,
                content: phaseThought,
              },
              {
                role: "user" as const,
                content:
                  `Continue from the reasoning chain above. Use tools if needed, then provide only the final response. Do not include \"Reasoning Chain\" or \"Final Answer\" headings, and do not repeat the reasoning section. Keep it concise and actionable. The output language must be ${outputLanguage}.`,
              },
            ]
          : []),
      ]

      const chatMessages: ChatMessage[] = resolvedSystemPrompt
        ? [{ role: "system", content: resolvedSystemPrompt }, ...executionMessages]
        : executionMessages

      const aiSdk = new AiSdkService({
        apiKey,
        baseUrl: url,
        model: model || DEFAULT_MODEL,
        toolRegistry,
        onStreamChunk: (chunk) => {
          if (chunk.type === "content" && chunk.content) {
            streamingContent += chunk.content
            setStreamingMessages((prev) => {
              const newMessages = [...prev]
              const streamingIndex = newMessages.findIndex(
                (m) => m.id === streamingMessageId
              )
              if (streamingIndex >= 0) {
                newMessages[streamingIndex] = {
                  ...newMessages[streamingIndex],
                  content: streamingContent,
                }
              } else {
                newMessages.push({
                  id: streamingMessageId,
                  role: "assistant",
                  content: streamingContent,
                })
              }
              return newMessages
            })
          } else if (chunk.type === "tool_calls" && chunk.tool_calls) {
            setActiveToolCalls(
              chunk.tool_calls.map((tc) => tc.function.name)
            )
          }
        },
      })

      const resultMessages = await aiSdk.sendMessage(chatMessages)

      // Extract new messages from the AI response (skip the input messages)
      const finalMessages: Message[] = resultMessages
        .slice(chatMessages.length)
        .map((msg) => ({
          id: crypto.randomUUID(),
          role: msg.role,
          content: msg.content || "",
          tool_calls: msg.tool_calls,
          tool_call_id: msg.tool_call_id,
          name: msg.name,
        }))

      // Persist transitive thought first if generated (Req 7.2), to maintain correct order
      if (phaseThought) {
        const thoughtSessionMsg = toSessionMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: phaseThought,
          type: "transitive-thought",
        })
        await addMessage(thoughtSessionMsg)
      }

      // Persist all final messages to session (Req 7.4: only after streaming completes)
      // Req 7.5: don't persist system messages
      for (const msg of finalMessages) {
        if (msg.role !== "system") {
          await addMessage(toSessionMessage(msg))
        }
      }

      // Clear streaming state — persisted messages will now include everything
      setStreamingMessages([])
      setActiveToolCalls([])
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An error occurred"))
      // Clear streaming messages on error
      setStreamingMessages([])
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, baseUrl, model, systemPrompt, transitiveThinking, toolRegistry, activeSessionId, persistedMessages, addMessage, updateSessionTitle])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !apiKey) return

    const messageContent = input.trim()
    setInput("")
    await sendMessage(messageContent)
  }

  // Stable ref to sendMessage so the initial-message effect doesn't re-fire
  // when sendMessage's identity changes (it depends on persistedMessages).
  const sendMessageRef = React.useRef(sendMessage)
  React.useEffect(() => {
    sendMessageRef.current = sendMessage
  }, [sendMessage])

  // Handle initial message from SessionCreator (auto-send on mount)
  // Wait for mcpReady so that MCP tools are registered before the first message is sent
  React.useEffect(() => {
    if (
      initialMessage &&
      !initialMessageConsumedRef.current &&
      apiKey &&
      activeSessionId &&
      !isLoading &&
      mcpReady
    ) {
      initialMessageConsumedRef.current = true
      onInitialMessageConsumed?.()
      sendMessageRef.current(initialMessage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, apiKey, activeSessionId, mcpReady])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) {
        form.requestSubmit()
      }
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto flex flex-col h-full">
      <CardHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <CardTitle>AI Agent Chat</CardTitle>
          <div className="flex flex-col items-end gap-2">
            <McpToggle
              enabled={mcpEnabled}
              serverId={mcpServerId}
              onToggle={handleMcpToggle}
            />
            {mcpEnabled && mcpStatus === "connected" && (
              <Badge variant="default" className="text-xs">
                MCP Connected
              </Badge>
            )}
            {mcpEnabled && mcpStatus === "connecting" && (
              <Badge variant="outline" className="text-xs">
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
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 overflow-hidden">
        <ScrollArea className="flex-1 w-full max-w-full pr-4">
          <div className="space-y-4 px-4 overflow-x-hidden max-w-full">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p>Start a conversation with the AI agent</p>
                <p className="text-sm mt-2">Ask questions, request help, or just chat!</p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 overflow-hidden break-words min-w-0 ${
                  message.role === "user"
                  ? "bg-primary text-primary-foreground  max-w-[90%]"
                  : message.type === "transitive-thought"
                  ? "bg-muted/50 border border-muted-foreground/20 max-w-[90%]"
                  : message.role === "tool"
                  ? "bg-muted/50 border border-muted-foreground/20 max-w-[90%]"
                  : "bg-muted max-w-[90%]"
                  }`}
                >
                  {message.role === "tool" ? (
                  <ToolResult content={message.content} name={message.name} />
                  ) : message.type === "transitive-thought" ? (
                  <TransitiveThoughtResult content={message.content} />
                  ) : (
                  <>
                  <div>
                  <MarkdownRenderer 
                  content={message.content} 
                  isUserMessage={message.role === "user"}
                  />
                  </div>
                  {message.tool_calls && message.tool_calls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.tool_calls.map((toolCall) => (
                      <Badge key={toolCall.id} variant="secondary" className="mr-1">
                        <Wrench className="h-3 w-3 mr-1" />
                        {toolCall.function.name}
                      </Badge>
                    ))}
                  </div>
                  )}
                  </>
                  )}
                </div>
              </div>
            ))}
            {isLoading && activeToolCalls.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-lg px-4 py-2 border border-muted-foreground/20" aria-label="Executing tools">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs text-muted-foreground">
                      Executing tools: {activeToolCalls.join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {isLoading && activeToolCalls.length === 0 && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2" aria-label="Loading">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2 max-w-[80%]">
                  <p className="text-sm">{error.message}</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <div className="flex-shrink-0 pt-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading || !apiKey}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !apiKey} aria-label="Send message">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          {!apiKey && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Please configure your OpenAI API key in settings
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
