# CLI Reference - Claudette v1.0.5

Complete command-line interface documentation for Claudette's enterprise AI middleware.

## Overview

Claudette provides a powerful CLI that leverages intelligent backend routing, timeout harmonization, and Claude Code integration for optimal AI interactions.

## Basic Usage

```bash
claudette [options] [command] [prompt] [files...]
```

## Global Options

### Core Options
- `-V, --version` - Output the version number (v1.0.5)
- `-q, --query <prompt>` - Quick query mode
- `-b, --backend <backend>` - Force specific backend (openai, qwen, ollama)
- `-m, --model <model>` - Specify exact model to use
- `-h, --help` - Display help information

### Request Configuration
- `--timeout <seconds>` - Request timeout in seconds (respects harmonized limits)
- `--max-tokens <tokens>` - Maximum tokens to generate
- `-t, --temperature <temperature>` - Temperature (0-1) for response creativity
- `--no-cache` - Bypass cache for this request

### Performance Options
- `--timeout-profile <profile>` - Use specific timeout profile:
  - `QUICK_INTERACTIVE` - Fast CLI interactions (105s limit)
  - `DEVELOPMENT_ASSISTANT` - Balanced for development (115s limit) 
  - `BATCH_PROCESSING` - Longer operations (120s limit)
  - `EMERGENCY_MODE` - Ultra-fast responses (60s limit)

## Commands

### Backend Management
```bash
claudette backends                    # List available backends and status
claudette backends --health          # Detailed health check
claudette backends --test <backend>  # Test specific backend
```

### Cache Management
```bash
claudette cache                      # Show cache status
claudette cache clear               # Clear all cached responses
claudette cache stats               # Cache performance statistics
```

### API Key Management
```bash
claudette api-keys                  # List configured API keys
claudette keys                      # Alias for api-keys
claudette keys add <backend>        # Add new API key
claudette keys test <backend>       # Test API key validity
```

### System Information
```bash
claudette status                    # System status and health
claudette config                    # Show current configuration
claudette version                   # Version information
```

## Examples

### Basic Queries
```bash
# Simple question with automatic backend selection
claudette -q "What is the capital of France?"

# Math calculation (typically routed to Qwen for precision)
claudette -q "Calculate the square root of 144"

# Code generation (intelligent backend selection)
claudette -q "Write a Python function to reverse a string"
```

### Backend Selection
```bash
# Force OpenAI for general queries
claudette -b openai -q "Explain machine learning"

# Use Qwen for mathematical operations
claudette -b qwen -q "Solve this equation: 2x + 5 = 15"

# Use Ollama for local processing
claudette -b ollama -q "Generate a haiku about coding"
```

### File Context
```bash
# Include single file for context
claudette -q "Review this code for improvements" ./src/main.ts

# Multiple files for comprehensive analysis
claudette -q "Analyze the architecture" ./src/*.ts ./docs/README.md

# Complex refactoring request
claudette -q "Suggest improvements" --max-tokens 1000 ./src/components/
```

### Advanced Configuration
```bash
# Use specific timeout profile for development
claudette --timeout-profile DEVELOPMENT_ASSISTANT -q "Complex analysis request"

# Emergency mode for quick responses
claudette --timeout-profile EMERGENCY_MODE -q "Quick status check"

# Batch processing with extended timeouts
claudette --timeout-profile BATCH_PROCESSING -q "Generate comprehensive documentation"
```

### Performance and Monitoring
```bash
# Check system health
claudette status

# Test all backends
claudette backends --health

# Clear cache and run fresh query
claudette cache clear && claudette -q "Fresh analysis" --no-cache
```

## Timeout Harmonization

Claudette v1.0.5 features advanced timeout harmonization designed for Claude Code compatibility:

- **Claude Code Limit**: 120 seconds maximum
- **Safety Margins**: 5-15 second buffers built into all profiles
- **Cascading Tolerance**: Each timeout layer provides 25-30% more time than the layer below
- **Intelligent Failures**: Operations that exceed limits fail gracefully

### Timeout Profiles in Detail

