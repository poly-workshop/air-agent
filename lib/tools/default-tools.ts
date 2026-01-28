/**
 * Example built-in tools
 */

import { Tool, ToolResult } from "./types"

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

    if (typeof a !== "number" || typeof b !== "number") {
      return {
        success: false,
        result: null,
        error: "Both a and b must be numbers",
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
        timeZone: timezone === "UTC" ? "UTC" : timezone 
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
 * Weather simulation tool (mock data for demonstration)
 */
export const getWeatherTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "get_weather",
      description: "Gets the current weather for a location (mock data for demonstration)",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City name or location",
          },
        },
        required: ["location"],
      },
    },
  },
  executor: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const { location } = args
    
    // Mock weather data
    const mockWeather = {
      location,
      temperature: Math.floor(Math.random() * 30) + 10, // 10-40°C
      conditions: ["Sunny", "Cloudy", "Rainy", "Partly Cloudy"][Math.floor(Math.random() * 4)],
      humidity: Math.floor(Math.random() * 40) + 30, // 30-70%
      wind_speed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
      note: "This is mock data for demonstration purposes",
    }
    
    return {
      success: true,
      result: mockWeather,
    }
  },
}

/**
 * Get all default tools
 */
export function getDefaultTools(): Tool[] {
  return [calculatorTool, getCurrentTimeTool, getWeatherTool]
}
