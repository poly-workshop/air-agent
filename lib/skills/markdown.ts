import type { InstallableSkillPackage, SkillContentSection } from "@/lib/skills/types"

/* ------------------------------------------------------------------ */
/*  Frontmatter                                                       */
/* ------------------------------------------------------------------ */

interface Frontmatter {
  name?: string
  description?: string
  summary?: string
  tags?: string[]
  version?: string
  id?: string
}

/**
 * Extract YAML frontmatter delimited by `---` at the very beginning of the file.
 * Returns the parsed key-value pairs and the remaining body lines.
 */
function extractFrontmatter(lines: string[]): { frontmatter: Frontmatter; bodyLines: string[] } {
  const empty: { frontmatter: Frontmatter; bodyLines: string[] } = { frontmatter: {}, bodyLines: lines }

  if (lines.length === 0 || lines[0].trim() !== "---") {
    return empty
  }

  const closingIdx = lines.indexOf("---", 1)
  if (closingIdx === -1) {
    return empty
  }

  const yamlLines = lines.slice(1, closingIdx)
  const fm: Record<string, string | string[]> = {}

  for (const line of yamlLines) {
    const match = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/)
    if (!match) continue

    const key = match[1].trim()
    const rawValue = match[2].trim()

    // Simple inline array: [a, b, c]
    const arrayMatch = rawValue.match(/^\[(.+)]$/)
    if (arrayMatch) {
      fm[key] = arrayMatch[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
    } else {
      fm[key] = rawValue.replace(/^["']|["']$/g, "")
    }
  }

  const frontmatter: Frontmatter = {}
  if (typeof fm.name === "string" && fm.name) frontmatter.name = fm.name
  if (typeof fm.id === "string" && fm.id) frontmatter.id = fm.id
  if (typeof fm.description === "string" && fm.description) frontmatter.description = fm.description
  if (typeof fm.summary === "string" && fm.summary) frontmatter.summary = fm.summary
  if (typeof fm.version === "string" && fm.version) frontmatter.version = fm.version
  if (Array.isArray(fm.tags)) frontmatter.tags = fm.tags.filter((t) => typeof t === "string")

  return { frontmatter, bodyLines: lines.slice(closingIdx + 1) }
}

/* ------------------------------------------------------------------ */
/*  Id derivation                                                     */
/* ------------------------------------------------------------------ */

const GENERIC_FILENAMES = new Set([
  "skill", "skill_doc", "readme", "index", "main", "doc",
])

/**
 * Derive a skill id from the best available source.
 *
 * Priority:
 *  1. Frontmatter `id`
 *  2. Frontmatter `name`  (slugified)
 *  3. Parent folder name  (when filename is generic like SKILL.md / README.md)
 *  4. Filename stem
 */
function deriveId(
  frontmatter: Frontmatter,
  filepath: string,
): string {
  const slugify = (s: string) =>
    s
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()

  if (frontmatter.id) return slugify(frontmatter.id)
  if (frontmatter.name) return slugify(frontmatter.name)

  // filepath may be "verify/SKILL.md" or just "SKILL.md"
  const parts = filepath.replace(/\\/g, "/").split("/")
  const basename = (parts.pop() || filepath).replace(/\.md$/i, "")

  if (GENERIC_FILENAMES.has(basename.toLowerCase()) && parts.length > 0) {
    const folder = parts[parts.length - 1]
    return slugify(folder)
  }

  return slugify(basename)
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Parse a Markdown string into an InstallableSkillPackage.
 *
 * Supported formats:
 *
 * 1. **YAML frontmatter** — `name`, `description`/`summary`, `tags`,
 *    `version`, `id` are extracted from the `---` block.
 *
 * 2. **Heading conventions** — The first `# Heading` becomes the skill
 *    `name` (if not set by frontmatter). Each `## Heading` starts a new
 *    section whose `topic` is the heading text. Text before the first
 *    `##` (after the title) is used as the `summary`.
 *
 * @param filepath  The original path inside the zip (or just a filename).
 *                  Used for id derivation — folder name is preferred over
 *                  generic filenames like `SKILL.md` or `README.md`.
 */
export function parseMarkdownSkill(
  markdown: string,
  filepath: string,
): InstallableSkillPackage {
  const allLines = markdown.split(/\r?\n/)
  const { frontmatter, bodyLines } = extractFrontmatter(allLines)

  let name = frontmatter.name ?? ""
  let h1Text = ""
  const preambleLines: string[] = []
  const sections: SkillContentSection[] = []
  let currentTopic: string | null = null
  let currentLines: string[] = []
  let foundFirstH2 = false

  for (const line of bodyLines) {
    // Match `# Title` (h1) — only the first occurrence
    const h1Match = line.match(/^#\s+(.+)$/)
    if (h1Match && !h1Text) {
      h1Text = h1Match[1].trim()
      if (!name) name = h1Text
      continue // always skip h1 from body content
    }

    // Match `## Topic` (h2)
    const h2Match = line.match(/^##\s+(.+)$/)
    if (h2Match) {
      // Flush previous section
      if (currentTopic !== null) {
        sections.push({
          topic: currentTopic,
          content: currentLines.join("\n").trim(),
        })
      }
      currentTopic = h2Match[1].trim()
      currentLines = []
      foundFirstH2 = true
      continue
    }

    if (!foundFirstH2) {
      preambleLines.push(line)
    } else {
      currentLines.push(line)
    }
  }

  // Flush last section
  if (currentTopic !== null && currentLines.length > 0) {
    sections.push({
      topic: currentTopic,
      content: currentLines.join("\n").trim(),
    })
  }

  // If there's preamble text and h2 sections exist, add preamble as an
  // implicit first section so it's retrievable via topic-based filtering.
  const preambleText = preambleLines.join("\n").trim()
  if (preambleText && sections.length > 0) {
    sections.unshift({
      topic: h1Text || "overview",
      content: preambleText,
    })
  }

  const id = deriveId(frontmatter, filepath)

  if (!name) {
    const basename = filepath.replace(/\\/g, "/").split("/").pop() || filepath
    name = basename.replace(/\.md$/i, "")
  }

  const summary =
    frontmatter.description ??
    frontmatter.summary ??
    (preambleText.split(/\n\s*\n/)[0]?.trim() ||
    `Skill imported from ${filepath}`)

  // Always compute full body content (minus h1 heading line) so nothing is lost
  const fullContent = bodyLines
    .filter((l) => !l.match(/^#\s+(.+)$/))
    .join("\n")
    .trim()

  if (sections.length === 0 && !fullContent) {
    throw new Error(`Markdown skill "${filepath}" has no content`)
  }

  return {
    metadata: {
      id,
      name,
      summary,
      tags: frontmatter.tags ?? [],
      version: frontmatter.version ?? "1.0.0",
    },
    ...(sections.length > 0 && { sections }),
    ...(fullContent && { content: fullContent }),
  }
}
