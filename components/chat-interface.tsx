"use client"

import * as React from "react"
import { Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { DEFAULT_MODEL } from "@/lib/constants"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
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

    try {
      const url = baseUrl || "https://api.openai.com/v1"
      const response = await fetch(`${url}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || DEFAULT_MODEL,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.choices[0]?.message?.content || "No response",
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An error occurred"))
    } finally {
      setIsLoading(false)
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
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2">
                  <p className="text-sm">Error: {error.message}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading || !apiKey}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !apiKey}>
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
