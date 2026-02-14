# 需求文档：聊天 Session 上下文存储

## 简介

为 Air Agent 聊天应用设计一个完整的聊天 Session 管理系统。该系统将聊天会话上下文持久化存储在浏览器 IndexedDB 中，支持多 Session 管理，并提供类似 ChatGPT 的左侧 Session 选择栏和专用的 Session 创建页面。侧边栏折叠状态等轻量配置仍使用 localStorage 存储。

## 术语表

- **Session**：一次独立的聊天会话，包含唯一标识、标题、消息列表及元数据
- **Session_Manager**：负责 Session 的创建、读取、更新、删除和列表管理的核心模块
- **Session_Storage**：负责将 Session 数据持久化到 IndexedDB 的异步存储层
- **IndexedDB**：浏览器内置的异步键值对数据库，支持大容量结构化数据存储
- **Session_Sidebar**：左侧 Session 选择栏 UI 组件，展示所有 Session 列表并支持切换
- **Session_Creator**：Session 创建页面组件，包含推荐问题和自定义输入
- **Chat_Interface**：聊天主界面组件，展示当前 Session 的消息并处理用户输入
- **Message**：单条聊天消息，包含角色、内容、时间戳等信息

## 需求

### 需求 1：Session 数据模型定义

**用户故事：** 作为开发者，我希望有清晰的 Session 数据结构定义，以便系统能够一致地管理和存储聊天会话数据。

#### 验收标准

1. THE Session_Storage SHALL 定义 Session 数据结构，包含唯一 ID（UUID）、标题、消息列表、创建时间和最后更新时间
2. THE Session_Storage SHALL 定义 Message 数据结构，包含唯一 ID、角色（user/assistant/tool/system）、内容、时间戳，以及可选的 tool_calls、tool_call_id 和 name 字段
3. THE Session_Storage SHALL 为每个新创建的 Session 生成唯一的 UUID 作为标识符
4. THE Session_Storage SHALL 使用 ISO 8601 格式存储所有时间戳

### 需求 2：Session 持久化存储（IndexedDB）

**用户故事：** 作为用户，我希望聊天记录能够在浏览器关闭后保留，并且不受 localStorage 5MB 容量限制，以便我可以存储大量对话历史。

#### 验收标准

1. WHEN 一条新消息被添加到当前 Session 时，THE Session_Storage SHALL 立即将该 Session 的完整数据异步写入 IndexedDB
2. WHEN 应用启动时，THE Session_Storage SHALL 从 IndexedDB 异步读取所有已保存的 Session 数据
3. WHEN Session 数据被写入 IndexedDB 后再读取时，THE Session_Storage SHALL 产生与原始数据等价的对象（往返一致性）
4. IF IndexedDB 中的数据格式无效或损坏，THEN THE Session_Storage SHALL 记录错误日志并返回空的 Session 列表，而非导致应用崩溃
5. IF IndexedDB 操作失败（如数据库被阻塞或事务中止），THEN THE Session_Storage SHALL 向用户显示存储操作失败的提示信息
6. THE Session_Storage SHALL 使用名为 "air-agent-db" 的 IndexedDB 数据库，其中包含名为 "sessions" 的对象存储（object store），以 "id" 作为 keyPath
7. THE Session_Storage SHALL 所有存储操作返回 Promise，支持异步调用

### 需求 3：Session 生命周期管理

**用户故事：** 作为用户，我希望能够创建、切换和删除聊天会话，以便我可以组织和管理不同主题的对话。

#### 验收标准

1. WHEN 用户点击"新建会话"按钮时，THE Session_Manager SHALL 创建一个新的空 Session 并将其异步持久化后设为当前活跃 Session
2. WHEN 用户在 Session 列表中选择一个 Session 时，THE Session_Manager SHALL 将该 Session 设为当前活跃 Session 并在 Chat_Interface 中加载其消息历史
3. WHEN 用户删除一个 Session 时，THE Session_Manager SHALL 从 IndexedDB 中异步移除该 Session 的所有数据
4. WHEN 用户删除当前活跃的 Session 时，THE Session_Manager SHALL 自动切换到最近更新的其他 Session；若无其他 Session，则进入 Session 创建页面
5. WHEN 用户在一个 Session 中发送第一条消息时，THE Session_Manager SHALL 基于该消息内容自动生成 Session 标题

