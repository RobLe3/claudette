# 🚀 Claudette - Comprehensive Claude Code Middleware

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/user/claudette)
[![Node.js](https://img.shields.io/badge/node.js-18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

**Claudette** is a comprehensive, production-ready middleware for Claude Code that provides multi-backend AI integration, intelligent cost optimization, response caching, and advanced performance monitoring.

## ✨ Key Features

### 🎯 **Multi-Backend AI Integration**
- **5 AI Providers**: Claude (Anthropic), OpenAI GPT, Mistral AI, Ollama Local, Qwen AI
- **Smart Routing**: Automatic selection of optimal backend based on availability and cost
- **Fallback Handling**: Seamless failover between backends
- **Priority-based Routing**: Configurable backend priorities

### 💰 **Advanced Cost Optimization**
- **Real-time Cost Tracking**: Monitor spending across all backends
- **Cost Estimation**: Per-request cost calculation with backend-specific pricing
- **Smart Caching**: Reduce costs through intelligent response caching
- **Cost Savings Analytics**: Track cumulative savings from optimization

### 📦 **Response Caching System**
- **Intelligent Caching**: SHA256-based command hashing with TTL expiration
- **Performance Boost**: Lightning-fast cached responses
- **Storage Management**: Automatic cleanup of old cache entries
- **Cache Statistics**: Detailed hit rates and storage metrics

### 🔍 **Comprehensive Monitoring**
- **Task Interception**: Visual feedback for all intercepted commands
- **Performance Metrics**: Response times, backend usage, and system health
- **Usage Statistics**: Persistent tracking across sessions
- **System Diagnostics**: Built-in health checks and troubleshooting

### ⚙️ **Advanced Configuration**
- **JSON Configuration**: Flexible backend and feature configuration
- **Environment Integration**: API key management via environment variables
- **Runtime Customization**: Adjust thresholds, caching, and routing behavior
- **Profile Management**: Multiple configuration profiles support

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/user/claudette.git
cd claudette
chmod +x claudette
```

### Basic Usage

```bash
# Show comprehensive help
./claudette help

# Show version and system info
./claudette version

# View system status and configuration
./claudette --claudette-status

# List available backends
./claudette --claudette-backends

# Run system diagnostics
./claudette --claudette-doctor

# Forward any command to optimal backend
./claudette "your command here"
```

## 📋 Complete Command Reference

### System Commands (handled locally)
- `help`, `--help`, `-h` - Show comprehensive help message
- `version`, `--version`, `-V` - Show version and system information
- `--claudette-status` - Show comprehensive integration status
- `--claudette-config` - Display current configuration
- `--claudette-backends` - List all available backends with status
- `--claudette-stats` - Show detailed usage statistics
- `--claudette-cache` - Show cache statistics and status
- `--claudette-reset` - Reset all data (cache and statistics)
- `--claudette-doctor` - Run comprehensive system diagnostics

### Integration Commands
All other commands are intelligently routed to the optimal backend with middleware processing, caching, and cost tracking.

## 🏗️ Advanced Architecture

```
User Command → Claudette Middleware → Multi-Backend Router → AI Provider
     ↓              ↓                      ↓                     ↓
   Display      Task Interception    Smart Backend         AI Processing
   Feedback     Cost Tracking        Selection             & Caching
                Cache Management     Fallback Handling     Response Return
```

### Core Components

1. **ClaudetteConfig**: Configuration and settings management
2. **CostTracker**: Real-time cost monitoring and optimization
3. **ResponseCache**: Intelligent caching with TTL and cleanup
4. **BackendManager**: Multi-backend detection and routing
5. **ClaudetteV1**: Main application orchestrator

## 🔧 Backend Support

### Supported AI Providers

| Backend | Provider | Type | API Required | Local Install |
|---------|----------|------|--------------|---------------|
| **Claude** | Anthropic | Cloud | ❌ (via CLI) | ✅ (claude CLI) |
| **OpenAI** | GPT-4/3.5 | Cloud | ✅ (OPENAI_API_KEY) | ❌ |
| **Mistral** | Mistral AI | Cloud | ✅ (MISTRAL_API_KEY) | ❌ |
| **Ollama** | Local Models | Local | ❌ | ✅ (ollama CLI) |
| **Qwen** | Alibaba Cloud | Cloud | ✅ (QWEN_API_KEY) | ❌ |

### Backend Configuration

Edit `~/.claude/claudette/config.json` to customize:

```json
{
  "backends": {
    "claude": { "enabled": true, "priority": 1, "cost_per_token": 0.0003 },
    "openai": { "enabled": false, "priority": 2, "cost_per_token": 0.0001 },
    "mistral": { "enabled": false, "priority": 3, "cost_per_token": 0.0002 },
    "ollama": { "enabled": false, "priority": 4, "cost_per_token": 0.0000 },
    "qwen": { "enabled": false, "priority": 5, "cost_per_token": 0.0001 }
  }
}
```

## 📊 Performance & Analytics

### Cost Optimization
- **Real-time Tracking**: Monitor costs per backend and session
- **Cache Savings**: Track cost reductions from cached responses
- **Usage Analytics**: Detailed breakdown by backend and time period
- **Cost Alerts**: Configurable spending thresholds

### Performance Metrics
- **Response Times**: Sub-second system commands (~250ms)
- **Cache Hit Rates**: Track cache effectiveness
- **Backend Availability**: Monitor provider uptime
- **System Health**: Continuous diagnostic monitoring

### Example Statistics Output
```
📊 CLAUDETTE USAGE STATISTICS  
────────────────────────────────────────
Session Time: 45.2s
Total Requests: 12
Total Cost: $0.0356
Cost Savings: $0.0120
Cache Hit Rate: 25.0%

Backend Usage:
CLAUDE:
  Requests: 9
  Tokens: 1200
  Cost: $0.0356
```

## 🔍 Advanced Monitoring

### System Status
```bash
./claudette --claudette-status
```
Shows comprehensive system health including:
- Primary backend selection
- Cost summary and savings
- Cache statistics and hit rates
- Available backends (5/5)
- Feature status and configuration

### Diagnostic Tools
```bash
./claudette --claudette-doctor
```
Runs comprehensive diagnostics:
- Node.js version compatibility
- Directory structure validation
- Backend availability testing
- Configuration file validation
- Performance benchmarking

## 📁 File Structure

```
claudette/
├── claudette              # Main executable (817 lines)
├── package.json           # Project configuration
├── README.md             # This documentation
└── ~/.claude/claudette/  # User data directory
    ├── config.json       # Configuration file
    ├── stats.json        # Usage statistics
    ├── status.json       # System status
    └── cache/           # Response cache storage
```

## 🔧 Configuration Management

### Environment Variables
Set API keys for cloud providers:
```bash
export OPENAI_API_KEY="your-openai-key"
export MISTRAL_API_KEY="your-mistral-key"
export QWEN_API_KEY="your-qwen-key"
```

### Configuration File
Located at `~/.claude/claudette/config.json`:
- **Backend Settings**: Enable/disable providers, set priorities
- **Feature Toggles**: Control caching, cost tracking, monitoring
- **Thresholds**: Cache TTL, size limits, cost warnings

## 🚀 Advanced Usage Examples

### Multi-Backend Setup
```bash
# Enable OpenAI backend
export OPENAI_API_KEY="your-key"
./claudette --claudette-config  # Verify configuration

# Check backend availability
./claudette --claudette-backends

# Test with fallback
./claudette "complex coding task"  # Uses optimal backend
```

### Performance Monitoring
```bash
# Monitor system performance
./claudette --claudette-stats

# Check cache effectiveness
./claudette --claudette-cache

# Run diagnostics
./claudette --claudette-doctor
```

### Cost Management
```bash
# View cost breakdown
./claudette --claudette-stats

# Reset statistics
./claudette --claudette-reset

# Monitor real-time costs during usage
./claudette version  # Shows session costs
```

## 🤝 Requirements

### System Requirements
- **Node.js**: 18.0.0+ required
- **Platform**: macOS, Linux, Windows (WSL)
- **Memory**: ~50MB RAM footprint
- **Storage**: ~10MB for installation + cache

### Dependencies
- **Core**: No external npm dependencies (uses Node.js built-ins)
- **Claude CLI**: Required for Claude backend
- **API Keys**: Required for cloud backends (OpenAI, Mistral, Qwen)
- **Ollama**: Required for local AI models

## 🔒 Security & Privacy

- **API Key Management**: Secure environment variable storage
- **Local Caching**: SHA256 hashing for cache keys
- **No Data Transmission**: Middleware doesn't intercept actual AI responses
- **Configuration Protection**: User-only file permissions

## 🆘 Troubleshooting

### Common Issues

1. **Backend Not Available**
   ```bash
   ./claudette --claudette-doctor  # Check system health
   ```

2. **Configuration Issues**
   ```bash
   ./claudette --claudette-config  # Verify settings
   ./claudette --claudette-reset   # Reset if needed
   ```

3. **Performance Problems**
   ```bash
   ./claudette --claudette-cache   # Check cache status
   ./claudette --claudette-stats   # Review usage patterns
   ```

## 📝 License

MIT License - see LICENSE file for details

## 🐛 Issues & Support

Report issues at: https://github.com/user/claudette/issues

## 🎯 Advanced Features Summary

✅ **Production Ready**: Comprehensive error handling and diagnostics  
✅ **Multi-Backend**: 5 AI providers with smart routing  
✅ **Cost Optimized**: Real-time tracking and intelligent caching  
✅ **High Performance**: Sub-second response times with caching  
✅ **Configurable**: Extensive customization options  
✅ **Monitored**: Comprehensive analytics and health checks  
✅ **Secure**: Safe API key management and local caching  
✅ **Reliable**: Automatic fallback and error recovery  

---

**🚀 Claudette v1.0.0** - Production-grade multi-backend Claude Code middleware with comprehensive AI integration capabilities