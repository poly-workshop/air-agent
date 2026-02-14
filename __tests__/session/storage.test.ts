import "fake-indexeddb/auto"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { deleteDB } from "idb"
import { SessionStorage } from "@/lib/session/storage"
import { DB_NAME, SIDEBAR_STATE_KEY } from "@/lib/constants"
import type { Session } from "@/lib/session/types"

// ── localStorage mock (only needed for sidebar collapsed state) ──

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
    _getStore: () => store,
  }
})()

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock })

// ── Helpers ──

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "test-id-1",
    title: "Test Session",
    messages: [],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  }
}

// ── Tests ──

describe("SessionStorage Unit Tests", () => {
  let storage: SessionStorage

  beforeEach(async () => {
    localStorageMock.clear()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    // Close any previous connection so deleteDB doesn't hang
    if (storage) {
      await storage.close()
    }
    await deleteDB(DB_NAME)
    storage = new SessionStorage()
  })

  // ── loadAll: empty IndexedDB → returns [] (Requirement 2.4) ──

  describe("loadAll() — empty database", () => {
    it("returns empty array when IndexedDB has no sessions", async () => {
      const result = await storage.loadAll()
      expect(result).toEqual([])
    })
  })

  // ── save and loadAll (Requirement 2.1, 2.3) ──

  describe("save() and loadAll()", () => {
    it("saves a session and retrieves it via loadAll", async () => {
      const session = makeSession()
      await storage.save(session)

      const loaded = await storage.loadAll()
      expect(loaded).toHaveLength(1)
      expect(loaded[0]).toEqual(session)
    })

    it("updates an existing session with put semantics", async () => {
      const session = makeSession()
      await storage.save(session)

      const updated = { ...session, title: "Updated Title", updatedAt: "2024-06-01T00:00:00.000Z" }
      await storage.save(updated)

      const loaded = await storage.loadAll()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].title).toBe("Updated Title")
      expect(loaded[0].updatedAt).toBe("2024-06-01T00:00:00.000Z")
    })
  })

  // ── saveAll (Requirement 2.1) ──

  describe("saveAll()", () => {
    it("stores multiple sessions in a single transaction", async () => {
      const sessions = [
        makeSession({ id: "s1", title: "Session 1" }),
        makeSession({ id: "s2", title: "Session 2" }),
        makeSession({ id: "s3", title: "Session 3" }),
      ]
      await storage.saveAll(sessions)

      const loaded = await storage.loadAll()
      expect(loaded).toHaveLength(3)

      const ids = loaded.map((s) => s.id).sort()
      expect(ids).toEqual(["s1", "s2", "s3"])
    })
  })

  // ── remove (Requirement 2.3) ──

  describe("remove()", () => {
    it("deletes a session from IndexedDB", async () => {
      const session = makeSession()
      await storage.save(session)
      expect(await storage.loadAll()).toHaveLength(1)

      await storage.remove(session.id)
      expect(await storage.loadAll()).toHaveLength(0)
    })

    it("does not throw when removing a non-existent id", async () => {
      await expect(storage.remove("non-existent-id")).resolves.toBeUndefined()
    })
  })

  // ── Sidebar collapsed state (Requirement 4.7) ──

  describe("sidebar collapsed state (localStorage)", () => {
    it("loadSidebarCollapsed returns false by default", () => {
      expect(storage.loadSidebarCollapsed()).toBe(false)
    })

    it("round-trips true correctly", () => {
      storage.saveSidebarCollapsed(true)
      expect(storage.loadSidebarCollapsed()).toBe(true)
    })

    it("round-trips false correctly", () => {
      storage.saveSidebarCollapsed(true)
      storage.saveSidebarCollapsed(false)
      expect(storage.loadSidebarCollapsed()).toBe(false)
    })

    it("writes to the correct localStorage key", () => {
      storage.saveSidebarCollapsed(true)
      expect(localStorageMock._getStore()[SIDEBAR_STATE_KEY]).toBe("true")
    })
  })

  // ── IndexedDB error handling (Requirement 2.4, 2.5) ──

  describe("IndexedDB error handling", () => {
    it("loadAll returns empty array when db promise rejects", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      // Create a storage instance and close its real connection before overriding
      const brokenStorage = new SessionStorage()
      await brokenStorage.close()
      // Override the private dbPromise to simulate a failure
      Object.defineProperty(brokenStorage, "dbPromise", {
        value: Promise.reject(new Error("DB open failed")),
      })

      const result = await brokenStorage.loadAll()
      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith(
        "[SessionStorage] Failed to load sessions:",
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })

    it("save throws when db promise rejects", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const brokenStorage = new SessionStorage()
      await brokenStorage.close()
      Object.defineProperty(brokenStorage, "dbPromise", {
        value: Promise.reject(new Error("DB open failed")),
      })

      await expect(brokenStorage.save(makeSession())).rejects.toThrow("DB open failed")

      consoleSpy.mockRestore()
    })

    it("remove throws when db promise rejects", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const brokenStorage = new SessionStorage()
      await brokenStorage.close()
      Object.defineProperty(brokenStorage, "dbPromise", {
        value: Promise.reject(new Error("DB open failed")),
      })

      await expect(brokenStorage.remove("some-id")).rejects.toThrow("DB open failed")

      consoleSpy.mockRestore()
    })
  })
})