| Profile | Total Limit | Health Checks | Simple Requests | Complex Requests | MCP Operations |
|---------|-------------|---------------|-----------------|------------------|----------------|
| `EMERGENCY_MODE` | 60s | 5s | 20s | 30s | 45s |
| `QUICK_INTERACTIVE` | 105s | 8s | 35s | 60s | 90s |
| `DEVELOPMENT_ASSISTANT` | 115s | 10s | 40s | 70s | 100s |
| `BATCH_PROCESSING` | 120s | 12s | 45s | 80s | 110s |

## Error Handling

The CLI provides comprehensive error handling:

### Common Error Scenarios
```bash
# Empty prompt
claudette -q ""
# Error: No prompt provided

# Invalid backend
claudette -b invalid-backend -q "test"
# Graceful fallback to intelligent routing

# Network timeout
claudette --timeout 1 -q "complex query"
# Error: Request timed out after 1000ms
```

### Exit Codes
- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - Network/API error
- `4` - Timeout error
- `5` - Authentication error

## Environment Variables

Configure Claudette behavior through environment variables:

```bash
# API Keys
export OPENAI_API_KEY="your-openai-key"
export QWEN_API_KEY="your-qwen-key"
export DASHSCOPE_API_KEY="your-dashscope-key"

# Timeout Configuration
export CLAUDETTE_TIMEOUT_PROFILE="DEVELOPMENT_ASSISTANT"
export CLAUDETTE_TIMEOUT_HEALTH_CHECK=10000
export CLAUDETTE_TIMEOUT_SIMPLE_REQUEST=40000

# Performance Settings
export CLAUDETTE_CLI_MODE=true
export NODE_ENV=production
```

## Integration with Claude Code

Claudette v1.0.5 is specifically designed for Claude Code integration:

### MCP Server Configuration
```json
{
  "mcpServers": {
    "claudette": {
      "command": "node",
      "args": ["/path/to/claudette-mcp-multiplexer.js"],
      "timeout": 115000,
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Perfect Compatibility Features
- **115s MCP Timeout**: 5-second safety margin for Claude Code's 120s limit
- **Multiplexed Operations**: Load balancing across multiple instances
- **Health Monitoring**: 10-second harmonized health checks
- **Circuit Breakers**: Automatic failover for reliability

## Performance Monitoring

The CLI includes built-in performance monitoring:

```bash
# Real-time performance metrics
claudette status

# Backend performance comparison
claudette backends --performance

# Memory and resource usage
claudette system-info
```

### Performance Metrics
- **Response Times**: Per-backend latency tracking
- **Success Rates**: Backend reliability statistics  
- **Cost Tracking**: EUR cost calculation with 6-decimal precision
- **Memory Usage**: Adaptive memory management with pressure alerts

## Troubleshooting

### Common Issues

**Slow Environment Loading**
```bash
# Current: 3-4 second startup time
# Solution: Optimization in progress
claudette status  # Check current performance
```

**Memory Pressure Warnings**
```bash
# Monitor memory usage
claudette system-info

# Clear cache to reduce memory
claudette cache clear
```

**Backend Connectivity Issues**
```bash
# Test individual backends
claudette backends --test openai
claudette backends --test qwen
claudette backends --test ollama

# Check API key configuration
claudette keys
```

## Best Practices

### Development Workflow
```bash
# Use appropriate timeout profile
export CLAUDETTE_TIMEOUT_PROFILE="DEVELOPMENT_ASSISTANT"

# Quick iterations during development
claudette -q "test query" --no-cache

# Production-ready requests
claudette --timeout-profile BATCH_PROCESSING -q "comprehensive analysis"
```

### Performance Optimization
```bash
# Warm up backends
claudette backends --health

# Use intelligent caching
claudette -q "repeated query"  # Cached on subsequent calls

# Monitor resource usage
claudette status && claudette cache stats
```

---

**Last Updated**: September 22, 2025  
**Version**: v1.0.5  
**Compatibility**: Claude Code integrated, Node.js 18+, TypeScript 5+