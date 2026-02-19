import "fake-indexeddb/auto"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import {
  buildSkillIndexPromptBlock,
  clearSkillsIndexedDbCacheForTests,
  getSkillContentById,
  getSkillContentForTool,
  installSkillFromJson,
  listInstalledSkills,
  listSkillIndex,
  resetSkillsStoreForTests,
  uninstallInstalledSkill,
} from "@/lib/skills"

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock })

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
    localStorageMock.clear()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
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

  it("installs custom skill and merges it into index", async () => {
    const entry = await installSkillFromJson(
      JSON.stringify({
        metadata: {
          id: "custom-style",
          name: "Custom Style",
          summary: "User installed skill package",
          tags: ["custom", "workflow"],
          version: "1.0.0",
        },
        sections: [
          {
            topic: "focus",
            content: "Focus on high-signal implementation details.",
          },
        ],
      })
    )

    expect(entry.file).toBe("installed:custom-style")

    const index = await listSkillIndex()
    expect(index.map((item) => item.id)).toContain("custom-style")

    const installedContent = await getSkillContentById("custom-style")
    expect(installedContent?.version).toBe("1.0.0")
    expect(installedContent?.content).toContain("Focus on high-signal")

    const contentFetchCount = fetchSpy.mock.calls.filter((call: [RequestInfo | URL]) => call[0] === "/skills/custom-style.json").length
    expect(contentFetchCount).toBe(0)
  })

  it("installed skill overrides bundled skill metadata and content by id", async () => {
    await installSkillFromJson(
      JSON.stringify({
        metadata: {
          id: "qwen-coder-style",
          name: "Qwen Coder Style (Installed)",
          summary: "Installed override",
          tags: ["coding", "override"],
          version: "9.9.9",
        },
        content: "Installed content override.",
      })
    )

    const index = await listSkillIndex()
    const overridden = index.find((item) => item.id === "qwen-coder-style")
    expect(overridden?.name).toBe("Qwen Coder Style (Installed)")
    expect(overridden?.version).toBe("9.9.9")
    expect(overridden?.file).toBe("installed:qwen-coder-style")

    const content = await getSkillContentById("qwen-coder-style")
    expect(content?.content).toContain("Installed content override.")
    expect(content?.version).toBe("9.9.9")
  })

  it("lists installed skills only", async () => {
    await installSkillFromJson(
      JSON.stringify({
        metadata: {
          id: "custom-style",
          name: "Custom Style",
          summary: "User installed skill package",
          tags: ["custom", "workflow"],
          version: "1.0.0",
        },
        content: "Custom content",
      })
    )

    const installed = listInstalledSkills()
    expect(installed).toHaveLength(1)
    expect(installed[0].id).toBe("custom-style")
    expect(installed[0].file).toBe("installed:custom-style")
  })

  it("uninstalls installed override and falls back to bundled content", async () => {
    await installSkillFromJson(
      JSON.stringify({
        metadata: {
          id: "qwen-coder-style",
          name: "Qwen Coder Style (Installed)",
          summary: "Installed override",
          tags: ["coding", "override"],
          version: "9.9.9",
        },
        content: "Installed content override.",
      })
    )

    const removed = await uninstallInstalledSkill("qwen-coder-style")
    expect(removed).toBe(true)

    const installed = listInstalledSkills()
    expect(installed).toHaveLength(0)

    const index = await listSkillIndex()
    const bundled = index.find((item) => item.id === "qwen-coder-style")
    expect(bundled?.file).toBe("qwen-coder-style.json")
    expect(bundled?.version).toBe("1.0.0")

    const content = await getSkillContentById("qwen-coder-style")
    expect(content?.version).toBe("1.0.0")
    expect(content?.content).toContain("PLAN")
  })

  it("returns false when uninstall target is not installed", async () => {
    const removed = await uninstallInstalledSkill("qwen-coder-style")
    expect(removed).toBe(false)
  })
})
