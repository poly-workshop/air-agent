# Testing Guide

## Testing Tool Call Functionality

This guide helps you test the automatic tool calling feature in Air Agent.

## Prerequisites

1. Have a valid OpenAI API key
2. Running the app (locally or deployed)
3. Access to a model that supports function calling (gpt-4o-mini, gpt-4o, gpt-4-turbo, etc.)

## Basic Testing Steps

### 1. Configure the Application

1. Start the application:

   ```bash
   npm run dev
   ```

2. Open <http://localhost:3000> in your browser

3. Click the settings icon (⚙️) in the top right

4. Enter your OpenAI API key

5. Select a model that supports function calling (e.g., `gpt-4o-mini`)

6. Click "Save Settings"

### 2. Test Calculator Tool

Try these example prompts:

**Simple Calculation:**

```
What is 42 multiplied by 17?
```

Expected behavior:

- The AI should recognize it needs to use the calculator
- You'll see a "calculator" badge appear
- A loading indicator will show "Executing tools: calculator"
- The AI will respond with the result (714)

**Multiple Calculations:**

```
What is 15 + 23, and then divide that result by 2?
```

Expected behavior:

- The AI may call the calculator multiple times
- Each tool call will show in the UI
- Final answer should be provided

### 3. Test Current Time Tool

Try these example prompts:

**Get Current Time:**

```
What time is it right now?
```

Expected behavior:

- Tool call to `get_current_time`
- AI responds with current date and time

**Time in Different Timezone:**

```
What time is it in Tokyo?
```

Expected behavior:

- Tool call to `get_current_time` with timezone parameter
- AI responds with Tokyo time

### 4. Test Multi-Step Workflows

Try prompts that require multiple tool calls:

**Complex Query:**

```
Calculate 100 divided by 4, and then tell me what time it is in Tokyo.
```

Expected behavior:

- First tool call: calculator
- Second tool call: get_current_time
- AI synthesizes both results in the response

### 5. Test Streaming Behavior

Pay attention to the UI during tool execution:

1. **Content Streaming**: Text appears character by character
2. **Tool Execution Indicator**: Shows which tools are running
3. **Tool Call Badges**: Display on assistant messages
4. **Continuous Flow**: No interruption between tool calls and response

## Visual Indicators to Look For

### During Execution

- **Loading Spinner**: Shows when waiting for initial response
- **Tool Execution Banner**: "Executing tools: [tool_name]"
- **Streaming Text**: Assistant response appears gradually

### After Completion

- **Tool Call Badges**: Small badges showing which tools were used
- **Tool Result Messages**: (Optional) Detailed tool results in muted style
- **Final Response**: Clean, natural language response incorporating tool results

## Error Testing

### Invalid API Key

1. Enter an invalid API key in settings
2. Try to send a message
3. Should see error message displayed in UI

### Tool Execution Failure

Tools are designed to handle errors gracefully. Try:

```
Calculate 10 divided by 0
```

Expected behavior:

- Tool executes
- Returns error: "Cannot divide by zero"
- AI acknowledges the error in its response

### Network Issues

If network connection is lost during streaming:

- Error message should be displayed
- Previous messages remain visible
- Can retry after connection is restored

## Advanced Testing

### Test Tool Loop Limit

Try a prompt that might cause excessive tool calls:

```
Keep calculating squares starting from 2 until you reach a very large number
```

The system has a limit of 5 tool iterations per message to prevent infinite loops.

### Test Concurrent Tool Usage

```
Tell me the current time, calculate 25 times 4, and give me the weather in London, all at once.
```

Tools execute sequentially but should complete in one conversational flow.

## Debugging

### Check Browser Console

Open browser developer tools (F12) and check the console for:

- Network requests to OpenAI API
- Tool execution logs
- Error messages
- Streaming data

### Common Issues

**Tools Not Being Called:**

- Verify model supports function calling
- Check API key is valid
- Ensure prompts clearly indicate need for tool
- Check console for errors

**Streaming Not Working:**

- Verify network connection
- Check API endpoint is accessible
- Look for errors in console

**UI Not Updating:**

- Refresh the page
- Clear browser cache
- Check for JavaScript errors in console

## Manual Testing Checklist

Use this checklist to verify all functionality:

- [ ] Calculator: Addition
- [ ] Calculator: Subtraction
- [ ] Calculator: Multiplication
- [ ] Calculator: Division
- [ ] Calculator: Division by zero (error handling)
- [ ] Get Current Time: Default timezone
- [ ] Get Current Time: Custom timezone
- [ ] Multi-step: Multiple tool calls in one message
- [ ] Streaming: Content appears progressively
- [ ] UI Indicators: Tool badges display correctly
- [ ] UI Indicators: Loading states work
- [ ] Error Handling: Invalid API key
- [ ] Error Handling: Network error
- [ ] Error Handling: Tool execution error
- [ ] Edge Case: Very long responses
- [ ] Edge Case: Rapid message sending

## Expected vs Actual Results

When testing, document any deviations from expected behavior:

**Template:**

```
Test: [Description]
Expected: [What should happen]
Actual: [What did happen]
Issue: [If different from expected]
```

## Performance Testing

Check these aspects:

1. **Response Time**: First token should appear within 2-3 seconds
2. **Tool Execution**: Should complete within 1-2 seconds per tool
3. **Streaming**: Smooth, continuous text appearance
4. **UI Responsiveness**: No lag or freezing during streaming

## Reporting Issues

If you find issues, include:

1. Browser and version
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Console errors (if any)
6. Screenshots or screen recordings

## Next Steps

After testing:

1. Try creating custom tools (see TOOL_IMPLEMENTATION.md)
2. Test with different models
3. Test with different types of queries
4. Explore edge cases
5. Test on different devices/browsers
