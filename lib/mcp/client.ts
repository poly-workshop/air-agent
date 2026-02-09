/**
 * MCP Client for browser-side MCP connections
 * 
 * This provides a simplified interface for connecting to MCP servers
 * from the browser using HTTP/SSE transport.
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

  constructor(
    config: McpServerConfig,
    statusCallback?: (status: McpConnectionStatus, error?: string) => void
  ) {
    this.config = config
    this.statusCallback = statusCallback
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

      // Get session ID from URL query parameters if available (for GitHub Pages static deployment)
      const sessionId = getSessionIdFromUrl()

      // Create Streamable HTTP transport
      // MCD's MCP doc uses the origin URL directly (e.g. https://mcp.mcd.cn).
      // Some deployments may respond 405 for GET /; we treat that as ignorable.
      const effectiveUrl = normalizeMcpEndpointUrl(this.config.url)
      this.transport = new StreamableHTTPClientTransport(new URL(effectiveUrl), {
        requestInit: {
          headers,
        },
        // Pass session ID if available from URL
        ...(sessionId ? { sessionId } : {}),
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
      } catch (error) {
        // Some MCP reverse proxies (and MCD's MCP origin) may return 405 to a GET probe
        // while still being usable for Streamable HTTP requests. Ignore 405 to prevent
        // noisy error state + reconnect loops.
        if (isLikely405(error)) {
          this.updateStatus("connected")
          // Store session ID after successful connection (even for 405 case)
          this.storeSessionId()
          return
        }
        throw error
      }
      this.updateStatus("connected")
      // Store session ID after successful connection
      this.storeSessionId()
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
    return this.transport?.sessionId
  }

  /**
   * Store the session ID after connection
   * This updates the URL with the session ID for persistence across page reloads
   */
  private storeSessionId(): void {
    const sessionId = this.transport?.sessionId
    if (sessionId && typeof window !== "undefined") {
      try {
        // Update URL with session ID without reloading the page
        const url = new URL(window.location.href)
        url.searchParams.set("mcp-session-id", sessionId)
        window.history.replaceState({}, "", url.toString())
      } catch (error) {
        console.error("Failed to store session ID in URL:", error)
      }
    }
  }

  private updateStatus(status: McpConnectionStatus, error?: string): void {
    if (this.statusCallback) {
      this.statusCallback(status, error)
    }
  }
}

/**
 * Get session ID from URL query parameters
 * Supports reading mcp-session-id from URL for GitHub Pages static deployment
 */
function getSessionIdFromUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined
  }

  try {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get("mcp-session-id") ?? undefined
  } catch {
    return undefined
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
