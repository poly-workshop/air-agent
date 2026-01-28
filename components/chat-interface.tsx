"use client"

import * as React from "react"
import { Send, Loader2, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { DEFAULT_MODEL, DEFAULT_BASE_URL } from "@/lib/constants"
import { AiSdkService } from "@/lib/ai-sdk"
import { ToolRegistry, getDefaultTools, ChatMessage, ToolCall } from "@/lib/tools"

interface Message {
  id: string
  role: "user" | "assistant" | "tool" | "system"
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

interface ChatInterfaceProps {
  apiKey: string
  baseUrl: string
  model: string
}

export function ChatInterface({ apiKey, baseUrl, model }: ChatInterfaceProps) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [toolRegistry] = React.useState(() => {
    const registry = new ToolRegistry()
    getDefaultTools().forEach((tool) => registry.registerTool(tool))
    return registry
  })
  const [activeToolCalls, setActiveToolCalls] = React.useState<string[]>([])
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !apiKey) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)
    setActiveToolCalls([])

    // Create a streaming assistant message
    const streamingMessageId = crypto.randomUUID()
    let streamingContent = ""

    try {
      const url = baseUrl || DEFAULT_BASE_URL

      // Convert UI messages to ChatMessage format
      const chatMessages: ChatMessage[] = [
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant" | "tool",
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
          name: m.name,
        })),
        {
          role: "user" as const,
          content: userMessage.content,
        },
      ]

      // Create AI SDK service with streaming callback
      const aiSdk = new AiSdkService({
        apiKey,
        baseUrl: url,
        model: model || DEFAULT_MODEL,
        toolRegistry,
        onStreamChunk: (chunk) => {
          if (chunk.type === "content" && chunk.content) {
            streamingContent += chunk.content
            setMessages((prev) => {
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

      // Send message and handle automatic tool execution
      const resultMessages = await aiSdk.sendMessage(chatMessages)

      // Update messages with final results
      const finalMessages: Message[] = resultMessages
        .slice(messages.length + 1) // Skip already displayed messages
        .map((msg) => ({
          id: crypto.randomUUID(),
          role: msg.role,
          content: msg.content || "",
          tool_calls: msg.tool_calls,
          tool_call_id: msg.tool_call_id,
          name: msg.name,
        }))

      setMessages((prev) => {
        // Remove streaming message if it exists
        const filtered = prev.filter((m) => m.id !== streamingMessageId)
        return [...filtered, ...finalMessages]
      })

      setActiveToolCalls([])
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An error occurred"))
      // Remove streaming message on error
      setMessages((prev) => prev.filter((m) => m.id !== streamingMessageId))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Submit on Enter, allow Shift+Enter for new line (though Input doesn't support multiline)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) {
        form.requestSubmit()
      }
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto h-[calc(100vh-8rem)]">
      <CardHeader>
        <CardTitle>AI Agent Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-[calc(100%-5rem)]">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
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
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.role === "tool"
                      ? "bg-muted/50 border border-muted-foreground/20"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "tool" ? (
                    <div className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="mb-1">
                        <Wrench className="h-3 w-3 mr-1" />
                        Tool Result
                      </Badge>
                      <pre className="whitespace-pre-wrap font-mono text-xs mt-1">
                        {message.content}
                      </pre>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
        <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
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
      </CardContent>
    </Card>
  )
}
