#!/bin/bash
# Claudette Bootstrap - Gentle startup with keychain integration
# Science Officer Claude & XO Claudette - Impulse Power Mode

# Colors for status
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 Claudette Bootstrap - Impulse Power Startup"
echo "=============================================="
echo "🔋 Starting slow... checking warp nacelles..."

# Basic system check
check_system() {
    echo ""
    echo "🔍 System Status Check:"
    
    # Check if we're in the right directory
    if [[ -f "package.json" ]] && grep -q "claudette" package.json; then
        echo -e "${GREEN}✅ Claudette project directory confirmed${NC}"
    else
        echo -e "${RED}❌ Not in Claudette directory${NC}"
        return 1
    fi
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        echo -e "${GREEN}✅ Node.js available: $node_version${NC}"
    else
        echo -e "${RED}❌ Node.js not found${NC}"
        return 1
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        echo -e "${GREEN}✅ npm available${NC}"
    else
        echo -e "${RED}❌ npm not found${NC}"
        return 1
    fi
    
    return 0
}

# Gentle keychain detection
detect_keychains() {
    echo ""
    echo "🔐 Keychain Detection (Impulse Scan):"
    
    local keys_found=0
    
    # Look for OpenAI key
    if security find-generic-password -s "openai-api-key" -a "openai" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ OpenAI API key detected in keychain${NC}"
        ((keys_found++))
    else
        echo -e "${YELLOW}⚠️  OpenAI API key not found in keychain${NC}"
    fi
    
    # Look for CodeLLM/Qwen key  
    if security find-generic-password -s "codellm-api-key" -a "codellm" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ CodeLLM API key detected in keychain${NC}"
        ((keys_found++))
    else
        echo -e "${YELLOW}⚠️  CodeLLM API key not found in keychain${NC}"
    fi
    
    echo -e "${BLUE}📊 Keys available: $keys_found/2${NC}"
    return $keys_found
}

# Basic configuration check
check_configuration() {
    echo ""
    echo "⚙️  Configuration Status:"
    
    if [[ -f "claudette.config.json" ]]; then
        echo -e "${GREEN}✅ Configuration file exists${NC}"
        
        # Basic config validation
        if command -v jq >/dev/null 2>&1; then
            local openai_enabled=$(jq -r '.backends.openai.enabled' claudette.config.json 2>/dev/null)
            local qwen_enabled=$(jq -r '.backends.qwen.enabled' claudette.config.json 2>/dev/null)
            
            echo "   - OpenAI backend: $openai_enabled"
            echo "   - Qwen backend: $qwen_enabled"
        else
            echo -e "${BLUE}ℹ️  Install jq for detailed config analysis${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No configuration file found${NC}"
        echo "   Will use defaults when started"
    fi
}

# Test basic functionality
test_basic_functions() {
    echo ""
    echo "🧪 Basic Function Test (Low Power):"
    
    # Check if TypeScript compiles
    if npm run build >/dev/null 2>&1; then
        echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
    else
        echo -e "${RED}❌ TypeScript compilation failed${NC}"
        return 1
    fi
    
    # Check if Claudette can start (status only)
    echo "📡 Testing Claudette status check..."
    if timeout 10s npx ts-node src/cli/index.ts status >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Claudette status command works${NC}"
    else
        echo -e "${YELLOW}⚠️  Claudette status check had issues (expected without API keys)${NC}"
    fi
    
    return 0
}

