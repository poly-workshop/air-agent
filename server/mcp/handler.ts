import { NextRequest } from "next/server"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import * as z from "zod/v4"

// Store active servers by session ID
const activeSessions = new Map<
  string,
  { server: McpServer; transport: WebStandardStreamableHTTPServerTransport }
>()

/**
 * Create a new MCP server instance with tools and resources
 */
function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "air-agent-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        logging: {},
      },
    }
  )

  // Register a simple greeting tool as an example
  server.registerTool(
    "greet",
    {
      title: "Greeting Tool",
      description: "A simple tool that greets a person by name",
      inputSchema: {
        name: z.string().describe("Name of the person to greet"),
      },
    },
    async ({ name }) => {
      return {
        content: [
          {
            type: "text",
            text: `Hello, ${name}! Welcome to Air Agent MCP Server.`,
          },
        ],
      }
    }
  )

  // Register a tool to get current time
  server.registerTool(
    "get_time",
    {
      title: "Get Current Time",
      description: "Returns the current date and time",
      inputSchema: {},
    },
    async () => {
      const now = new Date()
      return {
        content: [
          {
            type: "text",
            text: `Current time: ${now.toISOString()}`,
          },
        ],
      }
    }
  )

  return server
}

/**
 * Generate a cryptographically secure session ID
 */
function generateSessionId(): string {
  // Use crypto.randomUUID() for secure session IDs
  return crypto.randomUUID()
}

/**
 * Clean up a session
 */
async function cleanupSession(sessionId: string) {
  const session = activeSessions.get(sessionId)
  if (session) {
    try {
      await session.transport.close()
      await session.server.close()
    } catch (error) {
      console.error(`Error cleaning up session ${sessionId}:`, error)
    }
    activeSessions.delete(sessionId)
  }
}

/**
 * Handle all MCP requests (GET, POST, DELETE)
 * This follows the MCP HTTP transport specification
 */
export async function handleMcpRequest(req: NextRequest): Promise<Response> {
  const method = req.method

  try {
    // Create or get transport for this session
    const sessionId = req.headers.get("mcp-session-id")
    const existingSession = sessionId ? activeSessions.get(sessionId) : null

    // For initialization requests, create a new server instance
    if (method === "POST") {
      const body = await req.json()

      // Check if this is an initialization request
      const isInitialization =
        body?.method === "initialize" ||
        (Array.isArray(body) &&
          body.some((msg: { method?: string }) => msg?.method === "initialize"))

      if (isInitialization) {
        // Create new server and transport for this session
        const server = createMcpServer()
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: generateSessionId,
          onsessioninitialized: async (newSessionId: string) => {
            console.log(`Session initialized: ${newSessionId}`)
            // Store the session
            activeSessions.set(newSessionId, { server, transport })
          },
          onsessionclosed: async (closedSessionId: string) => {
            console.log(`Session closed: ${closedSessionId}`)
            await cleanupSession(closedSessionId)
          },
        })

        // Connect server to transport
        await server.connect(transport)

        // Handle the request with the transport
        return await transport.handleRequest(req, { parsedBody: body })
      } else {
        // Non-initialization POST request
        if (!existingSession) {
          // No session found - need to provide helpful error message
          if (!sessionId) {
            return new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                error: {
                  code: -32000,
                  message:
                    "Bad Request: Mcp-Session-Id header is required. Please initialize a session first by sending an 'initialize' request.",
                },
                id: null,
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            )
          } else {
            return new Response(
              JSON.stringify({
                jsonrpc: "2.0",
                error: {
                  code: -32001,
                  message: `Session not found. The session '${sessionId}' does not exist or has expired. Please initialize a new session.`,
                },
                id: null,
              }),
              {
                status: 404,
                headers: { "Content-Type": "application/json" },
              }
            )
          }
        }

        // Use existing session's transport
        return await existingSession.transport.handleRequest(req, {
          parsedBody: body,
        })
      }
    } else if (method === "GET") {
      // GET requests are for SSE streaming
      if (!sessionId) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message:
                "Bad Request: Mcp-Session-Id header is required for SSE streaming. Please initialize a session first.",
            },
            id: null,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      if (!existingSession) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32001,
              message: `Session not found. The session '${sessionId}' does not exist or has expired. Please initialize a new session.`,
            },
            id: null,
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      // Handle GET request with existing session
      return await existingSession.transport.handleRequest(req)
    } else if (method === "DELETE") {
      // DELETE closes a session
      if (!sessionId) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message:
                "Bad Request: Mcp-Session-Id header is required to close a session.",
            },
            id: null,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      if (!existingSession) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -32001,
              message: `Session not found. The session '${sessionId}' does not exist or has expired.`,
            },
            id: null,
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      // Handle DELETE request
      return await existingSession.transport.handleRequest(req)
    } else {
      // Unsupported method
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: `Method ${method} is not allowed. Supported methods: GET (SSE streaming), POST (JSON-RPC requests), DELETE (close session).`,
          },
          id: null,
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            Allow: "GET, POST, DELETE",
          },
        }
      )
    }
  } catch (error) {
    console.error("Error handling MCP request:", error)
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message:
            error instanceof Error
              ? `Internal server error: ${error.message}`
              : "Internal server error",
        },
        id: null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
