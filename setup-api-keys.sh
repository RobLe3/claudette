#!/bin/bash

# Setup API Keys in macOS Keychain for Claudette Testing
# This script helps store API keys securely for all supported backends

echo "🔑 Claudette API Key Setup"
echo "=========================="
echo "This script will help you store API keys securely in macOS Keychain"
echo "for all supported AI backends in Claudette."
echo ""

# Function to store API key
store_key() {
    local service=$1
    local account=$2
    local prompt_name=$3
    
    echo "📝 Setting up $prompt_name API key..."
    echo "Enter your $prompt_name API key (or press Enter to skip):"
    read -s api_key
    
    if [ -n "$api_key" ]; then
        # Delete existing key if it exists
        security delete-generic-password -a "$account" -s "$service-api-key" 2>/dev/null
        
        # Store new key
        security add-generic-password -a "$account" -s "$service-api-key" -w "$api_key"
        
        if [ $? -eq 0 ]; then
            echo "✅ $prompt_name API key stored successfully"
        else
            echo "❌ Failed to store $prompt_name API key"
        fi
    else
        echo "⏭️ Skipped $prompt_name API key"
    fi
    echo ""
}

# OpenAI
store_key "openai" "openai" "OpenAI"

# Qwen (Alibaba Cloud)
store_key "qwen" "qwen" "Qwen"

# Claude (Anthropic)
store_key "claude" "claude" "Claude/Anthropic"

# Mistral
store_key "mistral" "mistral" "Mistral"

echo "🎯 API Key Setup Complete!"
echo ""
echo "📋 To verify stored keys, run:"
echo "  security find-generic-password -a 'openai' -s 'openai-api-key' -w"
echo "  security find-generic-password -a 'qwen' -s 'qwen-api-key' -w"
echo "  security find-generic-password -a 'claude' -s 'claude-api-key' -w"
echo "  security find-generic-password -a 'mistral' -s 'mistral-api-key' -w"
echo ""
echo "🧪 To test CLI with stored keys:"
echo "  node src/test-cli-simple.js"
echo ""
echo "🗑️ To remove all keys:"
echo "  security delete-generic-password -a 'openai' -s 'openai-api-key'"
echo "  security delete-generic-password -a 'qwen' -s 'qwen-api-key'"
echo "  security delete-generic-password -a 'claude' -s 'claude-api-key'"
echo "  security delete-generic-password -a 'mistral' -s 'mistral-api-key'"