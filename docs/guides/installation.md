# Installation Guide - Claudette v1.0.5

## Prerequisites

- **Node.js**: 18.0.0 or higher (Node.js 24+ recommended for optimal performance)
- **npm**: 8.0.0 or higher
- **TypeScript**: 5.0+ (automatically installed)
- At least one AI backend API key (OpenAI, Qwen/DashScope, or Ollama)

## Installation Methods

### Method 1: NPM Installation (Recommended)

```bash
# Install globally for CLI usage
npm install -g claudette@1.0.5

# Or install locally in your project
npm install claudette@1.0.5
```

### Method 2: Local Development Setup

```bash
# Clone the repository
git clone https://github.com/RobLe3/claudette.git
cd claudette

# Install dependencies
npm install

# Build the project
npm run build

# Make CLI executable
chmod +x dist/cli/index.js

# Create symlink for global usage (optional)
npm link
```

## Verify Installation

```bash
# Check version (should output: 1.0.5)
claudette --version

# Check system status
claudette status

# Display comprehensive help
claudette --help
```

## Quick Setup

### 1. Configure API Keys

Create a `.env` file in your project directory or configure environment variables:

```bash
# OpenAI (recommended for general queries)
export OPENAI_API_KEY="sk-your-openai-key"

# Qwen/DashScope (recommended for code and math)
export QWEN_API_KEY="your-qwen-key"
export DASHSCOPE_API_KEY="your-dashscope-key"

# Ollama (local processing)
# No API key needed, ensure Ollama is running locally
```

### 2. Test Configuration

```bash
# Test backend connectivity
claudette backends --health

# Quick test query
claudette -q "Hello, test connection"

# Verify API keys
claudette keys
```

## Configuration

### 1. Environment Setup

Create a `.env` file in your project root:

```bash
# OpenAI Configuration (recommended for general queries)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Qwen/DashScope Configuration (recommended for code/math)
QWEN_API_KEY=sk-your-qwen-api-key-here
DASHSCOPE_API_KEY=your-dashscope-api-key-here
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus

# Ollama Configuration (local processing)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Timeout Harmonization (v1.0.5 feature)
CLAUDETTE_TIMEOUT_PROFILE=DEVELOPMENT_ASSISTANT
CLAUDETTE_TIMEOUT_HEALTH_CHECK=10000
CLAUDETTE_TIMEOUT_SIMPLE_REQUEST=40000
CLAUDETTE_TIMEOUT_COMPLEX_REQUEST=70000

# System Configuration
NODE_ENV=production
CLAUDETTE_CLI_MODE=true
```

### 2. API Key Setup

#### OpenAI
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to your `.env` file as `OPENAI_API_KEY`

#### Qwen (Alibaba Cloud)
1. Go to [Alibaba Cloud DashScope](https://dashscope.aliyuncs.com/)
2. Create an API key
3. Add to your `.env` file as `QWEN_API_KEY`

#### FlexCon (Optional)
1. Contact your FlexCon provider for API credentials
2. Add API key and URL to your `.env` file

### 3. Test Configuration

```bash
# Test backend health
./claudette health

# Test a simple request
echo "What is 2+2?" | ./claudette
```

Expected output:
```
✅ OpenAI backend registered
✅ Qwen backend registered
✅ FlexCon backend registered
🚀 Claudette ready with 2-3 healthy backend(s)

2 + 2 equals 4.
Backend: openai, Cost: €0.000004, Latency: 756ms
```

## Usage

### Command Line

```bash
# Basic usage
echo "Your prompt here" | ./claudette

# With options
./claudette --backend openai --max-tokens 100 --temperature 0.7

# Interactive mode
./claudette --interactive
```

### Programmatic Usage

```typescript
import { optimize } from 'claudette';

const response = await optimize('Hello, world!');
console.log(response.content);
```

## Troubleshooting

### Common Issues

#### "No healthy backends found"
**Cause**: No valid API keys or network issues  
**Solution**: 
1. Check your API keys in `.env`
2. Test network connectivity
3. Run `./claudette health` for diagnostics

#### "Command timed out"
**Cause**: Backend taking too long to respond  
**Solution**:
1. Check backend status
2. Increase timeout: `CLAUDETTE_TIMEOUT=60000`
3. Try different backend: `--backend qwen`

#### "Authentication failed"
**Cause**: Invalid or expired API keys  
**Solution**:
1. Verify API key format
2. Check API key permissions
3. Test with provider directly

### Health Diagnostics

```bash
# Check system health
./claudette health

# Check specific backend
./claudette health --backend openai

# Verbose diagnostics  
./claudette health --verbose
```

### Performance Testing

```bash
# Test backend performance
./claudette benchmark

# Test specific backend
./claudette benchmark --backend qwen

# Test with load
./claudette benchmark --requests 10 --concurrent 3
```

## Next Steps

- **[Getting Started Guide](getting-started.md)** - Learn basic usage
- **[Configuration Guide](configuration.md)** - Advanced configuration
- **[API Reference](../api/core-api.md)** - Programmatic usage