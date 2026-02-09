# MCP Server Documentation

This document provides comprehensive information about the Model Context Protocol (MCP) server implementation in Air Agent.

## Overview

Air Agent includes a built-in MCP server that exposes tools and resources via the MCP HTTP transport protocol. This allows MCP-compliant clients to connect to Air Agent and use its capabilities.

**Important:** The MCP server requires a Node.js runtime and is **not available in static export mode** (the default build). To enable the MCP server, you need to:
1. Create the API route manually (see instructions below)
2. Run in development mode OR deploy to a Node.js platform

## Enabling the MCP Server

### Quick Setup

1. **Create the API route directory:**
   ```bash
   mkdir -p app/api/mcp
   ```

2. **Create `app/api/mcp/route.ts` with the following content:**
   ```typescript
   import { handleMcpRequest } from "@/server/mcp/handler"
   
   export const GET = handleMcpRequest
   export const POST = handleMcpRequest
   export const DELETE = handleMcpRequest
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

The MCP server will now be available at: `http://localhost:3000/api/mcp`

### Why This Setup?

By default, Air Agent builds as a **static site** for GitHub Pages deployment. API routes cannot be included in static builds. The MCP server handler code exists in `server/mcp/handler.ts`, but you must manually create the API route to activate it.

This design allows you to:
- Deploy as a static site (default, no MCP server)
- Enable the MCP server when needed (development or Node.js platforms)

### Production Deployment (Node.js)

To deploy with MCP server support:

1. Create the API route as shown above
2. Do NOT set `STATIC_EXPORT=true` (leave it unset or false)
3. Deploy to a Node.js platform (Vercel, Netlify, Railway, etc.)

```bash
npm run build
npm run start
```

### Static Export (No MCP Server)

For static deployment (GitHub Pages, S3, etc.), you need to remove the API route before building:

```bash
# Remove the API route (if it exists)
rm -rf app/api/mcp

# Build for static export
STATIC_EXPORT=true npm run build
```

The static export will work but `/api/mcp` will not be available. The client-side MCP functionality (connecting to external MCP servers) will still work.

**Important:** The API route is intentionally NOT included in the repository by default. You need to create it manually when you want to enable the MCP server. This prevents issues with static builds.

## MCP HTTP Transport

The server implements the [MCP HTTP transport specification](https://github.com/modelcontextprotocol/specification) with full session management support.

### Endpoint

The MCP server is available at:
```
POST /api/mcp
GET /api/mcp
DELETE /api/mcp
```

### Session Management

The MCP server uses **stateful session management** as defined in the MCP specification:

#### Session Lifecycle

1. **Initialize Session** - Client sends an `initialize` request (POST)
   - Server generates a unique session ID
   - Server responds with session ID in `mcp-session-id` header
   - Client must store and use this session ID for all subsequent requests

2. **Use Session** - Client sends requests with session ID
   - Client MUST include `mcp-session-id` header in all requests
   - Server validates session ID before processing requests
   - Server maintains session state in memory

3. **Close Session** - Client sends DELETE request
   - Client includes `mcp-session-id` header
   - Server cleans up session resources
   - Session ID becomes invalid after closure

### Required Headers

#### For Initialization (POST with `initialize` method)
```
Content-Type: application/json
```

#### For Subsequent Requests (POST, GET, DELETE)
```
Content-Type: application/json (for POST)
Mcp-Session-Id: <your-session-id>
```

#### For SSE Streaming (GET)
```
Accept: text/event-stream
Mcp-Session-Id: <your-session-id>
```

## Error Handling

The server provides descriptive error messages that comply with JSON-RPC 2.0 and the MCP specification.

### Common Errors

#### Missing Session Header (Code: -32000, Status: 400)
**Error Message:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Bad Request: Mcp-Session-Id header is required. Please initialize a session first by sending an 'initialize' request."
  },
  "id": null
}
```

**Cause:** Client attempted a non-initialization request without including the `mcp-session-id` header.

**Solution:** 
1. First, send an initialization request (see example below)
2. Extract the `mcp-session-id` from the response headers
3. Include this header in all subsequent requests

#### Session Not Found (Code: -32001, Status: 404)
**Error Message:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Session not found. The session '<session-id>' does not exist or has expired. Please initialize a new session."
  },
  "id": null
}
```

**Cause:** 
- Client used an invalid or expired session ID
- Session was closed or terminated
- Server restarted (sessions are stored in memory)

**Solution:** Initialize a new session by sending an initialization request.

#### Method Not Allowed (Code: -32000, Status: 405)
**Error Message:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Method <METHOD> is not allowed. Supported methods: GET (SSE streaming), POST (JSON-RPC requests), DELETE (close session)."
  },
  "id": null
}
```

**Cause:** Client used an unsupported HTTP method (e.g., PUT, PATCH).

**Solution:** Use only GET, POST, or DELETE methods as specified.

#### Internal Server Error (Code: -32603, Status: 500)
**Error Message:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Internal server error: <error-details>"
  },
  "id": null
}
```

**Cause:** An unexpected error occurred on the server.

**Solution:** Check server logs for details and report the issue if it persists.

## Usage Examples

### Example 1: Initialize a Session

**Request:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -D - \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "my-mcp-client",
        "version": "1.0.0"
      }
    }
  }'
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: application/json
Mcp-Session-Id: 550e8400-e29b-41d4-a716-446655440000

