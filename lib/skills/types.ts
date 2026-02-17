export interface SkillIndexEntry {
  id: string
  name: string
  summary: string
  tags: string[]
  version: string
  sizeHint: number
  file: string
}

export interface SkillContentDocument {
  id: string
  content: string
  version: string
}

export interface SkillContentResponse {
  id: string
  name: string
  summary: string
  version: string
  content: string
  totalLength: number
  truncated: boolean
}
