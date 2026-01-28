/**
 * AI SDK Service - Handles streaming and automatic tool call execution
 */

import { ChatMessage, ToolCall, ToolRegistry } from "./tools"

interface StreamChunk {
  type: "content" | "tool_calls" | "done" | "error"
  content?: string
  tool_calls?: ToolCall[]
  error?: string
}

export interface AiSdkOptions {
  apiKey: string
  baseUrl: string
  model: string
  toolRegistry?: ToolRegistry
  onStreamChunk?: (chunk: StreamChunk) => void
  maxToolIterations?: number
}

/**
 * AI SDK Service for handling streaming and automatic tool call execution
 */
export class AiSdkService {
  private apiKey: string
  private baseUrl: string
  private model: string
  private toolRegistry?: ToolRegistry
  private onStreamChunk?: (chunk: StreamChunk) => void
  private maxToolIterations: number

  constructor(options: AiSdkOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl
    this.model = options.model
    this.toolRegistry = options.toolRegistry
    this.onStreamChunk = options.onStreamChunk
    this.maxToolIterations = options.maxToolIterations || 5
  }

  /**
   * Send a message and handle automatic tool execution with streaming
   */
  async sendMessage(messages: ChatMessage[]): Promise<ChatMessage[]> {
    let allMessages = [...messages]
    let iterations = 0

    while (iterations < this.maxToolIterations) {
      iterations++

      // Get tools if registry is available
      const tools = this.toolRegistry?.getToolDefinitions()

      // Make API call
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: allMessages,
          tools: tools && tools.length > 0 ? tools : undefined,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      // Parse streaming response
      const result = await this.parseStreamingResponse(response)

      // Add assistant message to conversation
      allMessages.push(result.message)

      // If there are tool calls, execute them
      if (result.message.tool_calls && result.message.tool_calls.length > 0) {
        this.onStreamChunk?.({ type: "tool_calls", tool_calls: result.message.tool_calls })

        if (!this.toolRegistry) {
          throw new Error("Tool calls received but no tool registry provided")
        }

        // Execute all tool calls
        const toolResults = await Promise.all(
          result.message.tool_calls.map(async (toolCall) => {
            const args = JSON.parse(toolCall.function.arguments)
            const result = await this.toolRegistry!.executeTool(toolCall.function.name, args)

            const toolMessage: ChatMessage = {
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(result),
            }

            return toolMessage
          })
        )

        // Add tool results to conversation
        allMessages.push(...toolResults)

        // Continue loop to get next assistant response
        continue
      }

      // No tool calls, we're done
      this.onStreamChunk?.({ type: "done" })
      break
    }

    if (iterations >= this.maxToolIterations) {
      throw new Error("Maximum tool iteration limit reached")
    }

    return allMessages
  }

  /**
   * Parse streaming response from OpenAI API
   */
  private async parseStreamingResponse(response: Response): Promise<{
    message: ChatMessage
  }> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body")
    }

    const decoder = new TextDecoder()
    let buffer = ""
    let content = ""
    let toolCalls: ToolCall[] = []
    let currentToolCallIndex = -1

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === "data: [DONE]") continue
          if (!trimmed.startsWith("data: ")) continue

          try {
            const json = JSON.parse(trimmed.slice(6))
            const delta = json.choices?.[0]?.delta

            if (!delta) continue

            // Handle content
            if (delta.content) {
              content += delta.content
              this.onStreamChunk?.({ type: "content", content: delta.content })
            }

            // Handle tool calls
            if (delta.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index

                // Initialize new tool call if needed
                if (index > currentToolCallIndex) {
                  currentToolCallIndex = index
                  toolCalls[index] = {
                    id: toolCallDelta.id || "",
                    type: "function",
                    function: {
                      name: toolCallDelta.function?.name || "",
                      arguments: toolCallDelta.function?.arguments || "",
                    },
                  }
                } else {
                  // Append to existing tool call
                  if (toolCallDelta.id) {
                    toolCalls[index].id = toolCallDelta.id
                  }
                  if (toolCallDelta.function?.name) {
                    toolCalls[index].function.name += toolCallDelta.function.name
                  }
                  if (toolCallDelta.function?.arguments) {
                    toolCalls[index].function.arguments += toolCallDelta.function.arguments
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error parsing stream chunk:", e)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    const message: ChatMessage = {
      role: "assistant",
      content: content || null,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    }

    return { message }
  }
}
