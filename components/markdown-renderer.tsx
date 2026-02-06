import { cn } from "@/lib/utils"
import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownRendererProps {
  content: string
  className?: string
  isUserMessage?: boolean
}

export function MarkdownRenderer({ 
  content, 
  className = "",
  isUserMessage = false,
}: MarkdownRendererProps) {

  const colorClasses = isUserMessage
    ? [
        "text-primary-foreground",
        "prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-li:text-primary-foreground",
        "prose-strong:text-primary-foreground prose-em:text-primary-foreground prose-code:text-primary-foreground",
        "prose-a:text-primary-foreground hover:prose-a:text-primary-foreground/80 prose-a:underline",
      ].join(" ")
    : [
        "dark:prose-invert",
        "prose-headings:text-foreground prose-p:text-foreground prose-code:text-foreground",
        "prose-a:text-primary hover:prose-a:text-primary/80 prose-a:no-underline hover:prose-a:underline",
      ].join(" ")

  return (
    <div className={cn(
      "prose prose-sm max-w-none",
      "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-code:break-words",
      "prose-pre:rounded prose-pre:text-xs prose-pre:overflow-x-auto prose-pre:max-w-full prose-pre:w-full prose-pre:whitespace-pre-wrap prose-pre:break-words",
      "prose-code:bg-muted prose-pre:bg-muted prose-pre:border prose-pre:border-muted-foreground/20",
      "prose-a:break-words",
      "prose-img:rounded prose-img:my-2 prose-img:max-w-full",
      "prose-li:my-1",
      "prose-p:break-words",
      "prose-table:max-w-full prose-table:overflow-x-auto",
      colorClasses,
      className
    )}
    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml={true}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
