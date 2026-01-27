# Air Agent

A static AI agent chat interface with direct client-side OpenAI API integration. This is a fully client-side application that can be deployed to GitHub Pages with no backend required.

## Features

- 🤖 **AI Chat Interface** - Interactive chat with OpenAI models
- 🎨 **Theme Support** - Light, Dark, and System themes (similar to shadcn.com/create)
- ⚙️ **Configurable Settings** - API key, base URL, and MCP settings
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

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

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

### MCP Settings (JSON)
Model Context Protocol settings in JSON format. This can be used for additional configuration.

### Theme
Choose between Light, Dark, or System theme.

All settings are stored locally in your browser's localStorage and never sent to any server except the OpenAI API.

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

```
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