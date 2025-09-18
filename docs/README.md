# Claudette v1.0.2 Documentation

**AI Middleware Platform with Intelligent Backend Routing**

Claudette v1.0.2 is a TypeScript-based AI middleware platform that provides intelligent routing across multiple AI backends with cost optimization, health monitoring, and timeout management.

## 🎯 What Claudette Does

Claudette acts as a smart middleware layer between your application and AI providers:

- **Multi-Backend Support**: OpenAI, Qwen (Alibaba Cloud), and FlexCon
- **Intelligent Routing**: Automatic backend selection based on performance and availability
- **Health Monitoring**: Real-time backend health checks with circuit breaker patterns
- **Cost Tracking**: Monitor API costs across all backends in EUR
- **Timeout Management**: Optimized timeout configuration for reliable operations

## 📚 Documentation Structure

### Quick Start
- **[Installation Guide](guides/installation.md)** - Set up Claudette in your project
- **[Getting Started](guides/getting-started.md)** - Basic usage and configuration
- **[Configuration Guide](guides/configuration.md)** - Environment setup and backend configuration

### API Reference  
- **[Core API](api/core-api.md)** - Main `optimize()` function and response handling
- **[Backend System](api/backends.md)** - Backend configuration and management
- **[Types Reference](api/types.md)** - TypeScript type definitions

### Technical Documentation
- **[Architecture](technical/architecture.md)** - System design and components
- **[Timeout System](technical/timeout-management.md)** - Timeout configuration and calibration
- **[Contributing](technical/contributing.md)** - Development guidelines

## 🚀 Quick Example

```typescript
import { optimize } from 'claudette';

// Simple request - Claudette automatically selects the best backend
const response = await optimize('Explain quantum computing in simple terms');
console.log(response.content);
console.log(`Cost: €${response.cost_eur}, Backend: ${response.backend_used}`);

// Advanced usage with options
const response = await optimize(
  'Write a function to calculate fibonacci',
  ['./example.js'], // Optional file context
  {
    backend: 'openai',        // Force specific backend
    max_tokens: 500,          // Token limit
    temperature: 0.7,         // Creativity level
    bypass_cache: true        // Skip caching
  }
);
```

## 🔧 Current Capabilities (v1.0.2)

### ✅ **Implemented Features**
- **Backend Management**: OpenAI, Qwen, FlexCon integration
- **Health Monitoring**: Automatic health checks every 60 seconds
- **Intelligent Routing**: Performance-based backend selection
- **Cost Tracking**: Real-time EUR cost calculation
- **Timeout Management**: Calibrated timeout system (5.5s health, 45s requests)
- **Error Handling**: Circuit breaker patterns with automatic recovery
- **Caching**: Response caching with configurable TTL
- **Configuration**: Environment-based setup with validation

### ⚠️ **Partial Implementation**
- **Setup Wizard**: Basic interactive setup (in development)
- **RAG System**: Foundation implemented, not fully featured
- **Monitoring**: Basic performance metrics (no alerting)

### ❌ **Not Yet Implemented**  
- Advanced monitoring dashboard
- Production deployment automation
- Comprehensive test coverage reporting
- Enterprise security features

## 🏗️ System Requirements

- **Node.js**: 18.0.0 or higher
- **TypeScript**: 4.5.0 or higher (for development)
- **Operating System**: macOS, Linux, Windows

## 📋 Backend Requirements

### API Keys Required
- **OpenAI**: `OPENAI_API_KEY` environment variable
- **Qwen**: `QWEN_API_KEY` environment variable  
- **FlexCon**: `CUSTOM_BACKEND_1_API_KEY` and `CUSTOM_BACKEND_1_API_URL`

### Backend Performance
| Backend | Avg Health Check | Avg Request | Use Case |
|---------|------------------|-------------|----------|
| OpenAI  | 758ms           | 1,102ms     | General purpose |
| Qwen    | 302ms           | 912ms       | Fast, cost-effective |
| FlexCon | 74ms            | 22,351ms    | GPU-accelerated models |

## 🔍 Project Status

**Current Version**: v1.0.2  
**Status**: Functional MVP  
**Test Status**: Core functionality verified  
**Production Ready**: Basic use cases only

### Recent Improvements
- **Timeout Calibration**: Systematic timeout optimization for all backends
- **Qwen Integration**: Full Alibaba Cloud DashScope integration  
- **Health Check Reliability**: Improved backend availability detection
- **Error Handling**: Enhanced error recovery and circuit breaker patterns

## 📞 Support

For issues, questions, or contributions:
- **Issues**: Report bugs or request features
- **Documentation**: All docs reflect actual v1.0.2 capabilities
- **Development**: See [Contributing Guide](technical/contributing.md)

## 🗺️ Roadmap

### v1.1.0 (Planned)
- Enhanced setup wizard
- Improved monitoring capabilities  
- Additional backend integrations

### v1.2.0 (Future)
- Advanced RAG system
- Dashboard interface
- Production deployment tools

---

*This documentation accurately reflects Claudette v1.0.2 capabilities. All features listed are implemented and tested.*