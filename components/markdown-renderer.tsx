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
  isUserMessage = false 
}: MarkdownRendererProps) {

  return (
    <div className={`
      prose prose-sm max-w-none
      ${isUserMessage 
        ? 'prose-invert prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-code:text-primary-foreground prose-pre:bg-primary-foreground/10 prose-pre:border prose-pre:border-primary-foreground/30'
        : 'dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-code:bg-muted prose-code:text-foreground prose-pre:bg-muted prose-pre:border prose-pre:border-muted-foreground/20'
      }
      prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-code:break-words
      prose-pre:rounded prose-pre:text-xs prose-pre:overflow-x-auto prose-pre:max-w-full prose-pre:w-full prose-pre:whitespace-pre-wrap prose-pre:break-words
      prose-a:text-primary hover:prose-a:text-primary/80 prose-a:no-underline hover:prose-a:underline prose-a:break-words
      prose-img:rounded prose-img:my-2 prose-img:max-w-full
      prose-li:my-1
      prose-p:break-words
      prose-table:max-w-full prose-table:overflow-x-auto
      ${className}
    `}
    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml={true}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
