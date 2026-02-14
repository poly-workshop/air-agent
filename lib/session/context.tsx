"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { SessionManager } from "@/lib/session/manager"
import { SessionStorage } from "@/lib/session/storage"
import type { Session, SessionMessage } from "@/lib/session/types"

interface SessionContextValue {
  sessions: Session[]
  activeSessionId: string | null
  activeSession: Session | null
  isLoading: boolean

  createSession: (title?: string) => Promise<Session>
  deleteSession: (id: string) => Promise<void>
  setActiveSession: (id: string) => void
  clearActiveSession: () => void
  addMessage: (message: SessionMessage) => Promise<void>
  updateSessionTitle: (id: string, title: string) => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const storageRef = useRef<SessionStorage | null>(null)
  const managerRef = useRef<SessionManager | null>(null)

  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Sync React state from manager's internal state
  const syncState = useCallback(() => {
    const mgr = managerRef.current
    if (!mgr) return
    setSessions(mgr.getAllSessions())
    setActiveSessionIdState(mgr.activeSessionId)
  }, [])

  // Initialize storage and manager only on the client side (inside useEffect)
  // to avoid SSR accessing IndexedDB which doesn't exist on the server.
  useEffect(() => {
    let mounted = true

    async function initialize() {
      if (!storageRef.current) {
        storageRef.current = new SessionStorage()
      }
      if (!managerRef.current) {
        managerRef.current = new SessionManager(storageRef.current)
      }

      const mgr = managerRef.current
      await mgr.init()
      if (mounted) {
        syncState()
        setIsLoading(false)
      }
    }

    initialize()

    return () => {
      mounted = false
    }
  }, [syncState])

  const createSession = useCallback(
    async (title?: string): Promise<Session> => {
      const mgr = managerRef.current
      if (!mgr) throw new Error("SessionManager not initialized")
      const session = await mgr.createSession(title)
      syncState()
      return session
    },
    [syncState]
  )

  const deleteSession = useCallback(
    async (id: string): Promise<void> => {
      const mgr = managerRef.current
      if (!mgr) return
      await mgr.deleteSession(id)
      syncState()
    },
    [syncState]
  )

  const setActiveSession = useCallback(
    (id: string) => {
      const mgr = managerRef.current
      if (!mgr) return
      mgr.activeSessionId = id
      syncState()
    },
    [syncState]
  )

  const clearActiveSession = useCallback(() => {
    const mgr = managerRef.current
    if (!mgr) return
    mgr.activeSessionId = null
    syncState()
  }, [syncState])

  const addMessage = useCallback(
    async (message: SessionMessage): Promise<void> => {
      const mgr = managerRef.current
      if (!mgr) return
      const currentId = mgr.activeSessionId
      if (!currentId) {
        console.warn("[SessionContext] No active session to add message to")
        return
      }
      await mgr.addMessage(currentId, message)
      syncState()
    },
    [syncState]
  )

  const updateSessionTitle = useCallback(
    async (id: string, title: string): Promise<void> => {
      const mgr = managerRef.current
      if (!mgr) return
      await mgr.updateTitle(id, title)
      syncState()
    },
    [syncState]
  )

  const activeSession = useMemo(() => {
    if (!activeSessionId) return null
    return sessions.find((s) => s.id === activeSessionId) ?? null
  }, [sessions, activeSessionId])

  const value = useMemo<SessionContextValue>(
    () => ({
      sessions,
      activeSessionId,
      activeSession,
      isLoading,
      createSession,
      deleteSession,
      setActiveSession,
      clearActiveSession,
      addMessage,
      updateSessionTitle,
    }),
    [
      sessions,
      activeSessionId,
      activeSession,
      isLoading,
      createSession,
      deleteSession,
      setActiveSession,
      clearActiveSession,
      addMessage,
      updateSessionTitle,
    ]
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return ctx
}
