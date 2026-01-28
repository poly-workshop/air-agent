/**
 * Simple test to verify tool registry and execution
 */

import { ToolRegistry, getDefaultTools } from "../lib/tools"

async function testToolRegistry() {
  console.log("=== Testing Tool Registry ===\n")

  // Create registry and register tools
  const registry = new ToolRegistry()
  getDefaultTools().forEach((tool) => registry.registerTool(tool))

  // Test 1: List registered tools
  console.log("Registered tools:", registry.getToolNames())
  console.log()

  // Test 2: Get tool definitions
  const definitions = registry.getToolDefinitions()
  console.log("Tool definitions count:", definitions.length)
  console.log()

  // Test 3: Execute calculator tool
  console.log("--- Test: Calculator (multiply) ---")
  const calcResult = await registry.executeTool("calculator", {
    operation: "multiply",
    a: 15,
    b: 23,
  })
  console.log("Input: 15 * 23")
  console.log("Result:", calcResult)
  console.log()

  // Test 4: Execute calculator with division by zero
  console.log("--- Test: Calculator (divide by zero) ---")
  const divZeroResult = await registry.executeTool("calculator", {
    operation: "divide",
    a: 10,
    b: 0,
  })
  console.log("Input: 10 / 0")
  console.log("Result:", divZeroResult)
  console.log()

  // Test 5: Execute get_current_time
  console.log("--- Test: Get Current Time ---")
  const timeResult = await registry.executeTool("get_current_time", {})
  console.log("Input: {} (default timezone)")
  console.log("Result:", timeResult)
  console.log()

  // Test 6: Execute get_weather
  console.log("--- Test: Get Weather ---")
  const weatherResult = await registry.executeTool("get_weather", {
    location: "San Francisco",
  })
  console.log("Input: San Francisco")
  console.log("Result:", weatherResult)
  console.log()

  // Test 7: Execute non-existent tool
  console.log("--- Test: Non-existent tool ---")
  const notFoundResult = await registry.executeTool("non_existent_tool", {})
  console.log("Input: non_existent_tool")
  console.log("Result:", notFoundResult)
  console.log()

  console.log("=== All Tests Complete ===")
}

// Run tests
testToolRegistry().catch(console.error)