{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "logging": {}
    },
    "serverInfo": {
      "name": "air-agent-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

**Important:** Save the `Mcp-Session-Id` from the response headers!

### Example 2: List Available Tools

**Request:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "greet",
        "description": "A simple tool that greets a person by name",
        "inputSchema": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "description": "Name of the person to greet"
            }
          },
          "required": ["name"]
        }
      },
      {
        "name": "get_time",
        "description": "Returns the current date and time",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }
    ]
  }
}
```

### Example 3: Call a Tool

**Request:**
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "greet",
      "arguments": {
        "name": "Alice"
      }
    }
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Hello, Alice! Welcome to Air Agent MCP Server."
      }
    ]
  }
}
```

### Example 4: SSE Streaming

For server-sent events (notifications, progress updates):

**Request:**
```bash
curl -X GET http://localhost:3000/api/mcp \
  -H "Accept: text/event-stream" \
  -H "Mcp-Session-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -N
```

**Response:** (SSE stream)
```
event: message
data: {"jsonrpc":"2.0","method":"notifications/initialized"}

event: message  
data: {"jsonrpc":"2.0","method":"notifications/message","params":{"level":"info","logger":"server","data":"Server ready"}}
```

### Example 5: Close Session

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/mcp \
  -H "Mcp-Session-Id: 550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```
HTTP/1.1 200 OK
```

## Available Tools

The server currently provides the following tools:

### greet
Greets a person by name.

**Input:**
- `name` (string, required): Name of the person to greet

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Hello, {name}! Welcome to Air Agent MCP Server."
    }
  ]
}
```

### get_time
Returns the current date and time.

**Input:** None

**Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Current time: 2024-01-15T12:34:56.789Z"
    }
  ]
}
```

## Troubleshooting

### "Invalid or missing MCP session" Error

**Problem:** You're getting an error about invalid or missing MCP session.

**Solutions:**

1. **Check if you've initialized a session:**
   - Send an `initialize` request first
   - Save the `mcp-session-id` from the response headers

2. **Check if you're including the session header:**
   - All requests after initialization MUST include `Mcp-Session-Id` header
   - Header name is case-insensitive but use `Mcp-Session-Id`

3. **Check if your session expired:**
   - Sessions are stored in memory and cleared on server restart
   - Initialize a new session if the old one is invalid

4. **Check your request format:**
   - Ensure you're sending valid JSON-RPC 2.0 requests
   - Verify the `method` field is correct

### CORS Issues

If you're accessing the MCP server from a browser-based client:

1. The server needs to be configured with appropriate CORS headers
2. Consider deploying the client and server on the same domain
3. Or configure Next.js middleware to add CORS headers

### Connection Issues

If you can't connect to the server:

1. Verify the server is running (`npm run dev` or `npm run build && npm start`)
2. Check the port (default: 3000)
3. Ensure no firewall is blocking the connection
4. Check server logs for errors

## Security Considerations

1. **Session IDs are cryptographically secure**
   - Generated using `crypto.randomUUID()`
   - Unique and unpredictable

2. **Session isolation**
   - Each session has its own server instance
   - Sessions cannot interfere with each other

3. **Input validation**
   - Tool inputs are validated using Zod schemas
   - Invalid inputs are rejected

4. **HTTPS recommended**
   - Use HTTPS in production to protect session IDs
   - Session IDs transmitted in headers could be intercepted over HTTP

5. **Session cleanup**
   - Sessions are properly cleaned up on close
   - Memory is freed when sessions end

## Integration with MCP Clients

### TypeScript/JavaScript Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

// Create transport
const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:3000/api/mcp")
)

// Create client
const client = new Client(
  {
    name: "my-client",
    version: "1.0.0",
  },
  {
    capabilities: {},
  }
)

// Connect
await client.connect(transport)

// List tools
const tools = await client.listTools()
console.log(tools)

// Call a tool
const result = await client.callTool({
  name: "greet",
  arguments: { name: "Alice" },
})
console.log(result)

// Close
await client.close()
```

### Python Client

```python
from mcp import Client
from mcp.client.streamable_http import StreamableHTTPTransport

# Create client with transport
async with Client(
    transport=StreamableHTTPTransport("http://localhost:3000/api/mcp")
) as client:
    # Initialize
    await client.initialize()
    
    # List tools
    tools = await client.list_tools()
    print(tools)
    
    # Call a tool
    result = await client.call_tool("greet", {"name": "Alice"})
    print(result)
```

## Extending the Server

To add more tools to the MCP server, edit `server/mcp/handler.ts` and modify the `createMcpServer()` function:

```typescript
function createMcpServer(): McpServer {
  const server = new McpServer(/* ... */)
  
  // Add your custom tool
  server.registerTool(
    "my_custom_tool",
    {
      title: "My Custom Tool",
      description: "Description of what this tool does",
      inputSchema: {
        param1: z.string().describe("Description of param1"),
        param2: z.number().optional().describe("Optional parameter"),
      },
    },
    async ({ param1, param2 }) => {
      // Your tool logic here
      const result = doSomething(param1, param2)
      
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      }
    }
  )
  
  return server
}
```

## References

- [Model Context Protocol Specification](https://github.com/modelcontextprotocol/specification)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
