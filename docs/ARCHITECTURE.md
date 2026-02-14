# Air Agent 架构图

```mermaid
graph TB
    subgraph Browser["浏览器 (纯前端)"]
        subgraph UI["UI 层 (React Components)"]
            Layout["layout.tsx<br/>ThemeProvider"]
            Page["page.tsx<br/>状态管理 & Settings"]
            Chat["ChatInterface<br/>聊天主界面"]
            SettingsDrawer["SettingsDrawer<br/>设置面板"]
            McpToggle["McpToggle<br/>MCP 开关"]
            McpConfigDialog["McpConfigDialog<br/>MCP 服务器配置"]
            MarkdownRenderer["MarkdownRenderer"]
            ToolResult["ToolResult<br/>工具结果展示"]
        end

        subgraph Core["核心逻辑层 (lib/)"]
            AiSdk["AiSdkService<br/>AI 调用 & 流式解析"]
            PromptTemplate["buildSystemPrompt<br/>系统提示词构建<br/>模板变量 + Transitive Thinking"]
            ToolRegistry["ToolRegistry<br/>工具注册中心"]
            DefaultTools["Default Tools<br/>calculator / get_current_time"]
            Constants["Constants<br/>默认模型 / URL / 存储 Key"]
        end

        subgraph MCP_Client["MCP 客户端层 (lib/mcp/)"]
            McpClient["McpClient<br/>Streamable HTTP 传输"]
            McpStorage["MCP Storage<br/>localStorage 读写"]
            McpTypes["MCP Types<br/>类型定义"]
            McpToolAdapter["mcpToolToAirAgentTool<br/>MCP→Tool 适配器"]
        end

        LocalStorage[("localStorage<br/>Settings / MCP 配置")]
    end

    subgraph External["外部服务"]
        LLM_API["OpenAI 兼容 API<br/>/chat/completions<br/>(流式 SSE)"]
        MCP_Server["MCP Server<br/>(远程 HTTP)"]
    end

    subgraph BuiltIn_MCP["内置 MCP Server (可选)<br/>server/mcp/handler.ts"]
        McpHandler["Next.js API Route<br/>Streamable HTTP Transport<br/>Session 管理"]
        BuiltInTools["内置 MCP 工具<br/>greet / get_time"]
    end

    %% UI 层关系
    Layout --> Page
    Page --> Chat
    Page --> SettingsDrawer
    SettingsDrawer --> McpConfigDialog
    Chat --> McpToggle
    Chat --> MarkdownRenderer
    Chat --> ToolResult

    %% 设置流
    Page -- "读写设置" --> LocalStorage
    McpConfigDialog -- "增删改 MCP 服务器" --> McpStorage
    McpStorage -- "持久化" --> LocalStorage
    McpToggle -- "启用/选择 MCP 服务器" --> Chat

    %% AI 调用流
    Chat -- "1. 构建 System Prompt" --> PromptTemplate
    Chat -- "2. 注册内置工具" --> ToolRegistry
    ToolRegistry -- "内置工具" --> DefaultTools
    Chat -- "3. 发送消息" --> AiSdk
    AiSdk -- "HTTP POST (stream: true)" --> LLM_API
    LLM_API -- "SSE 流式响应" --> AiSdk
    AiSdk -- "流式回调 onStreamChunk" --> Chat

    %% Tool Call 循环
    AiSdk -- "4. 解析 tool_calls" --> ToolRegistry
    ToolRegistry -- "执行工具 & 返回结果" --> AiSdk
    AiSdk -- "5. 带 tool 结果再次请求 LLM" --> LLM_API

    %% MCP 调用流
    Chat -- "连接 MCP" --> McpClient
    McpClient -- "Streamable HTTP" --> MCP_Server
    McpClient -- "listTools()" --> MCP_Server
    McpClient -- "callTool()" --> MCP_Server
    McpToolAdapter -- "转换为 Tool 格式" --> ToolRegistry
    McpClient --> McpToolAdapter

    %% 内置 MCP Server
    MCP_Server -. "可以是内置的" .-> McpHandler
    McpHandler --> BuiltInTools

    %% Transitive Thinking
    Chat -- "Transitive Thinking<br/>(额外一轮推理请求)" --> LLM_API

    %% 样式
    classDef uiClass fill:#e1f5fe,stroke:#0288d1
    classDef coreClass fill:#f3e5f5,stroke:#7b1fa2
    classDef mcpClass fill:#e8f5e9,stroke:#388e3c
    classDef externalClass fill:#fff3e0,stroke:#f57c00
    classDef storageClass fill:#fce4ec,stroke:#c62828

    class Layout,Page,Chat,SettingsDrawer,McpToggle,McpConfigDialog,MarkdownRenderer,ToolResult uiClass
    class AiSdk,PromptTemplate,ToolRegistry,DefaultTools,Constants coreClass
    class McpClient,McpStorage,McpTypes,McpToolAdapter mcpClass
    class LLM_API,MCP_Server externalClass
    class LocalStorage storageClass
    class McpHandler,BuiltInTools mcpClass
```

## 核心数据流说明

### AI 调用流程
1. 用户输入消息 → `ChatInterface` 捕获
2. `buildSystemPrompt` 构建系统提示词（支持模板变量 + Transitive Thinking）
3. 若开启 Transitive Thinking，先发一轮"推理链"请求，再发正式请求
4. `AiSdkService.sendMessage()` 通过 `fetch` 调用 OpenAI 兼容 API（流式 SSE）
5. 流式解析 `data: {...}` 块，实时更新 UI

### Tool Call 自动循环
1. LLM 返回 `tool_calls` → `AiSdkService` 解析
2. 通过 `ToolRegistry.executeTool()` 执行工具（内置工具或 MCP 工具）
3. 将工具结果作为 `role: "tool"` 消息追加到对话
4. 再次请求 LLM，直到无 tool_calls 或达到最大迭代次数（默认 5）

### MCP 集成流程
1. 用户在 `McpConfigDialog` 中配置 MCP 服务器（URL、API Key），存入 localStorage
2. 在 `McpToggle` 中启用并选择服务器
3. `ChatInterface` 创建 `McpClient`，通过 Streamable HTTP 连接 MCP 服务器
4. `listTools()` 获取远程工具列表
5. `mcpToolToAirAgentTool()` 将 MCP 工具适配为统一的 `Tool` 格式，注册到 `ToolRegistry`
6. 之后 LLM 可以像调用内置工具一样调用 MCP 工具

### 存储
所有配置（API Key、模型、MCP 服务器列表等）均存储在浏览器 `localStorage` 中，无后端依赖。
