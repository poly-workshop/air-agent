"use client"

import { Trash2, Plus, PanelLeftClose, PanelLeftOpen, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session/context"
import { cn } from "@/lib/utils"

interface SessionSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

/**
 * Format a timestamp into a relative time string (e.g., "2 hours ago").
 */
export function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return "刚刚"

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 个月前`

  const years = Math.floor(months / 12)
  return `${years} 年前`
}

export function SessionSidebar({ collapsed, onToggleCollapse }: SessionSidebarProps) {
  const {
    sessions,
    activeSessionId,
    clearActiveSession,
    deleteSession,
    setActiveSession,
  } = useSession()

  const handleNewSession = () => {
    clearActiveSession()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteSession(id)
  }

  // Collapsed state: show only icon buttons
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-3 px-1 border-r bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label="展开侧边栏"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewSession}
          aria-label="新建会话"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Expanded state
  return (
    <div className="flex flex-col h-full w-64 border-r bg-background">
      {/* Header: collapse toggle + new session button */}
      <div className="flex items-center justify-between px-3 py-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label="折叠侧边栏"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewSession}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          新建会话
        </Button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 p-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveSession(session.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setActiveSession(session.id)
                }
              }}
              className={cn(
                "group flex items-center gap-2 w-full rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent cursor-pointer",
                session.id === activeSessionId && "bg-accent"
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{session.title}</div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(session.updatedAt)}
                </div>
              </div>
              <button
                type="button"
                className="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-accent"
                onClick={(e) => handleDelete(e, session.id)}
                aria-label={`删除会话: ${session.title}`}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
