#!/bin/bash
# Claudette Quick Start Helper

echo "🚀 Starting Claudette with keychain integration..."

# Export keys from keychain
if security find-generic-password -s "openai-api-key" -a "openai" >/dev/null 2>&1; then
    export OPENAI_API_KEY=$(security find-generic-password -s "openai-api-key" -a "openai" -w)
    echo "✅ OpenAI key loaded"
fi

if security find-generic-password -s "codellm-api-key" -a "codellm" >/dev/null 2>&1; then
    export CODELLM_API_KEY=$(security find-generic-password -s "codellm-api-key" -a "codellm" -w)
    echo "✅ CodeLLM key loaded"
fi

# Start Claudette
echo "🎯 Claudette ready for commands!"
echo "Usage examples:"
echo "  npx ts-node src/cli/index.ts status"
echo "  npx ts-node src/cli/index.ts \"Your prompt here\""
echo "  npx ts-node src/cli/index.ts --backend qwen \"Your prompt\""
echo ""
echo "🔗 MCP Integration available in Claude Code:"
echo "  Use claudette_query, claudette_status, claudette_analyze tools"
