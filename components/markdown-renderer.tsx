import React from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownRendererProps {
  content: string
  className?: string
  isUserMessage?: boolean
}

function createMarkdownComponents(isUserMessage: boolean = false): Components {
  // 根据消息类型确定链接颜色
  const linkColor = isUserMessage ? "text-primary-foreground" : "text-primary"
  const linkHover = isUserMessage ? "hover:text-primary-foreground/80" : "hover:text-primary/80"

  return {
    h1: ({ node, ...props }) => (
      <h1 className="text-xl font-bold mt-4 mb-2" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="text-lg font-bold mt-3 mb-2" {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-base font-bold mt-2 mb-1" {...props} />
    ),
    p: ({ node, ...props }) => (
      <p className="my-2 break-words" {...props} />
    ),
    ul: ({ node, ...props }) => (
      <ul className="list-disc list-inside my-2 ml-2 break-words" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal list-inside my-2 ml-2 break-words" {...props} />
    ),
    li: ({ node, ...props }) => (
      <li className="my-1 break-words" {...props} />
    ),
    code: ({ node, inline, className, ...props }: any) => {
      if (inline) {
        return (
          <code 
            className={`px-1.5 py-0.5 rounded text-xs font-mono break-words max-w-full ${
              isUserMessage 
                ? "bg-primary-foreground/20" 
                : "bg-muted"
            }`} 
            {...props} 
          />
        )
      }
      
      // 检查是否为markdown代码块，如果是则递归渲染为markdown
      if (className?.includes('language-markdown')) {
        const content = String(props.children).replace(/\n$/, '')
        return (
          <div className="my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={createMarkdownComponents(isUserMessage)}>
              {content}
            </ReactMarkdown>
          </div>
        )
      }
      
      return <code className="font-mono text-xs whitespace-pre-wrap break-all block" {...props} />
    },
    pre: ({ node, children, ...props }: any) => {
      // 检查子元素是否为markdown代码块
      const child = React.Children.toArray(children)[0] as any
      if (child?.props?.className?.includes('language-markdown')) {
        // 直接返回子元素，不包裹pre标签
        return <>{children}</>
      }
      
      return (
        <pre 
          className={`border rounded p-3 my-2 overflow-x-auto max-w-full ${
            isUserMessage 
              ? "bg-primary-foreground/10 border-primary-foreground/30" 
              : "bg-muted border border-muted-foreground/20"
          }`}
          style={{ maxWidth: '100%', wordWrap: 'break-word' }}
          {...props} 
        />
      )
    },
    blockquote: ({ node, ...props }) => (
      <blockquote 
        className={`border-l-4 pl-4 italic my-2 ${
          isUserMessage 
            ? "border-primary-foreground/50 text-primary-foreground/80" 
            : "border-muted-foreground/50 text-muted-foreground"
        }`} 
        {...props} 
      />
    ),
    a: ({ node, ...props }) => (
      <a className={`underline break-words ${linkColor} ${linkHover}`} {...props} />
    ),
    img: ({ node, ...props }) => (
      <img className="max-w-full h-auto rounded my-2" {...props} />
    ),
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-2">
        <table 
          className={`border-collapse min-w-full ${
            isUserMessage 
              ? "border border-primary-foreground/30" 
              : "border border-muted-foreground/20"
          }`} 
          {...props} 
        />
      </div>
    ),
    th: ({ node, ...props }) => (
      <th 
        className={`px-3 py-2 text-left font-semibold ${
          isUserMessage 
            ? "border border-primary-foreground/30 bg-primary-foreground/10" 
            : "border border-muted-foreground/20 bg-muted"
        }`} 
        {...props} 
      />
    ),
    td: ({ node, ...props }) => (
      <td 
        className={`px-3 py-2 ${
          isUserMessage 
            ? "border border-primary-foreground/30" 
            : "border border-muted-foreground/20"
        }`} 
        {...props} 
      />
    ),
    hr: ({ node, ...props }) => (
      <hr 
        className={`my-4 ${
          isUserMessage 
            ? "border-primary-foreground/30" 
            : "border-muted-foreground/20"
        }`} 
        {...props} 
      />
    ),
  }
}

export function MarkdownRenderer({ 
  content, 
  className = "", 
  isUserMessage = false 
}: MarkdownRendererProps) {
  const components = createMarkdownComponents(isUserMessage)

  return (
    <div className={`max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
