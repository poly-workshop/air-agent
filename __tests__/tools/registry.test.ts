import { describe, expect, it } from "vitest"
import { ToolRegistry, Tool } from "@/lib/tools"

describe("ToolRegistry batch execution", () => {
  it("returns batch results in the same order as input calls", async () => {
    const registry = new ToolRegistry()

    const uppercaseTool: Tool = {
      definition: {
        type: "function",
        function: {
          name: "uppercase",
          description: "uppercase a string",
          parameters: {
            type: "object",
            properties: {
              value: { type: "string" },
            },
            required: ["value"],
          },
        },
      },
      executor: async (args) => ({
        success: true,
        result: String(args.value).toUpperCase(),
      }),
    }

    const addTool: Tool = {
      definition: {
        type: "function",
        function: {
          name: "add",
          description: "add two numbers",
          parameters: {
            type: "object",
            properties: {
              a: { type: "number" },
              b: { type: "number" },
            },
            required: ["a", "b"],
          },
        },
      },
      executor: async (args) => ({
        success: true,
        result: Number(args.a) + Number(args.b),
      }),
    }

    registry.registerTool(uppercaseTool)
    registry.registerTool(addTool)

    const results = await registry.executeToolsBatch([
      { name: "add", args: { a: 1, b: 2 }, toolCallId: "tool-1" },
      { name: "uppercase", args: { value: "batch" }, toolCallId: "tool-2" },
    ])

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({
      name: "add",
      toolCallId: "tool-1",
      result: { success: true, result: 3 },
    })
    expect(results[1]).toMatchObject({
      name: "uppercase",
      toolCallId: "tool-2",
      result: { success: true, result: "BATCH" },
    })
  })

  it("isolates failures per item in batch", async () => {
    const registry = new ToolRegistry()

    const failTool: Tool = {
      definition: {
        type: "function",
        function: {
          name: "fail_once",
          description: "always fails",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      executor: async () => {
        throw new Error("boom")
      },
    }

    const okTool: Tool = {
      definition: {
        type: "function",
        function: {
          name: "ok",
          description: "always ok",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      executor: async () => ({
        success: true,
        result: "ok",
      }),
    }

    registry.registerTool(failTool)
    registry.registerTool(okTool)

    const results = await registry.executeToolsBatch([
      { name: "fail_once", args: {} },
      { name: "missing_tool", args: {} },
      { name: "ok", args: {} },
    ])

    expect(results[0].result).toMatchObject({ success: false, result: null, error: "boom" })
    expect(results[1].result).toMatchObject({
      success: false,
      result: null,
      error: 'Tool "missing_tool" not found',
    })
    expect(results[2].result).toMatchObject({ success: true, result: "ok" })
  })

  it("starts tool executions concurrently in a batch", async () => {
    const registry = new ToolRegistry()
    const started: string[] = []

    let releaseGate: () => void
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve
    })

    const makeGatedTool = (name: string): Tool => ({
      definition: {
        type: "function",
        function: {
          name,
          description: "gated tool",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      executor: async () => {
        started.push(name)
        await gate
        return { success: true, result: name }
      },
    })

    registry.registerTool(makeGatedTool("first"))
    registry.registerTool(makeGatedTool("second"))

    const batchPromise = registry.executeToolsBatch([
      { name: "first", args: {} },
      { name: "second", args: {} },
    ])

    await Promise.resolve()
    expect(started.sort()).toEqual(["first", "second"])

    releaseGate()
    const results = await batchPromise

    expect(results.map((item) => item.result.success)).toEqual([true, true])
  })
})
