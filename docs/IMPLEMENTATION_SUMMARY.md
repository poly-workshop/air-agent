# Implementation Summary

## 功能概览

Air Agent 是一个纯前端 AI 聊天应用，支持自动工具调用、流式响应、MCP 集成和完整的聊天 Session 管理。

## 核心功能模块

### 1. 聊天 Session 管理系统

基于 IndexedDB 的完整 Session 生命周期管理，支持多会话并行、持久化存储和自动标题生成。

**架构分层：**

- **SessionStorage** (`lib/session/storage.ts`) — IndexedDB 异步读写层，使用 `idb` 包封装
- **SessionManager** (`lib/session/manager.ts`) — 异步 CRUD 操作 + 业务规则（内存缓存 + 异步持久化）
- **SessionContext** (`lib/session/context.tsx`) — React Context Provider，处理异步初始化和状态同步
- **SessionSidebar** (`components/session-sidebar.tsx`) — 左侧会话列表 UI
- **SessionCreator** (`components/session-creator.tsx`) — 新会话创建页面 + 推荐问题

**关键特性：**

- IndexedDB 存储突破 localStorage 5MB 限制，支持大量对话历史
- 每个 Session 作为独立记录存储（keyPath: `id`），支持单条 CRUD
- 所有写入操作先更新内存缓存再异步持久化，读取操作从内存同步返回
- 流式消息仅在完成后持久化，不保存中间状态
- 不存储 system prompt 消息
- 侧边栏折叠状态使用 localStorage（轻量布尔值）

### 2. 工具调用系统 (lib/tools/)

**类型系统 (types.ts)**

- `ToolDefinition`: OpenAI 兼容的函数定义格式
- `ToolExecutor`: 异步工具执行函数签名
- `Tool`: 定义 + 执行器组合
- `ToolCall`: LLM 工具调用响应结构
- `ChatMessage`: 扩展消息格式（支持工具）
- `ToolResult`: 标准化结果格式（success/error）

**工具注册中心 (registry.ts)**

- 集中管理可用工具的注册、执行和列表
- 内置错误处理（工具缺失、执行失败）

**内置工具 (default-tools.ts)**

- Calculator: 四则运算（加减乘除），含除零保护
- Get Current Time: 当前日期时间，支持时区参数

### 3. AI SDK 服务 (lib/ai-sdk.ts)

- SSE 流式响应处理
- 自动工具调用检测与执行
- 多轮工具对话循环（最大 5 次迭代）
- 逐字符内容流式推送到 UI

### 4. MCP 集成 (lib/mcp/)

- `McpClient`: Streamable HTTP 传输协议客户端
- `mcpToolToAirAgentTool`: MCP 工具到内部 Tool 格式的适配器
- MCP 服务器配置持久化到 localStorage
- 内置 MCP Server（可选，需 Node.js 运行时）

### 5. 页面布局与 UI

- 双栏布局：左侧 SessionSidebar + 右侧主内容区
- 响应式设计：< 768px 时侧边栏默认折叠，展开时 overlay 显示
- 主内容区根据状态显示：Loading → SessionCreator → ChatInterface
- 主题切换（Light/Dark/System）
- 设置面板（API Key、模型、系统提示词、Transitive Thinking 开关）
- 工作区设置导入/导出

## 存储架构

| 存储方式 | 用途 | 特点 |
|----------|------|------|
| IndexedDB (`air-agent-db`) | Session 数据（消息历史） | 异步、大容量、每个 Session 独立记录 |
| localStorage | 设置、MCP 配置、侧边栏折叠状态 | 同步、轻量配置 |

## 技术栈

- Next.js (App Router, 静态导出)
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- `idb` (IndexedDB Promise 封装)
- `@modelcontextprotocol/sdk` (MCP 客户端)
- Vitest + fast-check + fake-indexeddb (测试)

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| IndexedDB 打开失败 | 记录 console.error，返回空 Session 列表 |
| IndexedDB 写入失败 | 捕获异常，抛出错误供上层处理 |
| Session ID 不存在 | 静默忽略，不执行后续操作 |
| 删除不存在的 Session | 静默忽略 |
| 消息添加到不存在的 Session | 静默忽略，记录 console.warn |
| 未配置 API Key | SessionCreator 禁用所有交互，ChatInterface 禁用输入 |
| 工具执行失败 | 返回错误结果，AI 在响应中说明 |
| 网络错误 | 显示错误信息，保留已有消息 |

## 浏览器兼容性

- 需要支持 IndexedDB、Fetch API、SSE 的现代浏览器
- Chrome、Firefox、Safari、Edge 均支持
- 隐私模式下 IndexedDB 可能受限，会降级为空 Session 列表
