import "fake-indexeddb/auto"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { randomUUID } from "node:crypto"
import fc from "fast-check"
import { deleteDB } from "idb"
import { SessionManager } from "@/lib/session/manager"
import { SessionStorage } from "@/lib/session/storage"
import { DB_NAME } from "@/lib/constants"

// ── crypto.randomUUID polyfill for Node test env ──
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: { ...globalThis.crypto, randomUUID },
    writable: true,
  })
}

// ── Track open storages for cleanup ──
const openStorages: SessionStorage[] = []

async function createStorage(): Promise<SessionStorage> {
  const s = new SessionStorage()
  openStorages.push(s)
  return s
}

async function closeAllStorages(): Promise<void> {
  for (const s of openStorages) {
    await s.close()
  }
  openStorages.length = 0
}

// ── Property Tests ──

describe("SessionManager Property Tests", () => {
  beforeEach(async () => {
    await closeAllStorages()
    await deleteDB(DB_NAME)
  })

  afterEach(async () => {
    await closeAllStorages()
  })

  /**
   * Feature: chat-session-storage, Property 2: Session ID 唯一性
   *
   * For any N sessions created via SessionManager.createSession(),
   * all session IDs should be unique.
   *
   * **Validates: Requirements 1.3**
   */
  it("Property 2: all created session IDs are unique", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 15 }),
        fc.array(
          fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined }),
          { minLength: 15, maxLength: 15 },
        ),
        async (count, titles) => {
          const iterStorage = await createStorage()
          const manager = new SessionManager(iterStorage)
          await manager.init()

          const ids = new Set<string>()
          for (let i = 0; i < count; i++) {
            const session = await manager.createSession(titles[i])
            ids.add(session.id)
          }

          expect(ids.size).toBe(count)

          await iterStorage.close()
        },
      ),
      { numRuns: 100 },
    )
  }, 60_000)

  /**
   * Feature: chat-session-storage, Property 8: 首条消息自动生成标题
   *
   * For any non-empty string as the first user message, generateTitle should:
   * 1. Return a non-empty string
   * 2. Have length <= 30 characters (or 33 with "..." suffix)
   * 3. Be a prefix of the original trimmed message (possibly with "...")
   *
   * **Validates: Requirements 3.5**
   */
  it("Property 8: generateTitle produces valid titles from any non-empty string", () => {
    const storage = new SessionStorage()
    openStorages.push(storage)
    const manager = new SessionManager(storage)

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
        (message) => {
          const title = manager.generateTitle(message)
          const trimmed = message.trim()

          // 1. Non-empty result
          expect(title.length).toBeGreaterThan(0)

          // 2. Length constraint
          if (trimmed.length <= 30) {
            expect(title.length).toBeLessThanOrEqual(30)
          } else {
            expect(title.length).toBe(33)
            expect(title.endsWith("...")).toBe(true)
          }

          // 3. Title is a prefix of the original trimmed message
          const titleWithoutEllipsis = title.endsWith("...") ? title.slice(0, -3) : title
          expect(trimmed.startsWith(titleWithoutEllipsis)).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * Feature: chat-session-storage, Property 9: Session 列表按更新时间降序排列
   *
   * For any sessions with different updatedAt values,
   * getAllSessions() returns them sorted by updatedAt descending.
   *
   * **Validates: Requirements 4.2**
   */
  it("Property 9: getAllSessions returns sessions sorted by updatedAt descending", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.integer({
            min: new Date("2020-01-01").getTime(),
            max: new Date("2030-01-01").getTime(),
          }),
          { minLength: 2, maxLength: 10 },
        ),
        async (timestamps) => {
          const iterStorage = await createStorage()
          const manager = new SessionManager(iterStorage)
          await manager.init()

          // Create sessions and override their updatedAt timestamps
          for (const ts of timestamps) {
            const session = await manager.createSession("Session")
            session.updatedAt = new Date(ts).toISOString()
            await iterStorage.save(session)
          }

          // Re-init to reload from storage with overridden timestamps
          const freshManager = new SessionManager(iterStorage)
          await freshManager.init()

          const result = freshManager.getAllSessions()

          // Verify descending order by updatedAt
          for (let i = 0; i < result.length - 1; i++) {
            const current = new Date(result[i].updatedAt).getTime()
            const next = new Date(result[i + 1].updatedAt).getTime()
            expect(current).toBeGreaterThanOrEqual(next)
          }

          await iterStorage.close()
        },
      ),
      { numRuns: 100 },
    )
  }, 60_000)
})
