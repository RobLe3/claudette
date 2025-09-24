# Claudette v1.0.5 Documentation Index

Complete documentation for Claudette's enterprise AI middleware platform.

## Overview

Claudette v1.0.5 is a TypeScript-based AI middleware platform that provides intelligent routing across multiple AI backends with ultra-fast MCP server integration, advanced memory management, and comprehensive monitoring.

## Documentation Structure

### 🚀 **Getting Started**
- **[Installation Guide](guides/installation.md)** - Install and configure Claudette
- **[Getting Started](guides/getting-started.md)** - First steps and basic usage
- **[Configuration](guides/configuration.md)** - Environment setup and backend configuration

### 📚 **API Reference**
- **[Core API](api/core-api.md)** - Main `optimize()` function and Claudette class
- **[CLI Reference](api/cli-reference.md)** - Command-line interface documentation
- **[Backend System](api/backends.md)** - Multi-backend routing and management
- **[Complete API](API.md)** - Comprehensive API documentation with examples

### 🔧 **Integration Guides**
- **[Anti-Hallucination Integration](anti-hallucination-integration-guide.md)** - Anti-hallucination integration with Claude Code
- **[MCP Integration](mcp-integration.md)** - Model Context Protocol setup and configuration
- **[Timeout Harmonization](timeout-harmonization.md)** - Advanced timeout management system
- **[RAG System](rag-system.md)** - Retrieval-Augmented Generation integration

### 🏗️ **Technical Documentation**
- **[Architecture](technical/ARCHITECTURE.md)** - System design and component architecture
- **[Testing](development/testing.md)** - Testing framework and development practices

### 📋 **Project Information**
- **[README](README.md)** - Project overview and quick start
- **[Contributing](CONTRIBUTING.md)** - Development guidelines and contribution process
- **[Changelog](changelog.md)** - Version history and release notes

## System Architecture

Claudette is organized into several core TypeScript modules:

```
src/
├── index.ts              # Main API entry point
├── cli/                  # CLI interface
├── backends/             # Multi-backend system
│   ├── openai.ts        # OpenAI backend implementation  
│   ├── qwen.ts          # Qwen backend implementation
│   └── base.ts          # Backend interface
├── cache/               # Caching system
├── config/              # Configuration management
├── monitoring/          # Performance monitoring
├── rag/                 # RAG system integration
└── utils/               # Utility functions
```

## Key Features (v1.0.5)

### ⚡ **Ultra-Fast MCP Server**
- **264ms startup time** (99.1% improvement over previous versions)
- Perfect Claude Code compatibility with harmonized timeouts
- Advanced memory management with pressure-based scaling

### 🤖 **Multi-Backend Intelligence**
- **OpenAI** - Reliable, high-quality responses
- **Qwen** - Fast, cost-effective processing (912ms average)
- **Ollama/FlexCon** - Local and GPU-accelerated models

### 🎯 **Production Features**
- **Timeout Harmonization** - 8s health checks, 60s requests
- **Advanced Memory Management** - Emergency cleanup at 95%+ pressure
- **Cost Tracking** - Precise EUR cost calculation with 6-decimal precision
- **Circuit Breaker Patterns** - Automatic failover and recovery

## Quick Examples

### TypeScript/Node.js Usage
```typescript
import { optimize } from 'claudette';

// Simple AI request with automatic backend selection
const response = await optimize('Explain quantum computing');
console.log(response.content);
console.log(`Cost: €${response.cost_eur}, Backend: ${response.backend_used}`);
```

### CLI Usage
```bash
# Quick query with automatic backend selection
claudette -q "What is the capital of France?"

# Force specific backend with options
claudette -b qwen --max-tokens 500 -q "Generate a Python function"
```

### MCP Integration
```json
{
  "mcpServers": {
    "claudette": {
      "command": "node",
      "args": ["/path/to/claudette-mcp-server-fast.js"],
      "timeout": 60000,
      "env": {
        "CLAUDETTE_ADVANCED_MEMORY": "1",
        "CLAUDETTE_MCP_MODE": "1"
      }
    }
  }
}
```

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/RobLe3/claudette/issues)
- **Documentation**: This comprehensive guide
- **Version**: v1.0.5 (Production Ready)
- **License**: See project LICENSE file

---

*This documentation accurately reflects Claudette v1.0.5 capabilities and features. All examples are tested and validated.*