### 需求 4：Session 侧边栏 UI

**用户故事：** 作为用户，我希望有一个类似 ChatGPT 的左侧侧边栏来浏览和管理我的聊天会话，以便我可以快速在不同对话之间切换。

#### 验收标准

1. THE Session_Sidebar SHALL 在页面左侧显示所有 Session 的列表，每个条目展示 Session 标题和最后更新时间
2. THE Session_Sidebar SHALL 按最后更新时间降序排列 Session 列表（最新的在最上方）
3. THE Session_Sidebar SHALL 高亮显示当前活跃的 Session 条目
4. THE Session_Sidebar SHALL 为每个 Session 条目提供删除操作入口
5. THE Session_Sidebar SHALL 在顶部提供"新建会话"按钮
6. THE Session_Sidebar SHALL 支持折叠和展开，折叠时仅显示图标按钮以节省屏幕空间
7. WHEN Session_Sidebar 的折叠/展开状态改变时，THE Session_Sidebar SHALL 将该状态持久化到 localStorage（此为轻量布尔值，无需使用 IndexedDB）

### 需求 5：Session 创建页面

**用户故事：** 作为用户，我希望在创建新会话时看到一些推荐的开场问题，以便我可以快速开始一个有意义的对话。

#### 验收标准

1. WHEN 用户创建新 Session 或当前无任何 Session 时，THE Session_Creator SHALL 显示一个包含推荐问题的创建页面
2. THE Session_Creator SHALL 展示至少 4 个分类明确的推荐问题卡片
3. WHEN 用户点击一个推荐问题卡片时，THE Session_Creator SHALL 以该问题作为第一条用户消息创建新 Session 并立即发送
4. THE Session_Creator SHALL 同时提供一个文本输入框，允许用户输入自定义问题来开始新会话
5. WHEN 用户通过输入框提交自定义问题时，THE Session_Creator SHALL 以该问题作为第一条用户消息创建新 Session 并立即发送

### 需求 6：布局重构

**用户故事：** 作为用户，我希望应用布局从单列全屏变为带侧边栏的双栏布局，以便我可以同时看到会话列表和聊天内容。

#### 验收标准

1. THE Chat_Interface SHALL 采用左侧侧边栏 + 右侧聊天区域的双栏布局
2. THE Chat_Interface SHALL 在侧边栏折叠时将聊天区域扩展至全宽
3. WHILE 屏幕宽度小于 768px 时，THE Session_Sidebar SHALL 默认折叠，并以覆盖层（overlay）方式展开
4. THE Chat_Interface SHALL 保持现有的主题切换、设置面板和 MCP 集成功能不受影响

### 需求 7：Session 与现有消息系统集成

**用户故事：** 作为用户，我希望现有的聊天功能（包括工具调用、流式响应、Transitive Thinking）在新的 Session 系统下正常工作。

#### 验收标准

1. WHEN 消息包含 tool_calls 字段时，THE Session_Storage SHALL 完整保存和恢复 tool_calls 数据结构
2. WHEN 消息包含 transitive-thought 类型时，THE Session_Storage SHALL 保存该类型标记（type 字段）并在加载时正确恢复
3. WHEN 用户切换 Session 时，THE Chat_Interface SHALL 正确恢复该 Session 的完整消息历史，包括工具调用结果和推理链
4. WHILE AI 正在流式生成响应时，THE Session_Storage SHALL 仅在消息完成后才将其持久化，避免保存不完整的流式中间状态
5. THE Session_Storage SHALL 仅存储用户可见的消息（user、assistant、tool），不存储 system prompt 消息
