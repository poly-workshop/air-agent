import "fake-indexeddb/auto"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import {
  buildSkillIndexPromptBlock,
  clearSkillsIndexedDbCacheForTests,
  getSkillContentById,
  getSkillContentForTool,
  listSkillIndex,
  resetSkillsStoreForTests,
} from "@/lib/skills"

const indexPayload = {
  skills: [
    {
      id: "qwen-coder-style",
      name: "Qwen Coder Style",
      summary: "Structured coding workflow.",
      tags: ["coding", "verification"],
      version: "1.0.0",
      sizeHint: 1500,
      file: "qwen-coder-style.json",
    },
  ],
}

const planningContent = "PLAN ".repeat(420)
const verificationContent = "VERIFY ".repeat(420)

function mockFetchRouter(url: string): Response {
  if (url === "/skills/index.json") {
    return new Response(JSON.stringify(indexPayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (url === "/skills/qwen-coder-style.json") {
    return new Response(
      JSON.stringify({
        id: "qwen-coder-style",
        version: "1.0.0",
        sections: [
          {
            topic: "planning",
            content: planningContent,
          },
          {
            topic: "verification",
            content: verificationContent,
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  return new Response("Not Found", { status: 404 })
}

describe("skills store", () => {
  const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString()
    return mockFetchRouter(url)
  })

  beforeEach(async () => {
    resetSkillsStoreForTests()
    await clearSkillsIndexedDbCacheForTests()
    vi.stubGlobal("fetch", fetchSpy)
    fetchSpy.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("loads compact skill index", async () => {
    const skills = await listSkillIndex()
    expect(skills).toHaveLength(1)
    expect(skills[0].id).toBe("qwen-coder-style")
    expect(skills[0].summary).toBe("Structured coding workflow.")
  })

  it("returns truncated content from tool helper", async () => {
    const result = await getSkillContentForTool({
      skillId: "qwen-coder-style",
      maxChars: 400,
    })

    expect(result).not.toBeNull()
    expect(result?.content.length).toBe(400)
    expect(result?.truncated).toBe(true)
    expect(result?.totalLength).toBeGreaterThan(400)
  })

  it("supports topic-based section retrieval", async () => {
    const result = await getSkillContentForTool({
      skillId: "qwen-coder-style",
      topic: "verify",
      maxChars: 1200,
    })

    expect(result).not.toBeNull()
    expect(result?.topic).toBe("verify")
    expect(result?.matchedTopics).toEqual(["verification"])
    expect(result?.content).toContain("## verification")
    expect(result?.content).not.toContain("## planning")
  })

  it("reuses in-memory cache for repeated skill reads", async () => {
    const first = await getSkillContentById("qwen-coder-style")
    const second = await getSkillContentById("qwen-coder-style")

    expect(first?.content.length).toBeGreaterThan(2000)
    expect(second?.content.length).toBeGreaterThan(2000)

    const indexFetchCount = fetchSpy.mock.calls.filter((call: [RequestInfo | URL]) => call[0] === "/skills/index.json").length
    const contentFetchCount = fetchSpy.mock.calls.filter((call: [RequestInfo | URL]) => call[0] === "/skills/qwen-coder-style.json").length

    expect(indexFetchCount).toBe(1)
    expect(contentFetchCount).toBe(1)
  })

  it("builds prompt block from index metadata", async () => {
    const prompt = await buildSkillIndexPromptBlock()

    expect(prompt).toContain("Available local skills index")
    expect(prompt).toContain("qwen-coder-style")
    expect(prompt).toContain("get_skill_content")
    expect(prompt).toContain("topic")
  })
})
