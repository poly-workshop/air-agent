# Tool Call Implementation Guide

## Overview

The Air Agent now supports automatic tool call handling with streaming responses. When the LLM decides to use a tool, the system automatically:

1. Detects tool calls in the streaming response
2. Executes the requested tools
3. Sends tool results back to the LLM
4. Continues streaming the assistant's response
5. Repeats until the conversation completes (no more tool calls)

All of this happens in a single user interaction without manual intervention.

## Architecture

### Core Components

#### 1. Tool Types (`lib/tools/types.ts`)

Defines the type system for tools:

- `ToolDefinition`: OpenAI-compatible function definition
- `ToolExecutor`: Async function that executes a tool
- `Tool`: Combines definition and executor
- `ToolCall`: Tool call from LLM response
- `ChatMessage`: Extended message format with tool support

#### 2. Tool Registry (`lib/tools/registry.ts`)

Central registry for managing tools:

```typescript
const registry = new ToolRegistry()

// Register a tool
registry.registerTool(myTool)

// Get all definitions for LLM
const definitions = registry.getToolDefinitions()

// Execute a tool
const result = await registry.executeTool(name, args)
```

#### 3. AI SDK Service (`lib/ai-sdk.ts`)

Handles streaming and automatic tool execution:

```typescript
const aiSdk = new AiSdkService({
  apiKey: "your-api-key",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  toolRegistry: registry,
  onStreamChunk: (chunk) => {
    // Handle streaming chunks
  },
})

const messages = await aiSdk.sendMessage(chatMessages)
```

## Creating Custom Tools

### Basic Tool Example

```typescript
import { Tool, ToolResult } from "@/lib/tools"

export const myCustomTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "my_custom_tool",
      description: "Description of what this tool does",
      parameters: {
        type: "object",
        properties: {
          param1: {
            type: "string",
            description: "Description of param1",
          },
          param2: {
            type: "number",
            description: "Description of param2",
          },
        },
        required: ["param1"],
      },
    },
  },
  executor: async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      const param1 = args.param1 as string
      const param2 = (args.param2 as number) || 0
      
      // Your tool logic here
      const result = doSomething(param1, param2)
      
      return {
        success: true,
        result,
      }
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  },
}
```

### Registering Tools

To make tools available to the AI:

```typescript
import { ToolRegistry, getDefaultTools } from "@/lib/tools"
import { myCustomTool } from "./my-custom-tool"

const registry = new ToolRegistry()

// Register default tools
getDefaultTools().forEach((tool) => registry.registerTool(tool))

// Register custom tool
registry.registerTool(myCustomTool)
```

## Built-in Tools

### Calculator

Performs basic arithmetic operations:

```typescript
// Example usage in chat:
"What is 15 multiplied by 23?"
// The LLM will call: calculator({ operation: "multiply", a: 15, b: 23 })
// Result: 345
```

### Get Current Time

Returns current date and time:

```typescript
// Example usage in chat:
"What time is it in New York?"
// The LLM will call: get_current_time({ timezone: "America/New_York" })
```

## MCP (Model Context Protocol) Compatibility

The tool architecture is designed to be MCP-compatible:

### Key Features

- **Standardized Interface**: Tools follow a consistent definition and execution pattern
- **Async Execution**: All tools are asynchronous
- **Result Format**: Standardized success/error result format
- **Extensible**: Easy to add new tool providers

### Adding MCP Tools

To integrate MCP tools:

```typescript
import { Tool } from "@/lib/tools"

// Wrap MCP tool in our Tool interface
export function wrapMcpTool(mcpTool: McpToolDefinition): Tool {
  return {
    definition: {
      type: "function",
      function: {
        name: mcpTool.name,
        description: mcpTool.description,
        parameters: mcpTool.inputSchema,
      },
    },
    executor: async (args) => {
      try {
        const result = await executeMcpTool(mcpTool, args)
        return {
          success: true,
          result,
        }
      } catch (error) {
        return {
          success: false,
          result: null,
          error: error instanceof Error ? error.message : "MCP tool failed",
        }
      }
    },
  }
}
```

## Error Handling

### Tool Execution Errors

Tools should handle errors gracefully:

```typescript
executor: async (args) => {
  try {
    // Tool logic
    return { success: true, result: ... }
  } catch (error) {
    return {
      success: false,
      result: null,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
```

