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
    // preamble is NOT a section — only ## headings create sections
    expect(pkg.sections).toHaveLength(2)
    expect(pkg.sections![0].topic).toBe("setup")
    expect(pkg.sections![0].content).toBe("Install dependencies first.")
    expect(pkg.sections![1].topic).toBe("usage")
    expect(pkg.sections![1].content).toBe("Call the main function.")
    // full body content preserves everything
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

  it("uses first paragraph as summary when no frontmatter", () => {
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
    // only ## creates a section, preamble stays in content only
    expect(pkg.sections).toHaveLength(1)
    expect(pkg.sections![0].topic).toBe("section")
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
    // preamble is not a section
    expect(pkg.sections).toHaveLength(1)
    expect(pkg.sections![0].topic).toBe("Instructions")
    expect(pkg.sections![0].content).toContain("Run lint")
    // full body content preserves preamble and sections
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
    expect(pkg.sections).toHaveLength(1)
    expect(pkg.sections![0].topic).toBe("usage")
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

  it("parses ### headings as sections", () => {
    const md = [
      "# Operations",
      "",
      "## Supported Operations",
      "",
      "### Task CRUD",
      "",
      "- `create_task`: Required: `title`",
      "- `get_task`: Required: `id`",
      "",
      "### Checklist Operations",
      "",
      "- `add_checklist_item`: Required: `task_id`, `content`",
      "",
      "## Error Handling",
      "",
      "Handle errors gracefully.",
    ].join("\n")

    const pkg = parseMarkdownSkill(md, "ops.md")

    // ## Supported Operations has no direct content (only ### children) → skipped
    // ### Task CRUD, ### Checklist Operations, ## Error Handling → 3 sections
    expect(pkg.sections).toHaveLength(3)
    expect(pkg.sections![0].topic).toBe("Task CRUD")
    expect(pkg.sections![0].content).toContain("create_task")
    expect(pkg.sections![1].topic).toBe("Checklist Operations")
    expect(pkg.sections![1].content).toContain("add_checklist_item")
    expect(pkg.sections![2].topic).toBe("Error Handling")
    expect(pkg.sections![2].content).toBe("Handle errors gracefully.")
  })

  it("handles real-world SKILL.md with frontmatter + preamble + sections + subsections", () => {
    const md = [
      "---",
      "name: slips-skill",
      "description: Use for Slips task management requests through slips-mcp.",
      "---",
      "",
      "# Slips Task Management",
      "",
      "Use this skill when the user asks to manage tasks in Slips.",
      "",
      "## Scope",
      "",
      "This skill covers task operations backed by slips-mcp.",
      "",
      "## Supported Operations (Tool Mapping)",
      "",
      "### Task CRUD",
      "",
      "- `create_task`",
      "  - Required: `title`",
      "",
      "### Checklist Operations",
      "",
      "- `add_checklist_item`",
      "  - Required: `task_id`, `content`",
      "",
      "## Error Handling",
      "",
      "- Missing required field: ask for only the missing field(s).",
    ].join("\n")

    const pkg = parseMarkdownSkill(md, "SKILL.md")

    expect(pkg.metadata.id).toBe("slips-skill")
    expect(pkg.metadata.name).toBe("slips-skill")
    expect(pkg.metadata.summary).toBe("Use for Slips task management requests through slips-mcp.")
    // Sections: Scope, Task CRUD, Checklist Operations, Error Handling
    // "Supported Operations" is skipped (empty content before first ###)
    expect(pkg.sections).toHaveLength(4)
    expect(pkg.sections![0].topic).toBe("Scope")
    expect(pkg.sections![1].topic).toBe("Task CRUD")
    expect(pkg.sections![1].content).toContain("create_task")
    expect(pkg.sections![2].topic).toBe("Checklist Operations")
    expect(pkg.sections![2].content).toContain("add_checklist_item")
    expect(pkg.sections![3].topic).toBe("Error Handling")
    // Full content preserves everything including preamble
    expect(pkg.content).toContain("Use this skill when the user asks to manage tasks in Slips.")
    expect(pkg.content).toContain("create_task")
    expect(pkg.content).toContain("add_checklist_item")
    expect(pkg.content).toContain("Missing required field")
    expect(pkg.content).not.toContain("# Slips Task Management")
  })

  it("handles real-world verify SKILL.md", () => {
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
    // preamble is NOT a section — topic search won't falsely match document title
    expect(pkg.sections).toHaveLength(1)
    expect(pkg.sections![0].topic).toBe("Instructions")
    expect(pkg.sections![0].content).toContain("yarn prettier")
    // full body content preserves everything including preamble
    expect(pkg.content).toContain("Run all verification steps.")
    expect(pkg.content).toContain("$ARGUMENTS")
    expect(pkg.content).toContain("yarn prettier")
    expect(pkg.content).not.toContain("# Verification")
  })
})
