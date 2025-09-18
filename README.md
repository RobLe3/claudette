# Claudette v1.0.2 - Maximize Your AI Investment 🧠

🚀 **Smart AI Middleware That Saves Money While Preserving Quality**

> **v1.0.2**: Get more from your AI budget by intelligently routing requests across multiple providers. Reduce costs while maintaining the quality your users expect.

![Version](https://img.shields.io/badge/version-1.0.2-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue)
![Tested](https://img.shields.io/badge/Core_System-Verified-brightgreen)
![Status](https://img.shields.io/badge/Status-Stable-brightgreen)

---

## 🎯 What is Claudette?

Claudette is an **AI middleware platform** that helps you **maximize your AI investment** while maintaining quality. Instead of being locked into expensive single-provider solutions, Claudette intelligently routes your requests across multiple AI backends to deliver the best value.

## 💼 What Claudette Helps You With

### 🏢 **For Businesses**
- **Reduce AI costs** by automatically choosing cost-effective backends for routine tasks
- **Extend subscription value** - get significantly more AI interactions for the same budget
- **Avoid vendor lock-in** with support for multiple AI providers
- **Scale confidently** with built-in failover and health monitoring
- **Track spending** with real-time cost monitoring and budget controls

### 👨‍💻 **For Developers**
- **Build AI features faster** with a unified API across multiple providers
- **Prevent outages** with automatic failover between AI services
- **Optimize performance** with intelligent caching and routing
- **Debug easily** with comprehensive logging and monitoring
- **Deploy reliably** with production-tested infrastructure

### 🎓 **For Teams & Projects**
- **Make AI budgets last longer** by optimizing every request
- **Ensure consistent quality** while reducing costs
- **Simplify AI integration** with one interface for multiple providers
- **Stay operational** even when one AI service has issues
- **Scale usage** without proportional cost increases

### 🌟 **Real-World Use Cases**
- **Content teams**: Draft with cost-effective models, polish with premium ones - save budget for creative review
- **Development teams**: Route code questions intelligently - simple syntax to fast models, architecture to specialized ones  
- **Customer support**: Handle routine inquiries efficiently while ensuring complex issues get premium treatment
- **Research projects**: Optimize between speed and quality based on whether it's exploration or final analysis
- **Startups**: Access multiple AI capabilities without multiple expensive subscriptions

### 🏆 Key Features
- **🔄 Smart Routing** - Automatic selection between OpenAI, Claude, Qwen, and Ollama based on your needs
- **💰 Cost Intelligence** - Real-time optimization to maximize your AI budget
- **📊 Transparency** - Track performance, costs, and quality across all providers
- **🏗️ Developer Ready** - Full TypeScript support with modern tooling
- **⚡ Performance** - Intelligent caching and optimized request handling
- **🛡️ Reliability** - Circuit breakers and graceful failure recovery

---

## 🚀 Quick Start

### ⚡ See the Value in 2 Minutes

```bash
# Install Claudette
npm install -g claudette
claudette init

# Make your first optimized request
claudette "Explain machine learning" --verbose

# See the cost savings and backend selection in action
# Claudette automatically chose the most cost-effective backend
# while maintaining quality standards
```

### 💡 **What Just Happened?**
Instead of paying premium rates for a simple explanation, Claudette:
1. **Analyzed your request** - determined it was educational content
2. **Selected the optimal backend** - chose a cost-effective model that excels at explanations  
3. **Delivered quality results** - maintained high response quality while reducing costs
4. **Showed transparency** - displayed which backend was used and the actual cost

### 📦 Installation Options

```bash
# Option 1: NPM Installation (Recommended)
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
   claudette --version    # Should output: 1.0.2
   claudette status       # Check system status
   ```

### 📋 Requirements
- **Node.js**: v18.0.0 or higher  
- **npm**: Latest version recommended
- **API Keys**: At least one AI provider API key (OpenAI, Anthropic, etc.)
- **Operating System**: Linux, macOS, Windows

---

## 💡 Why Use Claudette? 

### Without Claudette
```javascript
// Locked into one expensive provider
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Simple question" }]
});
// Cost: $0.03 per request, no failover, single provider dependency
```

### With Claudette
```javascript
// Intelligent routing across multiple providers
const response = await claudette.optimize("Simple question");
// Cost: $0.002 per request, automatic failover, best provider for each task
```

**Result**: Up to 95% cost reduction while maintaining quality and reliability.

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

### ✅ v1.0.2 (Current)
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

*Claudette v1.0.2 - AI Backend Router & Cost Optimizer*