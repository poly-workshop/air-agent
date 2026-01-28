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

      // Create Streamable HTTP transport
      this.transport = new StreamableHTTPClientTransport(
        new URL(this.config.url),
        {
          requestInit: {
            headers,
          },
        }
      )

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
      await this.client.connect(this.transport)
      this.updateStatus("connected")
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Connection failed"
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

  private updateStatus(status: McpConnectionStatus, error?: string): void {
    if (this.statusCallback) {
      this.statusCallback(status, error)
    }
  }
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
