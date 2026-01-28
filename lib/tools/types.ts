/**
 * Tool execution types and interfaces for AI SDK
 */

/**
 * Parameters for a tool function
 */
export interface ToolParameters {
  type: "object"
  properties: Record<string, {
    type: string
    description?: string
    enum?: string[]
  }>
  required?: string[]
}

/**
 * Tool definition following OpenAI function calling format
 */
export interface ToolDefinition {
  type: "function"
  function: {
    name: string
    description: string
    parameters: ToolParameters
  }
}

/**
 * Result of tool execution
 */
export interface ToolResult {
  success: boolean
  result: unknown
  error?: string
}

/**
 * Tool executor function signature
 */
export type ToolExecutor = (args: Record<string, unknown>) => Promise<ToolResult>

/**
 * Tool registration combining definition and executor
 */
export interface Tool {
  definition: ToolDefinition
  executor: ToolExecutor
}

/**
 * Tool call from LLM response
 */
export interface ToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

/**
 * Message format with tool support
 */
export interface ChatMessage {
  role: "user" | "assistant" | "tool" | "system"
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}
