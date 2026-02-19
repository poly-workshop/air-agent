/**
 * Tool registry for managing available tools
 */

import { BatchToolCall, BatchToolResult, Tool, ToolDefinition, ToolResult } from "./types"

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  /**
   * Register a new tool
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.definition.function.name, tool)
  }

  /**
   * Get all tool definitions for LLM
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.definition)
  }

  /**
   * Execute a tool by name
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return {
        success: false,
        result: null,
        error: `Tool "${name}" not found`,
      }
    }

    try {
      return await tool.executor(args)
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Execute multiple tools in parallel and return ordered results
   */
  async executeToolsBatch(calls: BatchToolCall[]): Promise<BatchToolResult[]> {
    return Promise.all(
      calls.map(async (call) => ({
        name: call.name,
        toolCallId: call.toolCallId,
        result: await this.executeTool(call.name, call.args),
      }))
    )
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear()
  }
}
