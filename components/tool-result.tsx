"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { JsonView, defaultStyles } from "react-json-view-lite"
import "react-json-view-lite/dist/index.css"

const MAX_PREVIEW_LENGTH = 100

interface ToolResultProps {
  content: string
  name?: string
}

export function ToolResult({ content, name }: ToolResultProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Try to parse content as JSON
  const parseJson = (str: string) => {
    try {
      return JSON.parse(str)
    } catch {
      return null
    }
  }

  const jsonData = parseJson(content)
  const isJson = jsonData !== null

  // Get preview text - first 100 chars or first line
  const getPreview = () => {
    if (isJson) {
      if (Array.isArray(jsonData)) {
        return `Array (${jsonData.length} items)`
      }
      if (jsonData === null || typeof jsonData !== 'object') {
        return String(jsonData)
      }
      const keys = Object.keys(jsonData)
      if (keys.length === 0) return "{}"
      return `Object (${keys.length} keys)`
    }
    const firstLine = content.split('\n')[0]
    return firstLine.length > MAX_PREVIEW_LENGTH ? firstLine.substring(0, MAX_PREVIEW_LENGTH) + '...' : firstLine
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="text-xs text-muted-foreground">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            Tool Result
            {name && <span className="ml-1">• {name}</span>}
          </Badge>
          <CollapsibleTrigger className="flex items-center gap-1 hover:text-foreground transition-colors">
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span className="text-[10px]">{isOpen ? "Hide" : "Show"}</span>
          </CollapsibleTrigger>
        </div>
        
        {!isOpen && (
          <div className="mt-1 text-[11px] text-muted-foreground/70 truncate">
            {getPreview()}
          </div>
        )}
        
        <CollapsibleContent className="mt-2">
          {isJson ? (
            <div className="rounded border border-muted-foreground/20 bg-muted/30 p-2 overflow-x-auto">
              <JsonView 
                data={jsonData} 
                shouldExpandNode={(level) => level < 2}
                style={{
                  ...defaultStyles,
                  container: 'font-mono text-xs',
                  label: 'text-foreground',
                  nullValue: 'text-muted-foreground',
                  undefinedValue: 'text-muted-foreground',
                  numberValue: 'text-blue-600 dark:text-blue-400',
                  stringValue: 'text-green-600 dark:text-green-400',
                  booleanValue: 'text-purple-600 dark:text-purple-400',
                  otherValue: 'text-muted-foreground',
                  punctuation: 'text-foreground',
                }}
              />
            </div>
          ) : (
            <div className="mt-1">
              <MarkdownRenderer content={content} isUserMessage={false} />
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
