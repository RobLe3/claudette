#!/bin/bash
# Setup script to fix ~/.claudette/config.yaml permissions

echo "🔧 Setting up claudette configuration..."

# Check if ~/.claudette exists and fix ownership
if [ -d ~/.claudette ]; then
    echo "📁 .claudette directory exists, checking permissions..."
    if [ ! -w ~/.claudette ]; then
        echo "⚠️  .claudette directory is not writable"
        echo "🔐 Please run: sudo chown -R $(whoami):staff ~/.claudette"
        echo "📋 Then copy the config: cp claudette_config.yaml ~/.claudette/config.yaml"
    else
        echo "✅ .claudette directory is writable"
        cp claudette_config.yaml ~/.claudette/config.yaml 2>/dev/null && echo "✅ Config file copied successfully" || echo "❌ Failed to copy config file"
    fi
else
    echo "📁 Creating .claudette directory..."
    mkdir -p ~/.claudette
    cp claudette_config.yaml ~/.claudette/config.yaml && echo "✅ Config file created successfully"
fi

# Test configurations
echo ""
echo "🧪 Testing configurations..."

echo "├── claude command: $(which claude 2>/dev/null || echo 'NOT FOUND')"
echo "├── claudette command: $(which claudette 2>/dev/null || echo 'NOT FOUND')"
echo "├── claude-enhanced script: $(ls /Users/roble/Documents/Python/claude_flow/claude-enhanced 2>/dev/null || echo 'NOT FOUND')"
echo "├── claudette config: $(ls ~/.claudette/config.yaml 2>/dev/null || echo 'MISSING')"
echo "└── Local config: $(ls claudette_config.yaml 2>/dev/null || echo 'MISSING')"

echo ""
echo "🎯 To complete setup:"
echo "1. Run: source ~/.zshrc"
echo "2. Test: claude_status"
echo "3. Use: claude-tier2 for enhanced mode"
echo "4. Use: claude-tier3 for swarm mode"