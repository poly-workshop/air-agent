import { SessionStorage } from "@/lib/session/storage"
import type { Session, SessionMessage } from "@/lib/session/types"

/**
 * SessionManager — Session 的 CRUD 操作和业务规则（异步版）
 *
 * 内部维护 sessions 列表和 activeSessionId 内存缓存，
 * 所有写入操作先更新内存，再 await 异步持久化到 IndexedDB。
 * 读取操作从内存缓存返回（同步）。
 */
export class SessionManager {
  private storage: SessionStorage
  private sessions: Session[]
  private _activeSessionId: string | null

  constructor(storage: SessionStorage) {
    this.storage = storage
    this.sessions = []
    this._activeSessionId = null
  }

  get activeSessionId(): string | null {
    return this._activeSessionId
  }

  set activeSessionId(id: string | null) {
    this._activeSessionId = id
  }

  /**
   * 异步初始化：从 IndexedDB 加载所有 Session 到内存缓存。
   * 应在使用其他方法之前调用。
   */
  async init(): Promise<void> {
    this.sessions = await this.storage.loadAll()
    if (this.sessions.length > 0) {
      const sorted = this.getAllSessions()
      this._activeSessionId = sorted[0].id
    } else {
      this._activeSessionId = null
    }
  }

  /**
   * 获取所有 Session，按 updatedAt 降序排列（内存操作，同步）
   */
  getAllSessions(): Session[] {
    return [...this.sessions]
      .sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .map((s) => ({
        ...s,
        messages: [...s.messages],
      }))
  }

  /**
   * 根据 ID 获取 Session（内存操作，同步）
   */
  getSession(id: string): Session | undefined {
    return this.sessions.find((s) => s.id === id)
  }

  /**
   * 创建新 Session 并设为活跃 Session（异步持久化）
   */
  async createSession(title?: string): Promise<Session> {
    const now = new Date().toISOString()
    const session: Session = {
      id: crypto.randomUUID(),
      title: title ?? "新会话",
      messages: [],
      createdAt: now,
      updatedAt: now,
    }

    // 先更新内存缓存
    this.sessions.push(session)
    this._activeSessionId = session.id

    // 再异步持久化
    await this.storage.save(session)

    return session
  }

  /**
   * 删除 Session（异步持久化）。
   * 如果删除的是活跃 Session，自动切换到最近更新的其他 Session；
   * 如果没有剩余 Session，activeSessionId 设为 null。
   */
  async deleteSession(id: string): Promise<void> {
    const index = this.sessions.findIndex((s) => s.id === id)
    if (index === -1) return

    // 先更新内存缓存
    this.sessions.splice(index, 1)

    if (this._activeSessionId === id) {
      if (this.sessions.length > 0) {
        const sorted = this.getAllSessions()
        this._activeSessionId = sorted[0].id
      } else {
        this._activeSessionId = null
      }
    }

    // 再异步持久化
    await this.storage.remove(id)
  }

  /**
   * 向指定 Session 添加消息并更新 updatedAt（异步持久化）。
   * 如果 sessionId 不存在，静默忽略并记录警告。
   */
  async addMessage(sessionId: string, message: SessionMessage): Promise<void> {
    const session = this.sessions.find((s) => s.id === sessionId)
    if (!session) {
      console.warn(`[SessionManager] Session not found: ${sessionId}`)
      return
    }

    // 先更新内存缓存
    session.messages.push(message)
    session.updatedAt = new Date().toISOString()

    // 再异步持久化
    await this.storage.save(session)
  }

  /**
   * 更新 Session 标题（异步持久化）
   */
  async updateTitle(sessionId: string, title: string): Promise<void> {
    const session = this.sessions.find((s) => s.id === sessionId)
    if (!session) return

    // 先更新内存缓存
    session.title = title
    session.updatedAt = new Date().toISOString()

    // 再异步持久化
    await this.storage.save(session)
  }

  /**
   * 基于第一条消息自动生成标题（纯计算，同步）。
   * 截取前 30 个字符，超出部分用 "..." 表示。
   */
  generateTitle(firstMessage: string): string {
    const trimmed = firstMessage.trim()
    if (trimmed.length <= 30) return trimmed
    return trimmed.slice(0, 30) + "..."
  }
}
