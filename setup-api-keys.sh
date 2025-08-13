#!/bin/bash
# Claudette API Key Setup Script
# Securely stores API keys in macOS Keychain

echo "🔑 Claudette API Key Setup"
echo "=========================="
echo ""

# Function to securely add API key to keychain
add_api_key() {
    local service_name=$1
    local description=$2
    
    echo "Setting up $description..."
    read -s -p "Enter your $description API key (input hidden): " api_key
    echo ""
    
    if [ -n "$api_key" ]; then
        # Remove existing key if it exists
        security delete-generic-password -s "$service_name" 2>/dev/null
        
        # Add new key to keychain
        security add-generic-password \
            -s "$service_name" \
            -a "$(whoami)" \
            -w "$api_key" \
            -D "API Key for $description"
        
        if [ $? -eq 0 ]; then
            echo "✅ $description API key stored successfully in keychain"
        else
            echo "❌ Failed to store $description API key"
            return 1
        fi
    else
        echo "⚠️  Skipping $description (no key provided)"
    fi
    echo ""
}

# Setup API keys
echo "This script will securely store your API keys in the macOS Keychain."
echo "Keys will be accessible to Claudette but hidden from other applications."
echo ""

add_api_key "openai-api-key" "OpenAI (GPT-4, GPT-5 models)"
add_api_key "claude-api-key" "Anthropic Claude"  
add_api_key "qwen-api-key" "Qwen CodeLLM"

echo "🎉 API key setup complete!"
echo ""
echo "You can now run Claudette with:"
echo "  npm start"
echo ""
echo "To update an API key later, just run this script again."