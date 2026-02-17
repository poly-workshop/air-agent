import { describe, expect, it } from "vitest"
import { parseMarkdownSkill } from "@/lib/skills/markdown"

describe("parseMarkdownSkill", () => {
  it("parses h1 as name and h2 as sections", () => {
    const md = [
      "# My Skill",
      "",
      "This is the summary.",
      "",
      "## setup",
      "",
      "Install dependencies first.",
      "",
      "## usage",
      "",
      "Call the main function.",
    ].join("\n")

    const pkg = parseMarkdownSkill(md, "my-skill.md")

    expect(pkg.metadata.id).toBe("my-skill")
    expect(pkg.metadata.name).toBe("My Skill")
    expect(pkg.metadata.summary).toBe("This is the summary.")
    expect(pkg.metadata.version).toBe("1.0.0")
    expect(pkg.metadata.tags).toEqual([])
    // preamble "This is the summary." becomes implicit first section
    expect(pkg.sections).toHaveLength(3)
    expect(pkg.sections![0].topic).toBe("My Skill")
    expect(pkg.sections![0].content).toBe("This is the summary.")
    expect(pkg.sections![1].topic).toBe("setup")
    expect(pkg.sections![1].content).toBe("Install dependencies first.")
    expect(pkg.sections![2].topic).toBe("usage")
    expect(pkg.sections![2].content).toBe("Call the main function.")
    // full body content is always set
    expect(pkg.content).toContain("This is the summary.")
    expect(pkg.content).toContain("Install dependencies first.")
  })

  it("uses filename as name when no h1", () => {
    const md = "## only section\n\nSome content."
    const pkg = parseMarkdownSkill(md, "fallback-name.md")
    expect(pkg.metadata.name).toBe("fallback-name")
    expect(pkg.metadata.id).toBe("fallback-name")
    expect(pkg.sections).toHaveLength(1)
    expect(pkg.sections![0].topic).toBe("only section")
  })

  it("falls back to flat content when no h2 headers", () => {
    const md = [
      "# Flat Skill",
      "",
      "Just some content without sections.",
      "",
      "More content here.",
    ].join("\n")

    const pkg = parseMarkdownSkill(md, "flat.md")
    expect(pkg.metadata.name).toBe("Flat Skill")
    expect(pkg.sections).toBeUndefined()
    expect(pkg.content).toContain("Just some content without sections.")
    expect(pkg.content).toContain("More content here.")
  })

  it("throws on empty markdown", () => {
    expect(() => parseMarkdownSkill("", "empty.md")).toThrow("has no content")
  })

  it("throws on markdown with only a title", () => {
    expect(() => parseMarkdownSkill("# Title Only", "title.md")).toThrow("has no content")
  })

  it("derives id from complex filename", () => {
    const md = "## topic\n\nContent."
    const pkg = parseMarkdownSkill(md, "My Complex Skill (v2).md")
    expect(pkg.metadata.id).toBe("my-complex-skill-v2")
  })

  it("uses first paragraph as summary", () => {
    const md = [
      "# Skill",
      "",
      "First paragraph is the summary.",
      "",
      "Second paragraph is not.",
      "",
      "## section",
      "",
      "Section content.",
    ].join("\n")

    const pkg = parseMarkdownSkill(md, "skill.md")
    expect(pkg.metadata.summary).toBe("First paragraph is the summary.")
    // preamble becomes implicit section
    expect(pkg.sections).toHaveLength(2)
    expect(pkg.sections![0].topic).toBe("Skill")
    expect(pkg.sections![0].content).toContain("First paragraph")
    expect(pkg.sections![0].content).toContain("Second paragraph")
  })

  it("parses YAML frontmatter for metadata", () => {
    const md = [
      "---",
      "name: verify",
      "description: Validate changes before committing.",
      "version: 2.0.0",
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

    const pkg = parseMarkdownSkill(md, "verify/SKILL.md")

    expect(pkg.metadata.id).toBe("verify")
    expect(pkg.metadata.name).toBe("verify")
    expect(pkg.metadata.summary).toBe("Validate changes before committing.")
    expect(pkg.metadata.version).toBe("2.0.0")
    expect(pkg.metadata.tags).toEqual(["ci", "testing"])
    // preamble becomes implicit section with topic from h1
    expect(pkg.sections).toHaveLength(2)
    expect(pkg.sections![0].topic).toBe("Verification")
    expect(pkg.sections![0].content).toContain("Run all verification steps.")
    expect(pkg.sections![1].topic).toBe("Instructions")
    expect(pkg.sections![1].content).toContain("Run lint")
    // full body content preserves everything
    expect(pkg.content).toContain("Run all verification steps.")
    expect(pkg.content).toContain("Run lint")
  })

  it("uses folder name as id when filename is generic SKILL.md", () => {
    const md = [
      "# My Tool",
      "",
      "Summary here.",
      "",
      "## usage",
      "",
      "Use it.",
    ].join("\n")

    const pkg = parseMarkdownSkill(md, "my-tool/SKILL.md")

    expect(pkg.metadata.id).toBe("my-tool")
    expect(pkg.metadata.name).toBe("My Tool")
    // preamble + h2 section
    expect(pkg.sections).toHaveLength(2)
    expect(pkg.sections![0].topic).toBe("My Tool")
    expect(pkg.sections![0].content).toBe("Summary here.")
  })

  it("uses folder name as id for README.md", () => {
    const md = "## info\n\nSome info."
    const pkg = parseMarkdownSkill(md, "cool-skill/README.md")
    expect(pkg.metadata.id).toBe("cool-skill")
  })

  it("frontmatter id takes highest priority", () => {
    const md = [
      "---",
      "id: custom-id",
      "name: Custom Name",
      "---",
      "",
      "## section",
      "",
      "Content.",
    ].join("\n")

    const pkg = parseMarkdownSkill(md, "other-folder/SKILL.md")
    expect(pkg.metadata.id).toBe("custom-id")
    expect(pkg.metadata.name).toBe("Custom Name")
  })

  it("frontmatter name becomes id when no explicit id", () => {
    const md = [
      "---",
      "name: My Great Skill",
      "---",
      "",
      "## topic",
      "",
      "Content.",
    ].join("\n")

    const pkg = parseMarkdownSkill(md, "random.md")
    expect(pkg.metadata.id).toBe("my-great-skill")
  })

  it("handles real-world SKILL.md with frontmatter + preamble + section", () => {
    const md = [
      "---",
      "name: verify",
      "description: Use when you want to validate changes before committing, or when you need to check all React contribution requirements.",
      "---",
      "",
      "# Verification",
      "",
      "Run all verification steps.",
      "",
      "Arguments:",
      "- $ARGUMENTS: Test pattern for the test step",
      "",
      "## Instructions",
      "",
      "Run these first in sequence:",
      "1. Run `yarn prettier` - format code (stop if fails)",
      "2. Run `yarn linc` - lint changed files (stop if fails)",
      "",
      "Then run these with subagents in parallel:",
      "1. Use `/flow` to type check (stop if fails)",
      "2. Use `/test` to test changes in source (stop if fails)",
      "3. Use `/test www` to test changes in www (stop if fails)",
      "",
      "If all pass, show success summary. On failure, stop immediately and report the issue with suggested fixes.",
    ].join("\n")

    const pkg = parseMarkdownSkill(md, "verify/SKILL.md")

    expect(pkg.metadata.id).toBe("verify")
    expect(pkg.metadata.name).toBe("verify")
    expect(pkg.metadata.summary).toBe(
      "Use when you want to validate changes before committing, or when you need to check all React contribution requirements."
    )
    // preamble (between h1 and h2) becomes implicit first section
    expect(pkg.sections).toHaveLength(2)
    expect(pkg.sections![0].topic).toBe("Verification")
    expect(pkg.sections![0].content).toContain("Run all verification steps.")
    expect(pkg.sections![0].content).toContain("$ARGUMENTS")
    expect(pkg.sections![1].topic).toBe("Instructions")
    expect(pkg.sections![1].content).toContain("yarn prettier")
    // full body content preserves everything
    expect(pkg.content).toContain("Run all verification steps.")
    expect(pkg.content).toContain("$ARGUMENTS")
    expect(pkg.content).toContain("yarn prettier")
    expect(pkg.content).not.toContain("# Verification")
  })
})
