# Installation Guide

## Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- At least one AI backend API key (OpenAI, Qwen, or FlexCon)

## Installation

### 1. Install Claudette

```bash
# Install from local source (current development setup)
npm install

# Build the project
npm run build
```

### 2. Verify Installation

```bash
# Check version
./claudette --version
# Should output: claudette 1.0.2

# Check help
./claudette --help
```

## Configuration

### 1. Environment Setup

Create a `.env` file in your project root:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Qwen (Alibaba Cloud) Configuration  
QWEN_API_KEY=sk-your-qwen-api-key-here
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus

# FlexCon Configuration (optional)
CUSTOM_BACKEND_1_API_KEY=your-flexcon-api-key
CUSTOM_BACKEND_1_API_URL=https://your-flexcon-endpoint.com
CUSTOM_BACKEND_1_MODEL=gpt-oss:20b-gpu16-ctx3072

# System Configuration (optional)
CLAUDETTE_TIMEOUT=45000
NODE_ENV=development
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