import "fake-indexeddb/auto"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { deleteDB } from "idb"
import { SessionManager } from "@/lib/session/manager"
import { SessionStorage } from "@/lib/session/storage"
import { DB_NAME } from "@/lib/constants"
import type { Session, SessionMessage } from "@/lib/session/types"

// ── crypto.randomUUID polyfill for Node test env ──
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: { randomUUID },
    writable: true,
  })
}

// ── localStorage mock (needed for sidebar state in SessionStorage) ──

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock })

// ── Helpers ──

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: crypto.randomUUID(),
    title: "Test Session",
    messages: [],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeMessage(overrides: Partial<SessionMessage> = {}): SessionMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content: "Hello",
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Seed IndexedDB with sessions via a temporary SessionStorage instance.
 */
async function seedDB(sessions: Session[]): Promise<void> {
  const tempStorage = new SessionStorage()
  await tempStorage.saveAll(sessions)
  await tempStorage.close()
}

// ── Tests ──

describe("SessionManager", () => {
  let storage: SessionStorage
  let manager: SessionManager

  beforeEach(async () => {
    localStorageMock.clear()
    // Close previous storage connection before deleting DB
    if (storage) {
      await storage.close()
    }
    await deleteDB(DB_NAME)
    storage = new SessionStorage()
    manager = new SessionManager(storage)
  })

  // ── init() ──

  describe("init()", () => {
    it("loads sessions from IndexedDB and sets activeSessionId to most recent", async () => {
      const s1 = makeSession({ id: "s1", updatedAt: "2024-01-01T00:00:00.000Z" })
      const s2 = makeSession({ id: "s2", updatedAt: "2024-06-01T00:00:00.000Z" })
      await storage.close()
      await deleteDB(DB_NAME)
      await seedDB([s1, s2])

      storage = new SessionStorage()
      manager = new SessionManager(storage)
      await manager.init()

      expect(manager.getAllSessions()).toHaveLength(2)
      expect(manager.activeSessionId).toBe("s2")
    })

    it("sets activeSessionId to null when IndexedDB is empty", async () => {
      await manager.init()

      expect(manager.getAllSessions()).toEqual([])
      expect(manager.activeSessionId).toBeNull()
    })
  })

  // ── createSession ──

  describe("createSession()", () => {
    it("creates a session with UUID, timestamps, and empty messages", async () => {
      await manager.init()
      const session = await manager.createSession()

      expect(session.id).toBeTruthy()
      expect(session.title).toBe("新会话")
      expect(session.messages).toEqual([])
      expect(new Date(session.createdAt).toISOString()).toBe(session.createdAt)
      expect(new Date(session.updatedAt).toISOString()).toBe(session.updatedAt)
    })

    it("uses provided title when given", async () => {
      await manager.init()
      const session = await manager.createSession("My Chat")
      expect(session.title).toBe("My Chat")
    })

    it("sets the new session as active", async () => {
      await manager.init()
      const session = await manager.createSession()
      expect(manager.activeSessionId).toBe(session.id)
    })

    it("persists the session to IndexedDB", async () => {
      await manager.init()
      await manager.createSession("Persisted")

      // Verify by creating a fresh manager and loading from DB
      const storage2 = new SessionStorage()
      const manager2 = new SessionManager(storage2)
      await manager2.init()

      expect(manager2.getAllSessions()).toHaveLength(1)
      expect(manager2.getAllSessions()[0].title).toBe("Persisted")
      await storage2.close()
    })
  })

  // ── deleteSession ──

  describe("deleteSession()", () => {
    it("removes the session from the list", async () => {
      await manager.init()
      const session = await manager.createSession("To Delete")

      await manager.deleteSession(session.id)
      expect(manager.getAllSessions()).toHaveLength(0)
    })

    it("silently ignores deletion of non-existent session", async () => {
      await manager.init()
      await expect(manager.deleteSession("non-existent")).resolves.toBeUndefined()
    })

    it("switches to most recently updated session when deleting active session", async () => {
      const s1 = makeSession({ id: "s1", updatedAt: "2024-01-01T00:00:00.000Z" })
      const s2 = makeSession({ id: "s2", updatedAt: "2024-06-01T00:00:00.000Z" })
      const s3 = makeSession({ id: "s3", updatedAt: "2024-03-01T00:00:00.000Z" })
      await storage.close()
      await deleteDB(DB_NAME)
      await seedDB([s1, s2, s3])

      storage = new SessionStorage()
      manager = new SessionManager(storage)
      await manager.init()
      manager.activeSessionId = "s1"

      await manager.deleteSession("s1")
      // s2 has the most recent updatedAt
      expect(manager.activeSessionId).toBe("s2")
    })

    it("sets activeSessionId to null when deleting the last session", async () => {
      await manager.init()
      const session = await manager.createSession()
      manager.activeSessionId = session.id

      await manager.deleteSession(session.id)
      expect(manager.activeSessionId).toBeNull()
    })

    it("does not change activeSessionId when deleting a non-active session", async () => {
      await manager.init()
      const s1 = await manager.createSession("Session 1")
      const s2 = await manager.createSession("Session 2")
      // s2 is active after creation
      manager.activeSessionId = s1.id

      await manager.deleteSession(s2.id)
      expect(manager.activeSessionId).toBe(s1.id)
    })
  })

  // ── addMessage ──

  describe("addMessage()", () => {
    it("adds message to the session and updates updatedAt", async () => {
      await manager.init()
      const session = await manager.createSession()
      const originalUpdatedAt = session.updatedAt

      // Small delay to ensure updatedAt changes
      await new Promise((r) => setTimeout(r, 10))

      const msg = makeMessage({ content: "Hi there" })
      await manager.addMessage(session.id, msg)

      const updated = manager.getSession(session.id)!
      expect(updated.messages).toHaveLength(1)
      expect(updated.messages[0].content).toBe("Hi there")
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      )
    })

    it("persists the message to IndexedDB", async () => {
      await manager.init()
      const session = await manager.createSession()

      await manager.addMessage(session.id, makeMessage({ content: "Persisted msg" }))

      // Verify by loading from a fresh storage
      const storage2 = new SessionStorage()
      const manager2 = new SessionManager(storage2)
      await manager2.init()

      const loaded = manager2.getSession(session.id)!
      expect(loaded.messages).toHaveLength(1)
      expect(loaded.messages[0].content).toBe("Persisted msg")
      await storage2.close()
    })

    it("silently ignores message to non-existent session with console.warn", async () => {
      await manager.init()
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      await manager.addMessage("non-existent", makeMessage())

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Session not found")
      )
      warnSpy.mockRestore()
    })
  })

  // ── updateTitle ──

  describe("updateTitle()", () => {
    it("updates the session title", async () => {
      await manager.init()
      const session = await manager.createSession("Old Title")

      await manager.updateTitle(session.id, "New Title")
      expect(manager.getSession(session.id)!.title).toBe("New Title")
    })

    it("silently ignores update for non-existent session", async () => {
      await manager.init()
      await expect(manager.updateTitle("non-existent", "Title")).resolves.toBeUndefined()
    })
  })

  // ── generateTitle ──

  describe("generateTitle()", () => {
    it("returns the full message when <= 30 chars", () => {
      expect(manager.generateTitle("Short message")).toBe("Short message")
    })

    it("truncates to 30 chars with ellipsis when > 30 chars", () => {
      const long = "This is a very long message that exceeds thirty characters"
      const result = manager.generateTitle(long)
      expect(result).toBe("This is a very long message th...")
      expect(result.length).toBe(33) // 30 + "..."
    })

    it("trims whitespace before processing", () => {
      expect(manager.generateTitle("  Hello  ")).toBe("Hello")
    })

    it("returns exactly 30 chars without ellipsis for 30-char input", () => {
      const exact30 = "a".repeat(30)
      expect(manager.generateTitle(exact30)).toBe(exact30)
    })
  })

  // ── getAllSessions ──

  describe("getAllSessions()", () => {
    it("returns sessions sorted by updatedAt descending", async () => {
      const s1 = makeSession({ id: "s1", updatedAt: "2024-01-01T00:00:00.000Z" })
      const s2 = makeSession({ id: "s2", updatedAt: "2024-06-01T00:00:00.000Z" })
      const s3 = makeSession({ id: "s3", updatedAt: "2024-03-01T00:00:00.000Z" })
      await storage.close()
      await deleteDB(DB_NAME)
      await seedDB([s1, s2, s3])

      storage = new SessionStorage()
      manager = new SessionManager(storage)
      await manager.init()

      const result = manager.getAllSessions()
      expect(result.map((s) => s.id)).toEqual(["s2", "s3", "s1"])
    })

    it("returns empty array when no sessions exist", async () => {
      await manager.init()
      expect(manager.getAllSessions()).toEqual([])
    })
  })

  // ── getSession ──

  describe("getSession()", () => {
    it("returns the session by id", async () => {
      await manager.init()
      const session = await manager.createSession("Found")
      expect(manager.getSession(session.id)?.title).toBe("Found")
    })

    it("returns undefined for non-existent id", async () => {
      await manager.init()
      expect(manager.getSession("nope")).toBeUndefined()
    })
  })
})