# Configure MCP Integration
configure_mcp() {
    echo ""
    echo "🔗 MCP Integration Setup:"
    
    local claude_config_dir="$HOME/.claude"
    local mcp_server_path="$(pwd)/claudette-mcp-server.js"
    
    # Check if MCP server exists
    if [[ -f "$mcp_server_path" ]]; then
        echo -e "${GREEN}✅ MCP server found: claudette-mcp-server.js${NC}"
    else
        echo -e "${RED}❌ MCP server not found${NC}"
        return 1
    fi
    
    # Check Claude config directory
    if [[ -d "$claude_config_dir" ]]; then
        echo -e "${GREEN}✅ Claude config directory found${NC}"
    else
        echo -e "${YELLOW}⚠️  Claude config directory not found, creating...${NC}"
        mkdir -p "$claude_config_dir"
    fi
    
    # Create or update Claude settings with MCP configuration
    local settings_file="$claude_config_dir/settings.json"
    
    if [[ -f "$settings_file" ]]; then
        echo "📝 Updating existing Claude settings with MCP configuration..."
        
        # Backup existing settings
        cp "$settings_file" "$settings_file.bak.$(date +%Y%m%d_%H%M%S)"
        
        # Use jq to add MCP configuration if available
        if command -v jq >/dev/null 2>&1; then
            jq --arg server_path "$mcp_server_path" '
                .mcpServers.claudette = {
                    "command": "node",
                    "args": [$server_path],
                    "description": "Claudette AI system integration for seamless background task execution",
                    "capabilities": ["tools", "resources"],
                    "timeout": 60000,
                    "env": {
                        "NODE_ENV": "production"
                    }
                } |
                .logging.level = "info"
            ' "$settings_file" > "$settings_file.tmp" && mv "$settings_file.tmp" "$settings_file"
            echo -e "${GREEN}✅ MCP configuration added to Claude settings${NC}"
        else
            echo -e "${YELLOW}⚠️  jq not available, manual MCP setup required${NC}"
        fi
    else
        echo "📝 Creating new Claude settings with MCP configuration..."
        cat > "$settings_file" << EOF
{
  "mcpServers": {
    "claudette": {
      "command": "node",
      "args": ["$mcp_server_path"],
      "description": "Claudette AI system integration for seamless background task execution",
      "capabilities": ["tools", "resources"],
      "timeout": 60000,
      "env": {
        "NODE_ENV": "production"
      }
    }
  },
  "logging": {
    "level": "info"
  }
}
EOF
        echo -e "${GREEN}✅ Created Claude settings with MCP configuration${NC}"
    fi
    
    return 0
}

# Create simple startup script
create_startup_script() {
    echo ""
    echo "📝 Creating startup helper..."
    
    cat > claudette-start.sh << 'EOF'
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
EOF
    
    chmod +x claudette-start.sh
    echo -e "${GREEN}✅ Created claudette-start.sh${NC}"
}

# Main bootstrap sequence
main() {
    echo ""
    echo "🌟 Beginning gentle bootstrap sequence..."
    
    # Phase 1: System check
    if ! check_system; then
        echo -e "${RED}💥 System check failed. Aborting bootstrap.${NC}"
        exit 1
    fi
    
    # Phase 2: Keychain detection
    detect_keychains
    local key_count=$?
    
    # Phase 3: Configuration
    check_configuration
    
    # Phase 4: Basic tests
    if test_basic_functions; then
        echo -e "${GREEN}✅ Basic functionality confirmed${NC}"
    else
        echo -e "${YELLOW}⚠️  Some issues detected, but continuing...${NC}"
    fi
    
    # Phase 5: MCP Integration
    if configure_mcp; then
        echo -e "${GREEN}✅ MCP integration configured${NC}"
        local mcp_status="Configured"
    else
        echo -e "${YELLOW}⚠️  MCP integration setup had issues${NC}"
        local mcp_status="Partial"
    fi
    
    # Phase 6: Helper creation
    create_startup_script
    
    # Summary
    echo ""
    echo "📊 BOOTSTRAP SUMMARY:"
    echo "===================="
    echo -e "System Status: ${GREEN}Ready${NC}"
    echo "API Keys: $key_count/2 available"
    echo "Configuration: $([ -f claudette.config.json ] && echo 'Present' || echo 'Default')"
    echo "MCP Integration: $mcp_status"
    echo ""
    echo "🎯 NEXT STEPS:"
    echo "1. Run: ./claudette-start.sh"
    echo "2. Test: npx ts-node src/cli/index.ts status"
    echo "3. Use: npx ts-node src/cli/index.ts \"Hello Claudette\""
    echo "4. Use Claude Code MCP tools: claudette_query, claudette_status, claudette_analyze"
    echo ""
    echo "🖖 Bootstrap complete. Ready for warp when you are, Captain!"
}

# Execute bootstrap
main "$@"