import React from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownRendererProps {
  content: string
  className?: string
}

const markdownComponents: Components = {
  h1: ({ node, ...props }) => (
    <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-xl font-bold mt-3 mb-2" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-lg font-bold mt-2 mb-1" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="my-2" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="list-disc list-inside my-2 ml-2" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal list-inside my-2 ml-2" {...props} />
  ),
  li: ({ node, ...props }) => (
    <li className="my-1" {...props} />
  ),
  code: ({ node, inline, className, ...props }: any) => {
    if (inline) {
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
      )
    }
    return <code className="font-mono text-sm" {...props} />
  },
  pre: ({ node, ...props }) => (
    <pre className="bg-muted border border-muted-foreground/20 rounded p-3 my-2 overflow-x-auto" {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-4 border-muted-foreground/50 pl-4 italic my-2 text-muted-foreground" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a className="text-primary underline hover:text-primary/80" {...props} />
  ),
  img: ({ node, ...props }) => (
    <img className="max-w-full h-auto rounded my-2" {...props} />
  ),
  table: ({ node, ...props }) => (
    <table className="border-collapse border border-muted-foreground/20 my-2" {...props} />
  ),
  th: ({ node, ...props }) => (
    <th className="border border-muted-foreground/20 px-3 py-2 bg-muted text-left font-semibold" {...props} />
  ),
  td: ({ node, ...props }) => (
    <td className="border border-muted-foreground/20 px-3 py-2" {...props} />
  ),
  hr: ({ node, ...props }) => (
    <hr className="my-4 border-muted-foreground/20" {...props} />
  ),
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
