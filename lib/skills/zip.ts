import JSZip from "jszip"
import { installSkillFromJson, installSkillFromMarkdown } from "@/lib/skills/store"
import type { SkillIndexEntry } from "@/lib/skills/types"

type ZipInput = Blob | ArrayBuffer | Uint8Array

async function toZipBytes(input: ZipInput): Promise<Uint8Array> {
  if (input instanceof Uint8Array) {
    return input
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input)
  }

  return new Uint8Array(await input.arrayBuffer())
}

function isSkillFile(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith(".json") || lower.endsWith(".md")
}

export async function installSkillsFromZipFile(file: ZipInput): Promise<SkillIndexEntry[]> {
  const zipBytes = await toZipBytes(file)
  const zip = await JSZip.loadAsync(zipBytes)
  const skillFiles = Object.values(zip.files).filter(
    (entry) => !entry.dir && isSkillFile(entry.name)
  )

  if (skillFiles.length === 0) {
    throw new Error("No skill file (.json or .md) found in zip")
  }

  const installed: SkillIndexEntry[] = []
  const errors: string[] = []

  for (const entry of skillFiles) {
    try {
      const text = await entry.async("string")
      let installedEntry: SkillIndexEntry

      if (entry.name.toLowerCase().endsWith(".md")) {
        installedEntry = await installSkillFromMarkdown(text, entry.name)
      } else {
        installedEntry = await installSkillFromJson(text)
      }

      installed.push(installedEntry)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      errors.push(`${entry.name}: ${message}`)
    }
  }

  if (installed.length === 0) {
    throw new Error(`Failed to install any skill from zip. ${errors[0] || ""}`.trim())
  }

  return installed
}
