# Usage Guide

## Quick Start

1. **Open the Application**
   - Visit the deployed site at `https://poly-workshop.github.io/air-agent/`
   - Or run locally with `npm run dev`

2. **Configure Settings**
   - Click the settings icon (⚙️) in the top right corner
   - Enter your OpenAI API key (required)
   - Optionally configure:
     - Model (GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo)
     - Base URL (for custom OpenAI-compatible endpoints)
     - MCP Settings (JSON configuration for Model Context Protocol)
   - Click "Save Settings"

3. **Start Chatting**
   - Type your message in the input field
   - Press Enter or click the send button
   - The AI will respond to your message

## Features

### Theme Customization
- Light theme for bright environments
- Dark theme for low-light environments
- System theme to match your OS settings
- Change themes anytime from the settings dialog

### Persistent Settings
All your settings are saved in your browser's localStorage:
- API credentials never leave your browser
- Settings persist across sessions
- Clear your browser data to reset

### Model Selection
Choose the model that fits your needs:
- **GPT-4o**: Latest and most capable model
- **GPT-4o Mini**: Fast and cost-effective
- **GPT-4 Turbo**: Large context window
- **GPT-4**: High-quality responses
- **GPT-3.5 Turbo**: Fast and economical

### MCP Settings
Model Context Protocol settings allow you to:
- Configure custom prompts
- Set system messages
- Adjust model parameters
- Must be valid JSON format

## Tips

1. **API Key Security**
   - Never share your API key
   - Keep it in your browser only
   - Revoke and regenerate if compromised

2. **Cost Management**
   - Monitor your OpenAI usage
   - Use cheaper models for simple tasks
   - Clear chat history when done

3. **Privacy**
   - All processing happens in your browser
   - No data sent to third parties (except OpenAI)
   - Conversations are not stored anywhere

## Troubleshooting

### "Please configure your OpenAI API key"
- Open settings and add a valid API key
- Ensure the key starts with "sk-"
- Check that the key is active in your OpenAI account

### API Errors
- Verify your API key is correct
- Check your OpenAI account has credits
- Ensure base URL is correct (if using custom endpoint)
- Check browser console for detailed error messages

### JSON Validation Error
- Ensure MCP settings are valid JSON
- Use a JSON validator if unsure
- Empty `{}` is valid if you don't need MCP settings

### Theme Not Changing
- Try refreshing the page
- Check browser console for errors
- Clear browser cache if needed
