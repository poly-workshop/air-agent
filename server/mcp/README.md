# MCP Server Setup

This directory contains the MCP server handler for Air Agent.

## Enabling the MCP Server

The MCP server is **optional** and only available when running in server mode (not static export).

### Development Mode

The MCP server can be enabled by creating the API route:

1. Create the directory:
   ```bash
   mkdir -p app/api/mcp
   ```

2. Create `app/api/mcp/route.ts`:
   ```typescript
   import { handleMcpRequest } from "@/server/mcp/handler"
   
   export const GET = handleMcpRequest
   export const POST = handleMcpRequest
   export const DELETE = handleMcpRequest
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

The MCP server will be available at `http://localhost:3000/api/mcp`

### Production Deployment (Node.js)

To deploy with MCP server support:

1. Ensure the `app/api/mcp/route.ts` file exists (as shown above)

2. Remove or comment out `output: 'export'` from `next.config.ts`

3. Deploy to a Node.js platform (Vercel, Netlify, etc.)

### Static Export (Default)

By default, the app builds for static export (GitHub Pages, etc.) and the MCP server is **not available**.

The handler code exists in `server/mcp/handler.ts` but is not included in the build unless you create the API route as described above.

## Documentation

For complete MCP server documentation, see [MCP_SERVER.md](../../MCP_SERVER.md)
