/**
 * MCP Client for browser-side MCP connections
 * 
 * This provides a simplified interface for connecting to MCP servers
 * from the browser using HTTP/SSE transport.
 * 
 * Session Management:
 * - Session IDs are received from the MCP server via the 'mcp-session-id' response header
 * - The session ID is read after the initial connection request and after each subsequent request
 * - Session IDs are stored in memory for the duration of the browser session (while page is loaded)
 * - The underlying transport automatically includes the session ID in request headers
 * - Note: Session persistence across page reloads is not supported
 */

import { Client } from "@modelcontextprotocol/sdk/client"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { McpServerConfig, McpConnectionStatus, McpTool } from "./types"
import { Tool } from "../tools"

/**
 * MCP Client wrapper for browser use
 */
export class McpClient {
  private client: Client | null = null
  private transport: StreamableHTTPClientTransport | null = null
  private config: McpServerConfig
  private statusCallback?: (status: McpConnectionStatus, error?: string) => void
  private sessionId: string | undefined

  constructor(
    config: McpServerConfig,
    statusCallback?: (status: McpConnectionStatus, error?: string) => void
  ) {
    this.config = config
    this.statusCallback = statusCallback
    // Note: Session IDs are not persisted across page reloads
    // Each new page load will establish a fresh connection with a new session ID
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    try {
      this.updateStatus("connecting")

      // Create transport with configuration
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`
      }

      // Create Streamable HTTP transport
      // MCD's MCP doc uses the origin URL directly (e.g. https://mcp.mcd.cn).
      // Some deployments may respond 405 for GET /; we treat that as ignorable.
      const effectiveUrl = normalizeMcpEndpointUrl(this.config.url)
      this.transport = new StreamableHTTPClientTransport(new URL(effectiveUrl), {
        requestInit: {
          headers,
        },
        // Don't pass stored session ID - always start fresh
        // The server will generate a new session ID during initialization
        // Note: Session resumption across page loads is not supported by most MCP servers
      })

      // Create MCP client
      this.client = new Client(
        {
          name: "air-agent",
          version: "1.0.0",
        },
        {
          capabilities: {
            // Request server capabilities we support
          },
        }
      )

      // Connect to the server
      try {
        await this.client.connect(this.transport)
        // Read session ID from response header (set by the transport after initial request)
        // The transport receives the mcp-session-id header from the server and stores it
        const receivedSessionId = this.transport.sessionId
        if (receivedSessionId) {
          this.sessionId = receivedSessionId
          console.log(`MCP session established with ID from server: ${receivedSessionId.substring(0, 8)}...`)
        } else {
          console.warn("Warning: No session ID received from MCP server in response header")
        }
      } catch (error) {
        // Some MCP reverse proxies (and MCD's MCP origin) may return 405 to a GET probe
        // while still being usable for Streamable HTTP requests. Ignore 405 to prevent
        // noisy error state + reconnect loops.
        if (isLikely405(error)) {
          this.updateStatus("connected")
          // Read session ID from response header even for 405 case
          const receivedSessionId = this.transport.sessionId
          if (receivedSessionId) {
            this.sessionId = receivedSessionId
            console.log(`MCP session established (405 ignored) with ID from server: ${receivedSessionId.substring(0, 8)}...`)
          }
          return
        }
        throw error
      }
      this.updateStatus("connected")
    } catch (error) {
      const errorMsg = formatConnectError(error, this.config.url)
      this.updateStatus("error", errorMsg)
      throw error
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close()
        this.client = null
      }
      if (this.transport) {
        await this.transport.close()
        this.transport = null
      }
      this.updateStatus("disconnected")
    } catch (error) {
      console.error("Error disconnecting from MCP server:", error)
      this.updateStatus("disconnected")
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<McpTool[]> {
    if (!this.client) {
      throw new Error("Client not connected")
    }

    try {
      const result = await this.client.listTools()
      
      // Read session ID from response header after each request
      // The server may send an updated session ID in the response
      if (this.transport?.sessionId && this.transport.sessionId !== this.sessionId) {
        console.log(`MCP session ID updated from server: ${this.transport.sessionId.substring(0, 8)}...`)
        this.sessionId = this.transport.sessionId
      }
      
      return result.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || "",
        inputSchema: tool.inputSchema as {
          type: string
          properties?: Record<string, unknown>
          required?: string[]
        },
      }))
    } catch (error) {
      console.error("Error listing tools:", error)
      throw error
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.client) {
      throw new Error("Client not connected")
    }

    try {
      const result = await this.client.callTool({ name, arguments: args })
      
      // Read session ID from response header after each request
      // The server may send an updated session ID in the response
      if (this.transport?.sessionId && this.transport.sessionId !== this.sessionId) {
        console.log(`MCP session ID updated from server: ${this.transport.sessionId.substring(0, 8)}...`)
        this.sessionId = this.transport.sessionId
      }
      
      return result.content
    } catch (error) {
      console.error("Error calling tool:", error)
      throw error
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.client !== null && this.transport !== null
  }

  /**
   * Get the server configuration
   */
  getConfig(): McpServerConfig {
    return this.config
  }

  /**
   * Get the current MCP session ID
   * Returns the session ID assigned by the server after initialization
   */
  getSessionId(): string | undefined {
    return this.sessionId
  }

  private updateStatus(status: McpConnectionStatus, error?: string): void {
    if (this.statusCallback) {
      this.statusCallback(status, error)
    }
  }
}

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

function normalizeMcpEndpointUrl(url: string): string {
  const parsed = safeParseUrl(url)
  if (!parsed) return url

  return parsed.toString()
}

function isLikely405(error: unknown): boolean {
  if (!error) return false

  const status = getErrorStatus(error)
  if (typeof status === "number" && status === 405) return true

  const message = getErrorMessage(error)

  return /\b405\b/i.test(message) || /method not allowed/i.test(message)
}

function formatConnectError(error: unknown, configuredUrl: string): string {
  const baseMessage = error instanceof Error ? error.message : "Connection failed"

  // Provide a targeted hint for the common case where a server expects /mcp.
  if (isLikely405(error)) {
    const parsed = safeParseUrl(configuredUrl)
    if (parsed && (parsed.pathname === "/" || parsed.pathname === "")) {
      const suggested = normalizeMcpEndpointUrl(configuredUrl)
      return `${baseMessage} (try using the MCP endpoint URL, e.g. ${suggested})`
    }
  }

  return baseMessage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getErrorStatus(error: unknown): unknown {
  if (!isRecord(error)) return undefined

  if ("status" in error) {
    return (error as Record<string, unknown>).status
  }

  const response = (error as Record<string, unknown>).response
  if (isRecord(response) && "status" in response) {
    return (response as Record<string, unknown>).status
  }

  return undefined
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  if (isRecord(error) && typeof error.message === "string") return error.message
  return ""
}

/**
 * Convert MCP tool to Air Agent Tool format
 */
export function mcpToolToAirAgentTool(mcpTool: McpTool, client: McpClient): Tool {
  return {
    definition: {
      type: "function",
      function: {
        name: mcpTool.name,
        description: mcpTool.description,
        parameters: {
          type: "object",
          properties: (mcpTool.inputSchema.properties || {}) as Record<string, {
            type: string
            description?: string
            enum?: string[]
          }>,
          required: mcpTool.inputSchema.required || [],
        },
      },
    },
    executor: async (args: Record<string, unknown>) => {
      try {
        const result = await client.callTool(mcpTool.name, args)
        return {
          success: true,
          result,
        }
      } catch (error) {
        return {
          success: false,
          result: null,
          error: error instanceof Error ? error.message : "MCP tool execution failed",
        }
      }
    },
  }
}
