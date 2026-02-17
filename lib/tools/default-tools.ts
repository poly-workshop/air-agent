/**
 * Example built-in tools
 */

import { Tool, ToolResult } from "./types"
import { getSkillContentForTool, listSkillIndex } from "@/lib/skills"

/**
 * Calculator tool - performs basic arithmetic
 */
export const calculatorTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "calculator",
      description: "Performs basic arithmetic calculations (add, subtract, multiply, divide)",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            description: "The operation to perform",
            enum: ["add", "subtract", "multiply", "divide"],
          },
          a: {
            type: "number",
            description: "First number",
          },
          b: {
            type: "number",
            description: "Second number",
          },
        },
        required: ["operation", "a", "b"],
      },
    },
  },
  executor: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const { operation, a, b } = args

    // Validate required parameters
    if (!operation || typeof operation !== "string") {
      return {
        success: false,
        result: null,
        error: "Operation parameter is required and must be a string",
      }
    }

    if (typeof a !== "number" || typeof b !== "number") {
      return {
        success: false,
        result: null,
        error: "Both a and b must be numbers",
      }
    }

    // Validate operation is one of the allowed values
    if (!["add", "subtract", "multiply", "divide"].includes(operation)) {
      return {
        success: false,
        result: null,
        error: `Invalid operation: ${operation}. Must be one of: add, subtract, multiply, divide`,
      }
    }

    let result: number
    switch (operation) {
      case "add":
        result = a + b
        break
      case "subtract":
        result = a - b
        break
      case "multiply":
        result = a * b
        break
      case "divide":
        if (b === 0) {
          return {
            success: false,
            result: null,
            error: "Cannot divide by zero",
          }
        }
        result = a / b
        break
      default:
        return {
          success: false,
          result: null,
          error: `Unknown operation: ${operation}`,
        }
    }

    return {
      success: true,
      result,
    }
  },
}

/**
 * Get current time tool
 */
export const getCurrentTimeTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "get_current_time",
      description: "Gets the current date and time",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "Timezone (optional, defaults to UTC)",
          },
        },
        required: [],
      },
    },
  },
  executor: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const timezone = (args.timezone as string) || "UTC"
    
    try {
      const now = new Date()
      const timeString = now.toLocaleString("en-US", { 
        timeZone: timezone 
      })
      
      return {
        success: true,
        result: {
          timestamp: now.toISOString(),
          formatted: timeString,
          timezone,
        },
      }
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : "Failed to get time",
      }
    }
  },
}

/**
 * List local skill metadata (compact index only)
 */
export const listSkillsTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "list_skills",
      description: "Lists available local skills as compact metadata (without full content)",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  executor: async (): Promise<ToolResult> => {
    try {
      const skills = await listSkillIndex()
      return {
        success: true,
        result: skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          summary: skill.summary,
          tags: skill.tags,
          version: skill.version,
          sizeHint: skill.sizeHint,
        })),
      }
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : "Failed to list skills",
      }
    }
  },
}

/**
 * Retrieve skill content on demand
 */
export const getSkillContentTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "get_skill_content",
      description: "Fetches the content of one local skill by id with optional character limit",
      parameters: {
        type: "object",
        properties: {
          skill_id: {
            type: "string",
            description: "Skill identifier from list_skills",
          },
          max_chars: {
            type: "number",
            description: "Optional max returned characters (300-12000, default 4000)",
          },
        },
        required: ["skill_id"],
      },
    },
  },
  executor: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const skillId = args.skill_id
    const maxChars = args.max_chars

    if (typeof skillId !== "string" || !skillId.trim()) {
      return {
        success: false,
        result: null,
        error: "skill_id is required and must be a non-empty string",
      }
    }

    if (maxChars !== undefined && typeof maxChars !== "number") {
      return {
        success: false,
        result: null,
        error: "max_chars must be a number when provided",
      }
    }

    try {
      const content = await getSkillContentForTool({
        skillId,
        maxChars: typeof maxChars === "number" ? maxChars : undefined,
      })

      if (!content) {
        return {
          success: false,
          result: null,
          error: `Skill '${skillId}' not found`,
        }
      }

      return {
        success: true,
        result: content,
      }
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : "Failed to retrieve skill content",
      }
    }
  },
}

/**
 * Get all default tools
 */
export function getDefaultTools(): Tool[] {
  return [calculatorTool, getCurrentTimeTool, listSkillsTool, getSkillContentTool]
}

export function getDefaultToolNames(): string[] {
  return getDefaultTools().map((tool) => tool.definition.function.name)
}
