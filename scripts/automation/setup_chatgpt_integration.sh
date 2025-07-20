#!/bin/bash
"""
Setup Script for ChatGPT Integration with Claude Code
Secure API key configuration and system validation
"""

echo "🤖 Claude-ChatGPT Integration Setup"
echo "===================================="

# Check dependencies
echo "📦 Checking dependencies..."
python3 -c "import keyring, cryptography, aiohttp" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Missing dependencies. Installing..."
    pip3 install keyring cryptography aiohttp
fi

# Check if OpenAI key is already configured
echo "🔐 Checking existing configuration..."
python3 secure_key_manager.py list | grep -q "openai"
if [ $? -eq 0 ]; then
    echo "✅ OpenAI API key already configured"
    echo "🧪 Testing existing configuration..."
    python3 chatgpt_offloading_manager.py status
else
    echo "⚠️  No OpenAI API key found"
    echo ""
    echo "To complete setup, you need to provide your OpenAI API key:"
    echo "1. Get your API key from: https://platform.openai.com/api-keys"
    echo "2. Run: python3 secure_key_manager.py setup-openai <your_api_key>"
    echo ""
    echo "Example:"
    echo "  python3 secure_key_manager.py setup-openai sk-your-key-here"
fi

echo ""
echo "📋 Available Commands:"
echo "  Key Management:"
echo "    python3 secure_key_manager.py setup-openai <key>  # Store API key"
echo "    python3 secure_key_manager.py list                # List stored keys"
echo "    python3 secure_key_manager.py test openai         # Test key access"
echo ""
echo "  ChatGPT Offloading:"
echo "    python3 chatgpt_offloading_manager.py status      # Show usage stats"
echo "    python3 chatgpt_offloading_manager.py test        # Test offloading"
echo "    python3 chatgpt_offloading_manager.py offload 'task description'"
echo ""
echo "  Coordination:"
echo "    python3 claude_chatgpt_coordinator.py analyze     # Analyze task distribution"
echo "    python3 claude_chatgpt_coordinator.py execute     # Execute parallel tasks"
echo "    python3 claude_chatgpt_coordinator.py status      # Show coordination status"

echo ""
echo "🔒 Security Features:"
echo "  ✅ API keys encrypted using system keyring"
echo "  ✅ Fernet encryption for additional security"
echo "  ✅ Usage tracking and budget limits"
echo "  ✅ Cost monitoring in EUR"
echo ""
echo "Setup complete! 🎉"