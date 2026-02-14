import "fake-indexeddb/auto"
import { describe, it, expect, beforeEach } from "vitest"
import fc from "fast-check"
import { deleteDB } from "idb"
import { SessionStorage } from "@/lib/session/storage"
import type { Session, SessionMessage } from "@/lib/session/types"
import type { ToolCall } from "@/lib/tools/types"
import { DB_NAME } from "@/lib/constants"

// ── localStorage mock ──

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock })

// ── fast-check Arbitraries ──

const arbIdentifier = fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,29}$/)

const arbToolCall: fc.Arbitrary<ToolCall> = fc.record({
  id: fc.uuid(),
  type: fc.constant("function" as const),
  function: fc.record({
    name: arbIdentifier,
    arguments: fc.json({ maxDepth: 2 }),
  }),
})

const arbIsoTimestamp = fc
  .integer({ min: new Date("2020-01-01").getTime(), max: new Date("2030-01-01").getTime() })
  .map((ts) => new Date(ts).toISOString())

const arbBaseMessage: fc.Arbitrary<SessionMessage> = fc.record({
  id: fc.uuid(),
  role: fc.constantFrom("user" as const, "assistant" as const, "tool" as const),
  content: fc.string({ minLength: 0, maxLength: 200 }),
  timestamp: arbIsoTimestamp,
})

const arbToolCallMessage: fc.Arbitrary<SessionMessage> = fc.record({
  id: fc.uuid(),
  role: fc.constant("assistant" as const),
  content: fc.string({ minLength: 0, maxLength: 200 }),
  timestamp: arbIsoTimestamp,
  tool_calls: fc.array(arbToolCall, { minLength: 1, maxLength: 3 }),
})

const arbTransitiveThoughtMessage: fc.Arbitrary<SessionMessage> = fc.record({
  id: fc.uuid(),
  role: fc.constant("assistant" as const),
  content: fc.string({ minLength: 0, maxLength: 200 }),
  timestamp: arbIsoTimestamp,
  type: fc.constant("transitive-thought" as const),
})

const arbToolResultMessage: fc.Arbitrary<SessionMessage> = fc.record({
  id: fc.uuid(),
  role: fc.constant("tool" as const),
  content: fc.string({ minLength: 0, maxLength: 200 }),
  timestamp: arbIsoTimestamp,
  tool_call_id: fc.uuid(),
  name: arbIdentifier,
})

const arbMessage: fc.Arbitrary<SessionMessage> = fc.oneof(
  { weight: 3, arbitrary: arbBaseMessage },
  { weight: 2, arbitrary: arbToolCallMessage },
  { weight: 2, arbitrary: arbTransitiveThoughtMessage },
  { weight: 2, arbitrary: arbToolResultMessage },
)

const arbSession: fc.Arbitrary<Session> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 0, maxLength: 100 }),
  messages: fc.array(arbMessage, { minLength: 0, maxLength: 10 }),
  createdAt: arbIsoTimestamp,
  updatedAt: arbIsoTimestamp,
})

// ── Helpers ──

/**
 * Deduplicate sessions by id, keeping the last occurrence (simulates IndexedDB put behavior).
 */
function deduplicateById(sessions: Session[]): Session[] {
  const map = new Map<string, Session>()
  for (const s of sessions) {
    map.set(s.id, s)
  }
  return Array.from(map.values())
}

/**
 * Clear all sessions from storage by loading and removing each one.
 */
async function clearStorage(storage: SessionStorage): Promise<void> {
  const all = await storage.loadAll()
  for (const s of all) {
    await storage.remove(s.id)
  }
}

// ── Property Tests ──

describe("SessionStorage Property Tests", () => {
  let storage: SessionStorage

  beforeEach(async () => {
    localStorageMock.clear()
    // Close any previous connection so deleteDB doesn't hang
    if (storage) {
      await storage.close()
    }
    // Delete and recreate DB once per test case (not per iteration)
    await deleteDB(DB_NAME)
    storage = new SessionStorage()
  })

  /**
   * Feature: chat-session-storage, Property 3: Session 数据 IndexedDB 往返一致性
   *
   * For any valid Session objects containing messages with tool_calls,
   * transitive-thought types, and tool results, saving via save() then
   * loading via loadAll() produces deeply equal results.
   *
   * **Validates: Requirements 2.3, 7.1, 7.2**
   */
  it("Property 3: save then loadAll produces deeply equal sessions (IndexedDB round-trip consistency)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbSession, { minLength: 0, maxLength: 5 }),
        async (sessions) => {
          // Clear store between iterations
          await clearStorage(storage)

          // Save each session individually
          for (const session of sessions) {
            await storage.save(session)
          }

          const loaded = await storage.loadAll()

          // If input has duplicate ids, IndexedDB put keeps the last one
          const expected = deduplicateById(sessions)

          // Sort both by id for stable comparison
          const sortById = (a: Session, b: Session) => a.id.localeCompare(b.id)
          expect([...loaded].sort(sortById)).toEqual([...expected].sort(sortById))
        },
      ),
      { numRuns: 100 },
    )
  }, 30_000)
})
