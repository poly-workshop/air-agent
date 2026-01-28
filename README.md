# Air Agent

A static AI agent chat interface with direct client-side OpenAI API integration. This is a fully client-side application that can be deployed to GitHub Pages with no backend required.

## Features

- 🤖 **AI Chat Interface** - Interactive chat with OpenAI models
- 🛠️ **Automatic Tool Calling** - AI can automatically use tools/functions with streaming responses
- 📊 **Built-in Tools** - Calculator, time, weather (mock), and easy to add custom tools
- 🔄 **Streaming Responses** - Real-time streaming of AI responses
- 🔌 **MCP Support** - Full Model Context Protocol integration for browser-based tool discovery
- 🌐 **MCP Server Configuration** - Configure and manage MCP servers directly in the browser
- 🎛️ **Per-Chat MCP Control** - Enable/disable MCP and select servers per conversation
- 🎨 **Theme Support** - Light, Dark, and System themes (similar to shadcn.com/create)
- ⚙️ **Configurable Settings** - API key, base URL, and model selection
- 💾 **Local Storage** - All settings stored in browser localStorage
- 📦 **No Backend Required** - Fully static site deployable to GitHub Pages
- 🎯 **Modern UI** - Built with shadcn/ui components

## Screenshots

### Light Theme

![Light Theme](https://github.com/user-attachments/assets/6550d352-7818-44ab-89a1-6e63ae403806)

### Dark Theme

![Dark Theme](https://github.com/user-attachments/assets/a967ce1e-438e-4db8-9d81-74e3bf83aeda)

### Settings Dialog

![Settings Dialog](https://github.com/user-attachments/assets/a440bb69-5b77-4890-b8ed-303c827f78c1)

### Theme Selector

![Theme Selector](https://github.com/user-attachments/assets/653e099e-5a4a-4d8c-aaeb-a9e2be014094)

### MCP Configuration

![MCP Configuration Dialog](https://github.com/user-attachments/assets/80526258-f37c-4516-bf44-103cf1457362)

![MCP Server Form](https://github.com/user-attachments/assets/7d206c3d-a379-4a0f-9601-da8bd7ce0416)

![MCP Server List](https://github.com/user-attachments/assets/f2aab3b3-f967-430f-a50b-432fd3cbcf34)

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/poly-workshop/air-agent.git
cd air-agent
```

1. Install dependencies:

```bash
npm install
```

1. Run the development server:

```bash
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

Build the static site:

```bash
npm run build
```

The static files will be generated in the `out` directory.

## Configuration

Click the settings icon (⚙️) in the top right corner to configure:

### OpenAI API Key

Your OpenAI API key (required). Get one from [OpenAI Platform](https://platform.openai.com/api-keys).

### OpenAI Base URL (Optional)

Custom API endpoint if you're using a different OpenAI-compatible service. Default: `https://api.openai.com/v1`

### Theme

Choose between Light, Dark, or System theme.

All settings are stored locally in your browser's localStorage and never sent to any server except the OpenAI API.

## MCP (Model Context Protocol) Configuration

Air Agent supports the Model Context Protocol, allowing you to connect to external MCP servers to extend the AI's capabilities with custom tools and resources.

### Setting Up MCP Servers

1. **Open MCP Configuration**: Click the MCP configuration icon (⚙️) next to the settings icon in the top right corner
2. **Add a Server**: Click "Add Server" to configure a new MCP server
3. **Configure Server Details**:
   - **Server Name**: A friendly name for your MCP server
   - **Server URL**: Full URL to your MCP server endpoint (e.g., `https://mcp-server.example.com`)
   - **Description**: Optional description of what the server provides
   - **API Key**: Optional authentication token (if your server requires it)
   - **Enable**: Toggle to enable/disable the server

4. **Save**: Click "Add Server" to save the configuration

### Using MCP in Chat

Once you have configured MCP servers:

1. **Enable MCP**: Click the "MCP Disabled" button in the chat interface to enable MCP
2. **Select Server**: Choose which MCP server to use from the dropdown
3. **Start Chatting**: The AI will automatically discover and use tools from the connected MCP server

### Connection Status

The chat interface shows the MCP connection status:
- **MCP Connected**: Successfully connected to the server and tools are available
- **MCP Connecting...**: Attempting to connect to the server
- **MCP Error**: Connection failed (check the error message for details)

### Requirements for MCP Servers

Since Air Agent is a browser-only application, your MCP server must:

1. **Support HTTP/SSE Transport**: Use the Streamable HTTP transport protocol
2. **Enable CORS**: Configure CORS headers to allow browser access from your deployment domain
3. **Be Publicly Accessible**: The server must be reachable from your browser (localhost won't work for deployed apps)

### Troubleshooting MCP Connections

**Connection Failed / CORS Error**
- Ensure your MCP server has CORS properly configured
- Check that the server URL is correct and publicly accessible
- Verify that the server supports the Streamable HTTP transport

**Tools Not Appearing**
- Make sure the MCP server is enabled in the configuration
- Check that MCP is enabled for the current chat
- Verify the server is returning tools in its `tools/list` response

**Authentication Errors**
- Check that the API key is correct
- Ensure the server expects Bearer token authentication
- Verify the token has the necessary permissions

## Tool Support

Air Agent now supports automatic tool calling with streaming responses. When the AI needs to use a tool:

1. The AI decides which tool to call based on the conversation
2. The tool executes automatically (e.g., calculator, time check, weather)
3. Results are sent back to the AI
4. The AI continues its response with the tool results
5. All happens seamlessly in one conversation flow

### Built-in Tools

- **Calculator**: Performs arithmetic operations (add, subtract, multiply, divide)
- **Get Current Time**: Returns current date and time with timezone support
- **Get Weather**: Returns mock weather data for demonstration

### Adding Custom Tools

See [TOOL_IMPLEMENTATION.md](./TOOL_IMPLEMENTATION.md) for detailed documentation on:

- Creating custom tools
- MCP (Model Context Protocol) compatibility
- Tool architecture and API
- Best practices and examples

## Deployment

### GitHub Pages

This repository includes a GitHub Actions workflow for automatic deployment to GitHub Pages.

1. Enable GitHub Pages in your repository settings:
   - Go to Settings → Pages
   - Set Source to "GitHub Actions"

2. Push to the `main` branch:

```bash
git push origin main
```

The site will be automatically built and deployed to `https://<username>.github.io/air-agent/`

### Manual Deployment

You can deploy the `out` directory to any static hosting service:

- **Vercel**: `vercel --prod`
- **Netlify**: Drag and drop the `out` folder
- **AWS S3**: Upload the `out` folder to your bucket
- **Any static host**: Upload the contents of `out` directory

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **AI Integration**: Direct OpenAI API calls (client-side)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v3
- **Theme**: next-themes
- **Icons**: Lucide React
- **Language**: TypeScript

## Privacy & Security

- All API keys are stored locally in your browser
- No data is sent to any third-party services except OpenAI
- The application is completely client-side with no backend
- Your conversations are not logged or stored anywhere

## Development

### Project Structure

```text
air-agent/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── chat-interface.tsx
│   ├── settings-dialog.tsx
│   ├── theme-provider.tsx
│   └── theme-selector.tsx
├── lib/                   # Utility functions
│   └── utils.ts
├── public/               # Static assets
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Pages deployment
└── next.config.ts        # Next.js configuration
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server (not needed for static export)
- `npm run lint` - Run ESLint

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
