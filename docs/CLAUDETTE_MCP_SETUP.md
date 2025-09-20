# 🚀 Claudette MCP Integration Setup

## Overview
This MCP (Model Context Protocol) server enables seamless integration between Claude Code and Claudette, allowing background task execution without manual confirmation.

## Quick Setup

### 1. Automatic Setup (Recommended)

The easiest way to set up MCP integration is using the Claudette bootstrap script:

```bash
# Run the bootstrap script from the Claudette project directory
./claudette-bootstrap.sh
```

This will automatically:
- ✅ Detect the MCP server file
- ✅ Configure Claude Code settings with MCP integration
- ✅ Create backup of existing settings
- ✅ Test the configuration

### 2. MCP Server Configuration

The MCP server (`claudette-mcp-server.js`) provides these tools:
- `claudette_query` - Execute queries through Claudette AI
- `claudette_status` - Get system status
- `claudette_analyze` - Perform aNEOS analysis

### 3. Manual Claude Code Configuration (if needed)

If you prefer manual setup, add to your Claude Code configuration (usually `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "claudette": {
      "command": "node",
      "args": ["./claudette-mcp-server.js"],
      "description": "Claudette AI system integration",
      "capabilities": ["tools", "resources"]
    }
  }
}
```

### 4. Test MCP Integration

```bash
# Test the MCP server directly
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node claudette-mcp-server.js
```

### 5. Usage in Claude Code

Once configured, you can use these tools without manual confirmation:

- **claudette_query**: Execute Claudette queries
  ```
  Use the claudette_query tool with prompt "Analyze the current system status"
  ```

- **claudette_status**: Check system health
  ```
  Use the claudette_status tool to get current operational status
  ```

- **claudette_analyze**: Perform aNEOS analysis
  ```
  Use the claudette_analyze tool with target "2024 XY123" for NEO analysis
  ```

## Features

### Automatic API Key Management
- Automatically loads API keys from macOS keychain
- No manual environment variable setup required
- Secure credential handling

### Background Execution  
- No confirmation dialogs for each task
- Seamless integration with Claude Code workflow
- Automated timeout handling (30s default)

### Error Handling
- Graceful failure recovery
- Detailed error messages
- Timeout protection

## Troubleshooting

### MCP Server Not Starting
```bash
# Re-run bootstrap to check configuration
./claudette-bootstrap.sh

# Check Node.js availability
node --version

# Test server manually
node ./claudette-mcp-server.js
```

### API Key Issues
```bash
# Verify keychain access
security find-generic-password -s "openai-api-key" -a "openai" -w
security find-generic-password -s "codellm-api-key" -a "codellm" -w
```

### Claude Code Configuration
```bash
# Check Claude Code config location
claude config show
```

## Advanced Configuration

### Custom Timeout
Modify the server timeout in `claudette-mcp-server.js`:
```javascript
setTimeout(() => {
  child.kill('SIGTERM');
  reject(new Error('Claudette query timeout (60s)'));  // Increase from 30s
}, 60000);
```

### Additional Backends
Add more backends to the query tool by modifying the `executeClaudetteQuery` method.

### Logging
Enable detailed logging by setting environment variable:
```bash
export MCP_LOG_LEVEL=debug
```

## Integration Benefits

1. **No Manual Confirmation**: Execute Claudette operations seamlessly
2. **Background Processing**: Long-running tasks don't block Claude Code
3. **Automatic Recovery**: Timeout and error handling built-in
4. **Secure**: API keys managed through system keychain
5. **Extensible**: Easy to add new tools and capabilities

## Status: READY FOR DEPLOYMENT

The MCP integration is fully configured and ready for use with Claude Code.