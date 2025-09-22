# Claudette Credential Setup Guide

This guide provides multiple methods to manually store API keys in Claudette, bypassing the interactive setup wizard.

## Overview

Claudette searches for credentials in the following order:

1. **Configuration files** (`claudette.config.json`)
2. **Environment variables** (`OPENAI_API_KEY`, etc.)
3. **Encrypted credential storage** (`~/.claudette/credentials/credentials.enc`)
4. **Platform-specific secure storage** (macOS Keychain, Windows Credential Manager, Linux libsecret)

## Method 1: Environment Variables (Easiest)

Set the environment variable for your API provider:

```bash
# OpenAI
export OPENAI_API_KEY="sk-your-openai-key-here"

# Anthropic Claude
export ANTHROPIC_API_KEY="sk-ant-your-claude-key-here"

# Google Gemini
export GOOGLE_API_KEY="your-google-key-here"

# Mistral AI
export MISTRAL_API_KEY="your-mistral-key-here"
```

Make the environment variable permanent by adding it to your shell profile:

```bash
# For bash users
echo 'export OPENAI_API_KEY="sk-your-openai-key-here"' >> ~/.bashrc

# For zsh users (macOS default)
echo 'export OPENAI_API_KEY="sk-your-openai-key-here"' >> ~/.zshrc

# Reload your shell
source ~/.bashrc  # or ~/.zshrc
```

## Method 2: Configuration File

Edit the `claudette.config.json` file directly:

```json
{
  "backends": {
    "openai": {
      "enabled": true,
      "priority": 1,
      "api_key": "sk-your-openai-key-here",
      "model": "gpt-4o-mini"
    },
    "claude": {
      "enabled": false,
      "priority": 2,
      "api_key": "sk-ant-your-claude-key-here",
      "model": "claude-3-sonnet-20240229"
    }
  }
}
```

**⚠️ Security Warning**: This method stores keys in plain text. Use environment variables or encrypted storage for better security.

## Method 3: Encrypted Storage Script

Use the provided script to store keys securely:

```bash
# Store OpenAI API key
node store-openai-key.js sk-your-openai-key-here

# Or run interactively
node store-openai-key.js
# (Will prompt for key)
```

This method:
- Encrypts keys using AES-256-CBC
- Stores them in `~/.claudette/credentials/credentials.enc`
- Uses system-specific encryption keys
- Provides the highest security

## Method 4: macOS Keychain (macOS only)

Use the built-in setup script for macOS:

```bash
./setup-api-keys.sh
```

Or manually add to Keychain:

```bash
# Add OpenAI key
security add-generic-password \
    -s "openai-api-key" \
    -a "$(whoami)" \
    -w "sk-your-openai-key-here" \
    -D "API Key for OpenAI"

# Add Claude key
security add-generic-password \
    -s "claude-api-key" \
    -a "$(whoami)" \
    -w "sk-ant-your-claude-key-here" \
    -D "API Key for Anthropic Claude"
```

## Credential Verification

To verify your credentials are stored correctly:

```bash
node verify-credentials.js
```

This script will:
- Check environment variables
- Scan encrypted credential storage
- Verify configuration files
- Check macOS Keychain (if available)
- Show a summary of found credentials

## File Locations

### Credential Storage Locations

| Method | Location | Security |
|--------|----------|----------|
| Environment Variables | Shell environment | Low (process-visible) |
| Config File | `./claudette.config.json` | Low (plain text) |
| Encrypted Storage | `~/.claudette/credentials/credentials.enc` | High (encrypted) |
| macOS Keychain | System Keychain | High (OS-managed) |
| Windows Credential Manager | System store | High (OS-managed) |
| Linux libsecret | System keyring | High (OS-managed) |

### Configuration Files Checked

- `./claudette.config.json` (current directory)
- `~/.claudette/config.json`
- `~/.config/claudette/config.json`

### Environment Variables Checked

| Backend | Environment Variables |
|---------|----------------------|
| OpenAI | `OPENAI_API_KEY`, `OPENAI_KEY` |
| Claude | `ANTHROPIC_API_KEY`, `CLAUDE_API_KEY` |
| Google | `GOOGLE_API_KEY`, `GEMINI_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Cohere | `COHERE_API_KEY` |
| Ollama | `OLLAMA_HOST`, `OLLAMA_URL` |

### Credential Storage Service Names

When using encrypted storage or system keychains, Claudette looks for these service names:

- `openai-api-key` or `claudette-openai`
- `claude-api-key` or `claudette-claude`
- `qwen-api-key` or `claudette-qwen`
- `google-api-key` or `claudette-google`
- `mistral-api-key` or `claudette-mistral`

## API Key Formats

Claudette validates API key formats:

| Provider | Format | Example |
|----------|--------|---------|
| OpenAI | `sk-[A-Za-z0-9]{48,}` | `sk-proj-EXAMPLE1234567890abcdef...` |
| Claude | `sk-ant-[A-Za-z0-9-_]{95,}` | `sk-ant-api03-1234567890...` |
| Google | `[A-Za-z0-9-_]{39}` | `AIzaSyBc1234567890abcdef123456789` |
| Mistral | `[A-Za-z0-9]{32}` | `1234567890abcdef1234567890abcdef` |

## Troubleshooting

### Common Issues

1. **"No credentials found"**
   - Run `node verify-credentials.js` to check all locations
   - Verify API key format is correct
   - Check file permissions on credential storage

2. **"Invalid API key format"**
   - Ensure key matches the expected format for your provider
   - Remove any extra whitespace or quotes

3. **"Permission denied"**
   - Ensure `~/.claudette` directory has correct permissions (700)
   - On macOS, allow terminal access to Keychain if prompted

4. **Environment variable not found**
   - Restart your terminal after setting variables
   - Use `echo $OPENAI_API_KEY` to verify the variable is set

### File Permissions

Ensure proper permissions for security:

```bash
# Set directory permissions
chmod 700 ~/.claudette
chmod 700 ~/.claudette/credentials

# Set file permissions
chmod 600 ~/.claudette/credentials/credentials.enc
chmod 600 claudette.config.json
```

## Quick Start

For the fastest setup:

1. **Environment Variable Method** (recommended for development):
   ```bash
   export OPENAI_API_KEY="sk-your-key-here"
   npm start
   ```

2. **Encrypted Storage Method** (recommended for production):
   ```bash
   node store-openai-key.js sk-your-key-here
   npm start
   ```

3. **Verify Setup**:
   ```bash
   node verify-credentials.js
   ```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use encrypted storage** for production environments
3. **Set proper file permissions** (600 for files, 700 for directories)
4. **Rotate keys regularly** and update stored credentials
5. **Use environment variables** for development/testing
6. **Prefer system-managed storage** (Keychain, Credential Manager) when available

## Next Steps

After setting up credentials:

1. Run `node verify-credentials.js` to confirm setup
2. Test with `npm start` or `./claudette "Hello world"`
3. Check the configuration with `npm run setup` if needed
4. Monitor usage and costs through the dashboard

For additional help, see:
- `docs/technical/setup/INSTALLATION_GUIDE.md`
- `docs/getting-started/interactive-tutorial.md`
- `README.md`