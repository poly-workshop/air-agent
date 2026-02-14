# Testing Guide

## 测试架构

项目使用 Vitest 作为测试框架，结合 fast-check 进行属性测试，fake-indexeddb 模拟 IndexedDB 环境。

### 测试文件结构

```
__tests__/
└── session/
    ├── storage.test.ts           # SessionStorage 单元测试
    ├── storage.property.test.ts  # SessionStorage 属性测试
    ├── manager.test.ts           # SessionManager 单元测试
    ├── manager.property.test.ts  # SessionManager 属性测试
    └── sidebar.test.ts           # SessionSidebar 组件测试
```

### 运行测试

```bash
# 运行所有测试
npx vitest --run

# 运行特定测试文件
npx vitest --run __tests__/session/storage.test.ts

# 运行匹配模式的测试
npx vitest --run --testPathPattern="session"
```

## 属性测试 (Property-Based Testing)

使用 `fast-check` 库，每个属性至少运行 100 次迭代，生成随机输入验证系统不变量。

### SessionStorage 属性测试

| 属性 | 描述 | 验证需求 |
|------|------|----------|
| Property 3 | Session 数据 IndexedDB 往返一致性 | Req 2.3, 7.1, 7.2 |
| Property 10 | 侧边栏折叠状态往返一致性 | Req 4.7 |

### SessionManager 属性测试

| 属性 | 描述 | 验证需求 |
|------|------|----------|
| Property 1 | Session 数据结构完整性 | Req 1.1, 1.2, 1.4 |
| Property 2 | Session ID 唯一性 | Req 1.3 |
| Property 4 | 消息添加后异步持久化 | Req 2.1 |
| Property 5 | 新建 Session 成为活跃 Session | Req 3.1 |
| Property 6 | 删除 Session 后数据完全移除 | Req 3.3 |
| Property 7 | 删除活跃 Session 后自动切换 | Req 3.4 |
| Property 8 | 首条消息自动生成标题 | Req 3.5 |
| Property 9 | Session 列表按更新时间降序排列 | Req 4.2 |

## 单元测试

### SessionStorage 单元测试

- IndexedDB 为空时 loadAll 返回空列表
- save 和 loadAll 的基本读写
- saveAll 批量写入
- remove 删除指定 Session
- 侧边栏折叠状态读写（localStorage）
- IndexedDB 错误处理

### SessionManager 单元测试

- `init()` 异步初始化（从 IndexedDB 加载）
- `createSession()` 创建并设为活跃
- `deleteSession()` 删除后自动切换
- 删除最后一个 Session 后 activeSessionId 为 null
- `addMessage()` 添加消息并更新 updatedAt
- 向不存在的 Session 添加消息时静默忽略
- `updateTitle()` 更新标题
- `generateTitle()` 标题截取规则
- `getAllSessions()` 按 updatedAt 降序排列

### SessionSidebar 组件测试

- 折叠/展开状态渲染
- Session 列表显示
- 活跃 Session 高亮
- 新建/删除/切换操作

## 测试环境配置

- `fake-indexeddb`: 在 Node.js 中模拟完整的 IndexedDB API
- 每个测试用例独立，测试前清空 IndexedDB 数据库
- 所有涉及存储的测试使用 `async/await`
- localStorage 使用 vitest 内置 mock

## 手动测试

### 工具调用测试

1. 配置 OpenAI API Key
2. 测试 Calculator: "42 乘以 17 等于多少？"
3. 测试 Get Current Time: "现在几点了？"
4. 测试多步工具调用: "计算 100 除以 4，然后告诉我东京现在几点"

### Session 管理测试

1. 创建新会话（推荐问题 + 自定义输入）
2. 发送消息后检查标题自动生成
3. 切换会话，验证消息历史完整恢复
4. 删除会话，验证自动切换行为
5. 刷新页面，验证所有会话从 IndexedDB 恢复
6. 测试侧边栏折叠/展开及状态持久化
7. 测试移动端响应式布局（< 768px）

### MCP 集成测试

1. 配置 MCP 服务器
2. 启用 MCP 并连接
3. 验证 MCP 工具可被 AI 调用
4. 测试断开重连

### 错误场景测试

- 无效 API Key
- 网络中断
- 工具执行失败（如除以零）
- 快速连续发送消息
