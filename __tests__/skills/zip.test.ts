import "fake-indexeddb/auto"
import JSZip from "jszip"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearSkillsIndexedDbCacheForTests, getSkillContentById, listSkillIndex, resetSkillsStoreForTests } from "@/lib/skills"
import { installSkillsFromZipFile } from "@/lib/skills/zip"

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

function mockFetchRouter(url: string): Response {
  if (url === "/skills/index.json") {
    return new Response(
      JSON.stringify({
        skills: [
          {
            id: "base-skill",
            name: "Base Skill",
            summary: "Bundled base",
            tags: ["base"],
            version: "1.0.0",
            sizeHint: 100,
            file: "base-skill.json",
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  if (url === "/skills/base-skill.json") {
    return new Response(
      JSON.stringify({
        id: "base-skill",
        version: "1.0.0",
        content: "Bundled base content",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  return new Response("Not Found", { status: 404 })
}

async function createZipWithEntries(entries: Array<{ path: string; content: string }>): Promise<Uint8Array> {
  const zip = new JSZip()
  for (const entry of entries) {
    zip.file(entry.path, entry.content)
  }
  return zip.generateAsync({ type: "uint8array" })
}

describe("skills zip install", () => {
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

  it("installs multiple skills from one zip", async () => {
    const zipBlob = await createZipWithEntries([
      {
        path: "skills/custom-a.json",
        content: JSON.stringify({
          metadata: {
            id: "custom-a",
            name: "Custom A",
            summary: "First custom skill",
            tags: ["custom"],
            version: "1.0.0",
          },
          content: "Custom A content",
        }),
      },
      {
        path: "skills/custom-b.json",
        content: JSON.stringify({
          metadata: {
            id: "custom-b",
            name: "Custom B",
            summary: "Second custom skill",
            tags: ["custom"],
            version: "1.0.0",
          },
          sections: [
            {
              topic: "guide",
              content: "Custom B guide",
            },
          ],
        }),
      },
      {
        path: "README.txt",
        content: "ignored",
      },
    ])

    const installed = await installSkillsFromZipFile(zipBlob)
    expect(installed).toHaveLength(2)

    const index = await listSkillIndex()
    expect(index.map((entry) => entry.id)).toContain("custom-a")
    expect(index.map((entry) => entry.id)).toContain("custom-b")

    const contentA = await getSkillContentById("custom-a")
    const contentB = await getSkillContentById("custom-b")
    expect(contentA?.content).toContain("Custom A content")
    expect(contentB?.content).toContain("Custom B guide")

    const customFetchCalls = fetchSpy.mock.calls.filter((call: [RequestInfo | URL]) => {
      const url = typeof call[0] === "string" ? call[0] : call[0].toString()
      return url.includes("custom-a") || url.includes("custom-b")
    })
    expect(customFetchCalls).toHaveLength(0)
  })

  it("fails when zip contains no skill files", async () => {
    const zipBlob = await createZipWithEntries([
      {
        path: "note.txt",
        content: "no skills",
      },
    ])

    await expect(installSkillsFromZipFile(zipBlob)).rejects.toThrow("No skill file (.json or .md) found in zip")
  })

  it("installs markdown skills from zip", async () => {
    const md = [
      "# My Coding Style",
      "",
      "A style guide for writing code.",
      "",
      "## naming",
      "",
      "Use camelCase for variables and PascalCase for types.",
      "",
      "## formatting",
      "",
      "Use 2-space indentation. Max line length is 100.",
    ].join("\n")

    const zipBlob = await createZipWithEntries([
      { path: "my-coding-style.md", content: md },
    ])

    const installed = await installSkillsFromZipFile(zipBlob)
    expect(installed).toHaveLength(1)
    expect(installed[0].id).toBe("my-coding-style")
    expect(installed[0].name).toBe("My Coding Style")

    const doc = await getSkillContentById("my-coding-style")
    expect(doc).not.toBeNull()
    // preamble is NOT a section, only ## headings are
    expect(doc!.sections).toHaveLength(2)
    expect(doc!.sections![0].topic).toBe("naming")
    expect(doc!.sections![1].topic).toBe("formatting")
    expect(doc!.content).toContain("style guide")
    expect(doc!.content).toContain("camelCase")
  })

  it("installs mixed json and markdown skills from zip", async () => {
    const jsonContent = JSON.stringify({
      metadata: {
        id: "json-skill",
        name: "JSON Skill",
        summary: "From JSON",
        tags: ["json"],
        version: "2.0.0",
      },
      content: "JSON skill content",
    })

    const mdContent = [
      "# Markdown Skill",
      "",
      "A skill from markdown.",
      "",
      "## tips",
      "",
      "Tip content here.",
    ].join("\n")

    const zipBlob = await createZipWithEntries([
      { path: "skills/json-skill.json", content: jsonContent },
      { path: "guides/markdown-skill.md", content: mdContent },
      { path: "README.md", content: "# Readme\n\nIgnored? No — this is a valid .md" },
    ])

    const installed = await installSkillsFromZipFile(zipBlob)
    // json-skill + markdown-skill + readme (all .md/.json are processed)
    expect(installed.length).toBeGreaterThanOrEqual(2)

    const index = await listSkillIndex()
    expect(index.map((e) => e.id)).toContain("json-skill")
    expect(index.map((e) => e.id)).toContain("markdown-skill")
  })

  it("installs frontmatter markdown with folder-based id", async () => {
    const md = [
      "---",
      "name: verify",
      "description: Validate changes before committing.",
      "tags: [ci, testing]",
      "---",
      "",
      "# Verification",
      "",
      "Run all verification steps.",
      "",
      "## Instructions",
      "",
      "1. Run lint",
      "2. Run tests",
    ].join("\n")

    const zipBlob = await createZipWithEntries([
      { path: "verify/SKILL.md", content: md },
    ])

    const installed = await installSkillsFromZipFile(zipBlob)
    expect(installed).toHaveLength(1)
    expect(installed[0].id).toBe("verify")
    expect(installed[0].name).toBe("verify")
    expect(installed[0].summary).toBe("Validate changes before committing.")
    expect(installed[0].tags).toEqual(["ci", "testing"])

    const doc = await getSkillContentById("verify")
    expect(doc).not.toBeNull()
    // preamble is NOT a section
    expect(doc!.sections).toHaveLength(1)
    expect(doc!.sections![0].topic).toBe("Instructions")
    expect(doc!.content).toContain("Run lint")
    expect(doc!.content).toContain("Run all verification steps.")
  })
})
