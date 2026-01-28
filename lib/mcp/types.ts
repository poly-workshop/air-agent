/**
 * MCP (Model Context Protocol) type definitions
 */

/**
 * MCP Server configuration stored in localStorage
 */
export interface McpServerConfig {
  id: string
  name: string
  url: string
  enabled: boolean
  description?: string
  apiKey?: string
  createdAt: string
  updatedAt: string
}

/**
 * MCP Connection status
 */
export type McpConnectionStatus = 
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "reconnecting"

/**
 * MCP Connection state
 */
export interface McpConnectionState {
  serverId: string
  status: McpConnectionStatus
  error?: string
  connectedAt?: string
  lastError?: string
}

/**
 * MCP Tool from server
 */
export interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties?: Record<string, unknown>
    required?: string[]
  }
}

/**
 * MCP Resource from server
 */
export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

/**
 * Settings data with MCP support
 */
export interface McpEnabledSettings {
  mcpEnabled: boolean
  mcpServerId?: string
}
