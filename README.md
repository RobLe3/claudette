# Claudette v1.0.1 - AI Backend Router & Cost Optimizer 🧠

🚀 **Enterprise AI Backend Management Platform**

> **v1.0.1**: Production-ready AI routing platform with intelligent backend selection, cost optimization, and monitoring capabilities.

![Version](https://img.shields.io/badge/version-1.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue)
![Tested](https://img.shields.io/badge/Core_System-Verified-brightgreen)
![Status](https://img.shields.io/badge/Status-Stable-brightgreen)

---

## 🎯 What is Claudette?

Claudette is an **AI middleware platform** that provides **intelligent multi-backend routing**, **cost optimization**, and **monitoring** capabilities. It features backend health monitoring, intelligent request routing, caching, and performance metrics collection.

### 🏆 Key Features
- **🔄 Backend Routing** - Automatic selection between OpenAI, Claude, Qwen, and Ollama
- **💰 Cost Optimization** - Real-time cost tracking and budget management
- **📊 Monitoring** - Performance metrics and health checks
- **🏗️ TypeScript** - Full type safety and modern development experience
- **⚡ Caching** - Intelligent response caching for improved performance
- **🛡️ Error Handling** - Circuit breakers and graceful failure recovery

---

## 🚀 Quick Start

### ⚡ Installation

```bash
# Option 1: NPM Installation
npm install -g claudette
claudette init

# Option 2: Source Installation
git clone https://github.com/RobLe3/claudette.git
cd claudette
npm install && npm run build
```

### 🔧 Configuration

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Configure your credentials**:
   ```bash
   # Required: OpenAI API Key
   OPENAI_API_KEY=sk-your-openai-api-key-here
   
   # Optional: Alternative Backend
   ALTERNATIVE_API_URL=https://your-custom-backend.com
   ALTERNATIVE_API_KEY=your_api_key_here
   ```

3. **Verify installation**:
   ```bash
   claudette --version    # Should output: 1.0.1
   claudette status       # Check system status
   ```

### 📋 Requirements
- **Node.js**: v18.0.0 or higher  
- **npm**: Latest version recommended
- **API Keys**: At least one AI provider API key (OpenAI, Anthropic, etc.)
- **Operating System**: Linux, macOS, Windows

---

## 🔧 API Usage

### Basic Backend Routing
```javascript
import { Claudette } from 'claudette';

const claudette = new Claudette({
  openai: { apiKey: process.env.OPENAI_API_KEY },
  claude: { apiKey: process.env.ANTHROPIC_API_KEY }
});

// Automatic backend selection
const response = await claudette.optimize({
  prompt: "Explain quantum computing",
  max_tokens: 500
});

console.log(response.content);
console.log(`Backend used: ${response.backend_used}`);
console.log(`Cost: €${response.cost_eur}`);
```

### System Status
```javascript
// Check system status
const status = await claudette.getStatus();
console.log(`System Health: ${status.healthy ? 'Healthy' : 'Unhealthy'}`);
console.log(`Version: ${status.version}`);
console.log(`Cache Hit Rate: ${status.cache.hit_rate}`);
```

---

## 📖 Documentation

### Core Documentation
- **[API Reference](docs/API.md)** - Complete API documentation
- **[Configuration Guide](docs/ENVIRONMENT_SETUP.md)** - Setup and configuration
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and components

### Development Resources  
- **[Configuration Examples](config/)** - Sample configurations
- **[TypeScript Types](src/types/)** - Type definitions
- **[Testing](tests/)** - Test examples and utilities

---

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Test your changes**: `npm test`
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`  
6. **Open a Pull Request**

### Development Setup
```bash
git clone https://github.com/RobLe3/claudette.git
cd claudette
npm install
npm run test:comprehensive  # Run full test suite
```

---

## 📊 Current Version

### ✅ v1.0.1 (Current)
- **Backend Support**: OpenAI, Claude, Qwen, Ollama, and custom backends
- **Monitoring**: Performance metrics and health monitoring
- **Cost Tracking**: Real-time cost calculation and budget management
- **Caching**: Intelligent response caching system
- **TypeScript**: Full type safety and modern development experience
- **CLI Tools**: Interactive setup and management commands

---

## 🐛 Support & Issues

- **Issues**: [GitHub Issues](https://github.com/RobLe3/claudette/issues)
- **Documentation**: [docs/](docs/)
- **License**: [MIT License](LICENSE)

---

*Claudette v1.0.1 - AI Backend Router & Cost Optimizer*