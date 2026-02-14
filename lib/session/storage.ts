import { openDB, type IDBPDatabase } from "idb"
import { DB_NAME, DB_VERSION, SESSIONS_STORE, SIDEBAR_STATE_KEY } from "@/lib/constants"
import type { Session } from "@/lib/session/types"

/**
 * IndexedDB 数据库类型定义
 */
interface AirAgentDB {
  sessions: {
    key: string
    value: Session
  }
}

/**
 * SessionStorage — IndexedDB 异步读写层
 *
 * 每个 Session 作为独立记录存储在 IndexedDB "sessions" object store 中，
 * 以 "id" 作为 keyPath。侧边栏折叠状态仍使用 localStorage（同步）。
 */
export class SessionStorage {
  private dbPromise: Promise<IDBPDatabase<AirAgentDB>>

  constructor() {
    this.dbPromise = openDB<AirAgentDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          db.createObjectStore(SESSIONS_STORE, { keyPath: "id" })
        }
      },
    })
  }

  /**
   * 关闭 IndexedDB 连接。
   * 在测试中需要在 deleteDB 之前调用，否则 deleteDB 会因连接未关闭而挂起。
   * 生产环境中可用于清理资源。
   */
  async close(): Promise<void> {
    try {
      const db = await this.dbPromise
      db.close()
    } catch {
      // Ignore errors — the DB may not have opened successfully
    }
  }

  /**
   * 从 IndexedDB 加载所有 Session。
   * 数据库打开失败或读取失败时返回空数组并记录错误。
   */
  async loadAll(): Promise<Session[]> {
    try {
      const db = await this.dbPromise
      return await db.getAll(SESSIONS_STORE)
    } catch (error) {
      console.error("[SessionStorage] Failed to load sessions:", error)
      return []
    }
  }

  /**
   * 保存单个 Session 到 IndexedDB（put 操作，存在则更新）。
   */
  async save(session: Session): Promise<void> {
    try {
      const db = await this.dbPromise
      await db.put(SESSIONS_STORE, session)
    } catch (error) {
      console.error("[SessionStorage] Failed to save session:", error)
      throw error
    }
  }

  /**
   * 批量保存多个 Session 到 IndexedDB。
   * 使用单个事务批量写入以保证原子性。
   */
  async saveAll(sessions: Session[]): Promise<void> {
    try {
      const db = await this.dbPromise
      const tx = db.transaction(SESSIONS_STORE, "readwrite")
      const store = tx.objectStore(SESSIONS_STORE)
      for (const session of sessions) {
        store.put(session)
      }
      await tx.done
    } catch (error) {
      console.error("[SessionStorage] Failed to save sessions:", error)
      throw error
    }
  }

  /**
   * 从 IndexedDB 删除指定 Session。
   */
  async remove(id: string): Promise<void> {
    try {
      const db = await this.dbPromise
      await db.delete(SESSIONS_STORE, id)
    } catch (error) {
      console.error("[SessionStorage] Failed to remove session:", error)
      throw error
    }
  }

  /**
   * 从 localStorage 加载侧边栏折叠状态。
   * 默认返回 false（展开）。
   */
  loadSidebarCollapsed(): boolean {
    try {
      return localStorage.getItem(SIDEBAR_STATE_KEY) === "true"
    } catch {
      return false
    }
  }

  /**
   * 保存侧边栏折叠状态到 localStorage。
   */
  saveSidebarCollapsed(collapsed: boolean): void {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, String(collapsed))
    } catch (error) {
      console.error("[SessionStorage] Failed to save sidebar state:", error)
    }
  }
}

/**
 * 自定义错误：存储空间不足
 */
export class StorageQuotaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "StorageQuotaError"
  }
}