### API Errors

The AI SDK service handles API errors and propagates them to the UI:

- Network errors
- Authentication errors
- Rate limiting
- Invalid responses

### Tool Loop Limits

To prevent infinite loops, the system limits tool iterations:

```typescript
maxToolIterations: 5 // Default, configurable
```

## Streaming Behavior

### Content Streaming

- Content streams character-by-character as the LLM generates it
- UI updates in real-time for better UX

### Tool Call Detection

- Tool calls are detected during streaming
- Visual indicator shows which tools are being executed
- Tool results are automatically sent back to the LLM

### Multi-turn Tool Calls

The system automatically handles multi-turn conversations:

1. User sends message
2. LLM responds with tool calls → Tools execute → Results sent back
3. LLM responds with more tool calls → Tools execute → Results sent back
4. LLM responds with final answer (no tool calls)
5. Conversation complete

## UI Indicators

### Tool Call Badges

- Assistant messages show badges for each tool called
- Active tool calls display a loading indicator

### Tool Results

- Tool results are shown in a distinct style
- Results include the tool name and output

### Streaming Indicators

- Loading spinner during initial response
- Tool execution indicators during tool calls

## Best Practices

### Tool Design

1. **Single Responsibility**: Each tool should do one thing well
2. **Clear Descriptions**: Help the LLM understand when to use the tool
3. **Validate Input**: Always validate and type-check arguments
4. **Handle Errors**: Return meaningful error messages
5. **Fast Execution**: Keep tools responsive (< 5 seconds ideal)

### Security

1. **Validate Input**: Never trust tool arguments blindly
2. **Rate Limiting**: Implement rate limits for expensive operations
3. **Sandboxing**: Isolate tool execution when possible
4. **No Secrets**: Never expose API keys or credentials in tool results

### Testing

1. Test tools independently
2. Test error cases
3. Test with real LLM interactions
4. Monitor tool usage patterns

## Troubleshooting

### Tools Not Being Called

- Check tool descriptions are clear
- Verify tool is registered in registry
- Check console for errors

### Infinite Tool Loops

- Review tool descriptions (LLM might misunderstand)
- Check maxToolIterations limit
- Add better error handling in tools

### Streaming Issues

- Verify API supports streaming
- Check network connectivity
- Review browser console for errors

## Example: Complete Custom Tool Implementation

```typescript
// tools/search-web.ts
import { Tool, ToolResult } from "@/lib/tools"

export const searchWebTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "search_web",
      description: "Searches the web for information about a query",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query",
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 5)",
          },
        },
        required: ["query"],
      },
    },
  },
  executor: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const query = args.query as string
    const limit = (args.limit as number) || 5

    if (!query || query.trim().length === 0) {
      return {
        success: false,
        result: null,
        error: "Query cannot be empty",
      }
    }

    try {
      // Your search implementation
      const results = await performWebSearch(query, limit)
      
      return {
        success: true,
        result: {
          query,
          results,
          count: results.length,
        },
      }
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : "Search failed",
      }
    }
  },
}

// Register in your app
// components/chat-interface.tsx
const [toolRegistry] = React.useState(() => {
  const registry = new ToolRegistry()
  getDefaultTools().forEach((tool) => registry.registerTool(tool))
  registry.registerTool(searchWebTool) // Add custom tool
  return registry
})
```

## Session 集成

工具调用结果会作为 Session 消息的一部分持久化到 IndexedDB。具体来说：

- `tool_calls` 字段完整保存在 assistant 消息中
- `role: "tool"` 的工具结果消息独立保存
- 切换 Session 时，工具调用历史完整恢复
- 流式响应期间的工具调用仅在完成后持久化

详见 `lib/session/types.ts` 中的 `SessionMessage` 类型定义。

## Future Enhancements

Potential improvements to consider:

1. **Tool Marketplace**: Allow users to browse and enable tools
2. **Tool Permissions**: User consent before executing certain tools
3. **Tool Analytics**: Track tool usage and performance
4. **Parallel Execution**: Execute multiple independent tools in parallel
5. **Tool Caching**: Cache tool results for repeated calls
6. **Tool Rate Limiting**: Per-tool rate limits
7. **Tool Categories**: Organize tools by category
8. **Tool Testing UI**: Built-in tool testing interface
9. **Tool Documentation**: Auto-generate docs from tool definitions
