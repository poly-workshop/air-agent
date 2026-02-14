# 实现计划：聊天 Session 上下文存储（IndexedDB）

## 概述

基于更新后的设计文档，将 Session 数据存储从 localStorage 迁移到 IndexedDB。从数据层开始，逐步构建到 UI 层，最后集成到现有聊天界面。所有存储操作变为异步，使用 `idb` 包封装 IndexedDB，使用 `fake-indexeddb` 进行测试。

## 任务

- [x] 1. 更新依赖和常量定义
  - 安装 `idb` 包（IndexedDB Promise 封装）和 `fake-indexeddb`（测试用）
  - 在 `lib/constants.ts` 中添加 `DB_NAME = 'air-agent-db'`、`DB_VERSION = 1`、`SESSIONS_STORE = 'sessions'` 常量
  - 更新 `lib/session/types.ts`：移除 `SessionStorageData` 接口（IndexedDB 不需要包装类型），其余类型保持不变
  - _Requirements: 1.1, 1.2, 2.6_

- [x] 2. 重写 SessionStorage 为 IndexedDB 异步存储层
  - [x] 2.1 重写 `lib/session/storage.ts`，将 SessionStorage 类从 localStorage 改为 IndexedDB
    - 使用 `idb` 包的 `openDB` 初始化数据库，创建 "sessions" object store（keyPath: "id"）
    - 实现 `async loadAll(): Promise<Session[]>` — 从 IndexedDB getAll
    - 实现 `async save(session: Session): Promise<void>` — put 单个 Session
    - 实现 `async saveAll(sessions: Session[]): Promise<void>` — 批量 put
    - 实现 `async remove(id: string): Promise<void>` — 删除单个 Session
    - 保留 `loadSidebarCollapsed(): boolean` 和 `saveSidebarCollapsed(collapsed: boolean): void`（仍使用 localStorage）
    - 处理 IndexedDB 打开失败、事务中止等错误情况
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 2.2 重写 SessionStorage 属性测试
    - **Property 3: Session 数据 IndexedDB 往返一致性**
    - 使用 `fake-indexeddb` 模拟 IndexedDB 环境
    - 使用 `fast-check` 生成包含各种消息类型的随机 Session
    - 测试 save → loadAll 的往返一致性
    - **Validates: Requirements 2.3, 7.1, 7.2**

  - [x] 2.3 重写 SessionStorage 单元测试
    - 使用 `fake-indexeddb` 替代 localStorage mock
    - 测试 IndexedDB 为空时 loadAll 返回空列表
    - 测试 save 和 remove 的基本功能
    - 测试侧边栏折叠状态的读写（仍使用 localStorage mock）
    - 测试 IndexedDB 错误处理
    - _Requirements: 2.4, 2.5, 4.7_

- [x] 3. 重写 SessionManager 为异步业务逻辑层
  - [x] 3.1 重写 `lib/session/manager.ts`，将涉及存储的方法改为 async
    - 新增 `async init(): Promise<void>` — 异步初始化，从 IndexedDB 加载数据
    - 将 `createSession` 改为 `async createSession(title?): Promise<Session>`
    - 将 `deleteSession` 改为 `async deleteSession(id): Promise<void>`
    - 将 `addMessage` 改为 `async addMessage(sessionId, message): Promise<void>`
    - 将 `updateTitle` 改为 `async updateTitle(sessionId, title): Promise<void>`
    - 保持 `getAllSessions()`、`getSession()`、`generateTitle()` 为同步（内存操作）
    - 每次写入操作先更新内存缓存，再 await 异步持久化
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 重写 SessionManager 属性测试
    - **Property 2: Session ID 唯一性**
    - **Property 8: 首条消息自动生成标题**
    - **Property 9: Session 列表按更新时间降序排列**
    - 使用 `fake-indexeddb` 模拟 IndexedDB，所有测试用例使用 async/await
    - **Validates: Requirements 1.3, 3.5, 4.2**

  - [x] 3.3 重写 SessionManager 单元测试
    - 使用 `fake-indexeddb` 替代 localStorage mock
    - 所有测试用例使用 async/await
    - 测试 init() 异步初始化
    - 测试删除活跃 Session 后自动切换到最近更新的 Session
    - 测试删除最后一个 Session 后 activeSessionId 为 null
    - 测试向不存在的 Session 添加消息时静默忽略
    - _Requirements: 3.4_

- [x] 4. Checkpoint - 确保数据层测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 5. 创建 SessionContext React Context
  - 创建 `lib/session/context.tsx`，实现 `SessionProvider` 和 `useSession` hook
  - 在 Provider 中初始化 `SessionManager` 和 `SessionStorage`
  - 使用 `useEffect` 调用 `SessionManager.init()` 完成异步初始化
  - 新增 `isLoading` 状态，在 IndexedDB 数据加载完成前为 `true`
  - 暴露 `sessions`、`activeSessionId`、`activeSession`、`isLoading`、`createSession`、`deleteSession`、`setActiveSession`、`addMessage`、`updateSessionTitle`
  - 所有写入操作返回 Promise
  - 创建 `lib/session/index.ts` 导出所有公共接口
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. 实现 SessionSidebar 侧边栏组件
  - 创建 `components/session-sidebar.tsx`
  - 展示 Session 列表（标题 + 相对时间），按 updatedAt 降序
  - 高亮当前活跃 Session
  - 每项 hover 时显示删除按钮（使用 lucide-react Trash2 图标）
  - 顶部放置折叠/展开按钮和"新建会话"按钮
  - 使用 ScrollArea 组件处理列表滚动
  - 折叠状态下仅显示图标按钮
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 7. 实现 SessionCreator 创建页面组件
  - 创建 `components/session-creator.tsx`
  - 展示至少 4 个分类推荐问题卡片（创意写作、编程技术、分析总结、规划建议）
  - 点击卡片以该问题创建新 Session 并发送
  - 提供底部文本输入框，支持自定义问题
  - 当 `apiKeyConfigured` 为 false 时禁用所有交互，显示配置提示
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. 重构页面布局为双栏结构
  - 修改 `app/page.tsx`，引入 `SessionProvider` 包裹整个应用
  - 实现左侧 SessionSidebar + 右侧主内容区的 flex 布局
  - 根据 `isLoading` 显示加载指示器，根据 activeSession 是否存在显示 SessionCreator 或 ChatInterface
  - 侧边栏折叠/展开状态从 localStorage 读取并持久化
  - 响应式设计：屏幕宽度 < 768px 时侧边栏默认折叠，展开时以 overlay 方式显示
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. 改造 ChatInterface 集成 Session 系统
  - 修改 `components/chat-interface.tsx`，使用 `useSession` hook 替代内部 `messages` 状态
  - 从 activeSession 加载消息，通过 context 的 addMessage（async）持久化新消息
  - 确保流式消息仅在完成后才通过 addMessage 持久化
  - 第一条消息发送后调用 updateSessionTitle 自动生成标题
  - 保持现有的 MCP 集成、Transitive Thinking、工具调用功能不变
  - 保持未配置 API Key 时的禁用和提示行为
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Final checkpoint - 确保所有功能集成正常
  - 确保所有测试通过，如有问题请向用户确认。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号以确保可追溯性
- Checkpoint 任务用于增量验证
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
- 任务 1-3 为之前已完成但需要重写的数据层代码（从 localStorage 迁移到 IndexedDB）
- 任务 5-9 为尚未实现的 UI 层和集成层
