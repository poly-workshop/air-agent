import type { ToolCall } from "@/lib/tools/types"

/**
 * Session 消息数据结构
 * 对应 chat-interface.tsx 中的 Message 类型，增加了 timestamp 用于持久化
 */
export interface SessionMessage {
  id: string                                        // UUID
  role: "user" | "assistant" | "tool" | "system"
  content: string
  timestamp: string                                 // ISO 8601
  type?: "transitive-thought"
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

/**
 * Session 会话数据结构
 */
export interface Session {
  id: string            // UUID
  title: string
  messages: SessionMessage[]
  createdAt: string     // ISO 8601
  updatedAt: string     // ISO 8601
}

/**
 * chat-interface.tsx 内部 Message 类型（镜像定义，用于转换函数）
 */
export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "tool" | "system"
  content: string
  type?: "transitive-thought"
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

/**
 * 将 ChatInterface 的 Message 转换为 SessionMessage（持久化时使用）
 */
export function toSessionMessage(msg: ChatMessage): SessionMessage {
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: new Date().toISOString(),
    ...(msg.type !== undefined && { type: msg.type }),
    ...(msg.tool_calls !== undefined && { tool_calls: msg.tool_calls }),
    ...(msg.tool_call_id !== undefined && { tool_call_id: msg.tool_call_id }),
    ...(msg.name !== undefined && { name: msg.name }),
  }
}

/**
 * 将 SessionMessage 转换为 ChatInterface 的 Message（加载时使用）
 */
export function fromSessionMessage(msg: SessionMessage): ChatMessage {
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    ...(msg.type !== undefined && { type: msg.type }),
    ...(msg.tool_calls !== undefined && { tool_calls: msg.tool_calls }),
    ...(msg.tool_call_id !== undefined && { tool_call_id: msg.tool_call_id }),
    ...(msg.name !== undefined && { name: msg.name }),
  }
}
