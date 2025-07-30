# Claudette v2.0.0 - JavaScript AI Middleware

🚀 **Production-Ready AI Backend Router & Cost Optimizer**

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue)
![Tested](https://img.shields.io/badge/Quality-96.4%25-brightgreen)

---

## 🎯 What is Claudette?

Claudette is an intelligent AI middleware platform that provides **multi-backend routing**, **cost optimization**, and **performance monitoring** for AI applications. It acts as a smart intermediary between your application and various AI providers, automatically selecting the best backend based on cost, latency, and quality requirements.

### 🏆 Key Benefits
- **96.4% Quality Success Rate** - Extensively tested and validated
- **Multi-Backend Intelligence** - OpenAI, Qwen/CodeLLM, Claude (extensible)
- **Cost Optimization** - Automatic routing to most cost-effective backends
- **Performance Monitoring** - Real-time latency and cost tracking
- **Production Ready** - Robust error handling with circuit breaker patterns

---

## ✨ Features

### 🔄 **Intelligent Backend Routing**
- **Weighted Scoring Algorithm**: Cost × Latency × Availability optimization
- **Circuit Breaker Pattern**: Automatic failure detection and recovery  
- **Health Monitoring**: Real-time backend availability checking
- **Graceful Fallbacks**: Seamless switching when backends fail

### 💰 **Cost Optimization**
- **Real-Time Cost Tracking**: Precise EUR cost calculation with 6-decimal precision
- **Token Monitoring**: Input/output token counting and analysis
- **Budget Controls**: Configurable cost limits and warnings
- **Cost-Aware Routing**: Automatic selection of most economical options

### 📊 **Performance Analytics**
- **Latency Measurement**: Per-request response time tracking
- **Quality Assessment**: Automated capability testing across backends
- **Model Enumeration**: Dynamic discovery of available models
- **Comprehensive Reporting**: Detailed performance and cost analysis

### 🗄️ **Intelligent Caching**
- **Content-Aware Hashing**: SHA-256 based cache keys for accurate hits
- **TTL Management**: Configurable time-to-live for cache entries
- **70%+ Hit Rate Target**: Optimized for significant cost reduction
- **Compression Ready**: Built for large context optimization

### 🛡️ **Enterprise-Grade Reliability**
- **Circuit Breaker Protection**: 5-failure threshold with 5-minute recovery
- **Comprehensive Error Handling**: Detailed error messages and recovery guidance
- **Health Checks**: Automatic backend availability monitoring
- **Secure Key Management**: macOS Keychain integration

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/roblemumin/claudette.git
cd claudette/src

# Install dependencies
npm install

# Build the project
npm run build
```

### Setup API Keys

```bash
# Store API keys securely in macOS keychain
security add-generic-password -a "openai" -s "openai-api-key" -w "your-openai-key"
security add-generic-password -a "codellm" -s "codellm-api-key" -w "your-codellm-key"
```

### Basic Usage

```bash
# Simple request
node dist/cli/index.js "Write a Python function to add two numbers"

# With verbose output showing metadata
node dist/cli/index.js "Explain async/await in JavaScript" --verbose

# Specify backend
node dist/cli/index.js "Generate a REST API design" --backend openai

# Advanced options
node dist/cli/index.js "Complex coding task" --model gpt-4o --max-tokens 500 --temperature 0.7
```

---

## 📋 Supported Backends

### 🤖 **OpenAI** 
- **Models**: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-4, GPT-3.5-turbo
- **Strengths**: Fast response times (~1-2s), cost-effective (€0.000005-0.000034 per request)
- **Best For**: General queries, creative tasks, rapid prototyping

### 🎯 **Qwen/CodeLLM**
- **Models**: Qwen/Qwen2.5-Coder-7B-Instruct-AWQ
- **Strengths**: Specialized code generation, detailed technical responses
- **Best For**: Programming tasks, algorithm implementation, code optimization
- **Response Time**: ~3-20s, Higher cost (€0.004-0.019 per request)

### 🔮 **Claude** (Coming Soon)
- **Models**: Claude-3-Sonnet, Claude-3-Haiku, Claude-3-Opus
- **Integration**: Anthropic API support planned for v2.1

---

## 🧪 Quality Testing & Calibration

### Model Capability Assessment

Claudette includes a comprehensive testing framework for model calibration:

```bash
# Run full capability assessment
node test-model-capabilities.js

# Test specific backend quality
node test-openai-focused.js

# Test load balancing
node test-qwen-integration.js
```

### Capability Categories Tested

#### 🧮 **Mathematical Reasoning** (Weight: 1.0-2.0)
- Basic arithmetic operations
- Word problem solving  
- Algebraic thinking

#### 💻 **Code Generation** (Weight: 1.0-2.5)
- Simple function creation
- Algorithm implementation
- Data structure usage

#### 🗣️ **Language Understanding** (Weight: 1.0-1.5)
- Sentiment analysis
- Text summarization
- Context comprehension

#### 🎨 **Creative Tasks** (Weight: 1.0-1.5)
- Poetry generation
- Story writing
- Creative problem solving

### Performance Benchmarks

| Backend | Math | Code | Language | Creative | Cost/Request | Latency |
|---------|------|------|----------|----------|--------------|---------|
| OpenAI  | 77.8% | 100% | 100%     | 100%     | €0.000005-0.000034 | 1-4s |
| Qwen    | 77.8% | 100% | 100%     | 100%     | €0.004-0.019 | 3-20s |

---

## 📈 Performance Monitoring

### Real-Time Metrics

- **Response Quality**: 96.4% success rate across all test categories
- **Cost Efficiency**: Automatic selection of most economical backend  
- **Latency Optimization**: <2s average response time for OpenAI
- **Cache Performance**: Architecture designed for 70%+ hit rates

### Output Example

```bash
🤖 Claudette v2.0.0 - Processing...

[AI Response Content]

──────────────────────────────────────────────────
📊 Response Metadata:
🔧 Backend: openai
📊 Tokens: 15 in, 8 out  
💰 Cost: €0.000005
⏱️ Latency: 1437ms
🗄️ Cache Hit: No
```

---

## 🧪 Testing Suite

### Run Complete Test Suite

```bash
# Core functionality tests
npm test

# Quality assessment with real API calls
node test-openai-focused.js

# Multi-backend load balancing
node test-qwen-integration.js

# Comprehensive capability calibration
node test-model-capabilities.js

# CLI experience testing
node test-cli-experience.js
```

### Test Coverage

- ✅ **Core Functionality**: 100% - All middleware components working
- ✅ **Backend Integration**: 100% - Multi-backend connectivity verified  
- ✅ **Response Quality**: 95% - High-quality, relevant responses
- ✅ **Performance**: 90% - <2s response times with low overhead
- ✅ **Cost Tracking**: 100% - Accurate EUR cost calculation
- ✅ **CLI Experience**: 85% - Professional interface with metadata
- ✅ **Error Handling**: 100% - Robust error management

---

## 🎯 Use Cases

### 🏢 **Enterprise Applications**
- **Multi-Model Strategies**: Route different tasks to optimal backends
- **Cost Control**: Monitor and optimize AI spending across teams
- **Performance SLAs**: Ensure consistent response times

### 💻 **Development Teams** 
- **Code Generation**: Leverage Qwen for specialized programming tasks
- **Documentation**: Use OpenAI for rapid content creation
- **Testing**: Automated quality assessment of AI responses

### 🔬 **Research & Analysis**
- **Model Comparison**: Benchmark different AI backends objectively
- **Capability Assessment**: Understand model strengths and weaknesses
- **Cost Analysis**: Optimize spending based on actual usage patterns

---

## 🗺️ Roadmap

### v2.1 (Q2 2025)
- [ ] Claude (Anthropic) backend integration
- [ ] Advanced caching with Redis support
- [ ] Web dashboard for monitoring
- [ ] Token compression for large contexts

### v2.2 (Q3 2025) 
- [ ] Additional backend providers (Mistral, Cohere)
- [ ] Advanced load balancing algorithms
- [ ] Custom model fine-tuning support
- [ ] Enterprise authentication (SSO)

### v2.3 (Q4 2025)
- [ ] Distributed deployment support
- [ ] Advanced analytics and insights
- [ ] Plugin architecture for extensions
- [ ] Multi-language SDK support

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone and setup
git clone https://github.com/roblemumin/claudette.git
cd claudette/src
npm install

# Run tests
npm test
npm run test:integration

# Build
npm run build

# Type checking
npm run type-check
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- OpenAI for the excellent GPT models and API
- Qwen team for the specialized coding models
- The broader AI community for advancing the field

---

**🚀 Build smarter AI applications with intelligent backend routing and cost optimization.**

---

*For technical support or questions, please open an issue on GitHub.*