# Claudette AI Tools

A powerful collection of AI command-line tools and utilities, designed for flexible AI backend integration and advanced CLI functionality.

**🚀 Separated from claude-flow for independent Python development - January 2025**

## 🌟 Overview

Claudette AI Tools provides a sophisticated command-line interface for interacting with multiple AI backends, featuring advanced caching, lazy loading, plugin architecture, and intelligent cost optimization.

### Key Features

- **🤖 Multi-Backend AI Support**: OpenAI, Anthropic, Mistral, Ollama, and more
- **⚡ High-Performance CLI**: Advanced lazy loading and intelligent caching
- **💰 Cost Optimization**: Intelligent routing and budget management
- **🔌 Plugin Architecture**: Extensible system for custom functionality
- **📊 Performance Monitoring**: Real-time usage tracking and optimization
- **🛡️ Robust Error Handling**: Comprehensive fallback and recovery systems
- **💾 Session Management**: Persistent context and memory across sessions

## 📦 Installation

### Quick Install
```bash
pip install claudette-ai-tools
```

### Development Install
```bash
git clone https://github.com/ruvnet/claudette-ai-tools.git
cd claudette-ai-tools
pip install -e .
```

### Requirements
- Python 3.8+
- pip or conda package manager

## 🚀 Quick Start

### Basic Usage
```bash
# Simple AI interaction
claudette "Explain quantum computing"

# Specify backend
claudette "Write a Python function" --backend openai

# Use specific model
claudette "Code review this file" --model gpt-4

# Interactive mode
claudette --interactive
```

### Configuration
```bash
# Initialize configuration
claudette config init

# Set API keys
claudette config set openai_api_key "your-key-here"
claudette config set anthropic_api_key "your-key-here"

# View current config
claudette config show
```

## 🔧 Configuration

### Environment Variables
```bash
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
export MISTRAL_API_KEY="your-mistral-key"
export OLLAMA_BASE_URL="http://localhost:11434"
```

### Configuration File
Location: `~/.claudette/config.json`

```json
{
  "default_backend": "openai",
  "default_model": "gpt-3.5-turbo",
  "cache_enabled": true,
  "cost_tracking": true,
  "session_memory": true,
  "plugins": {
    "mistral": true,
    "ollama": true
  }
}
```

## 💻 Advanced Usage

### Backend Selection
```bash
# OpenAI GPT models
claudette "Your prompt" --backend openai --model gpt-4

# Anthropic Claude models
claudette "Your prompt" --backend anthropic --model claude-3-sonnet

# Mistral models
claudette "Your prompt" --backend mistral --model mistral-large

# Local Ollama models
claudette "Your prompt" --backend ollama --model llama2
```

### Cost Optimization
```bash
# Enable cost tracking
claudette "Your prompt" --track-costs

# Set budget limits
claudette config set daily_budget 10.00

# View cost analysis
claudette costs summary
```

### Performance Features
```bash
# Enable caching for repeated queries
claudette "Your prompt" --cache

# Batch processing
claudette batch --file prompts.txt

# Performance monitoring
claudette performance status
```

## 🔌 Plugin System

### Available Plugins
- **Mistral Backend**: Integration with Mistral AI models
- **Ollama Backend**: Local model support via Ollama
- **Performance Monitor**: Real-time performance tracking
- **Cost Tracker**: Advanced cost analysis and budgeting

### Plugin Management
```bash
# List available plugins
claudette plugins list

# Enable a plugin
claudette plugins enable mistral

# Disable a plugin
claudette plugins disable ollama

# Plugin status
claudette plugins status
```

## 📊 Monitoring and Analytics

### Performance Monitoring
```bash
# System health check
claudette health check

# Performance metrics
claudette metrics show

# Usage statistics
claudette stats summary
```

### Cost Tracking
```bash
# Daily cost summary
claudette costs daily

# Backend cost comparison
claudette costs compare

# Budget status
claudette costs budget
```

## 🛠️ Development

### Project Structure
```
claudette-ai-tools/
├── claudette/              # Main package
│   ├── core/               # Core functionality
│   │   ├── coordination/   # System coordination
│   │   ├── cost_tracking/  # Cost management
│   │   ├── neural/         # AI/ML features
│   │   └── performance/    # Performance monitoring
│   ├── plugins/            # Plugin system
│   ├── utils/              # Utility functions
│   └── tests/              # Test suite
├── docs/                   # Documentation
├── examples/               # Usage examples
└── scripts/                # Automation scripts
```

### Development Setup
```bash
# Clone repository
git clone https://github.com/ruvnet/claudette-ai-tools.git
cd claudette-ai-tools

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install development dependencies
pip install -e ".[dev]"

# Run tests
python -m pytest tests/

# Run linting
python -m flake8 claudette/
```

### Running Tests
```bash
# All tests
python -m pytest

# Specific test categories
python -m pytest tests/unit/
python -m pytest tests/integration/

# With coverage
python -m pytest --cov=claudette tests/
```

## 🔧 Architecture

### Core Components

#### 1. Advanced Lazy Loader
- Dynamic module loading for optimal performance
- Intelligent dependency resolution
- Memory optimization

#### 2. Backend System
- Unified interface for multiple AI providers
- Automatic fallback and retry logic
- Load balancing and cost optimization

#### 3. Caching Layer
- Intelligent query caching
- Configurable cache policies
- Performance boost for repeated operations

#### 4. Plugin Architecture
- Modular design for extensibility
- Hot-pluggable backend support
- Custom functionality integration

### Performance Optimizations
- **Lazy Loading**: Modules loaded only when needed
- **Intelligent Caching**: Smart cache invalidation and management
- **Connection Pooling**: Efficient API connection management
- **Async Operations**: Non-blocking operations where possible

## 🆚 Migration from claude-flow

If you're migrating from the mixed claude-flow repository, see our [Migration Guide](MIGRATION_GUIDE.md) for detailed instructions.

### Quick Migration
```bash
# Uninstall old mixed package (if applicable)
pip uninstall claude-flow-python

# Install new dedicated package
pip install claudette-ai-tools

# Update your scripts
# Old: from claude_flow.python import claudette
# New: from claudette import main
```

## 📚 Documentation

- [Installation Guide](docs/guides/installation.md)
- [Usage Guide](docs/guides/usage.md)
- [Configuration Reference](docs/api/configuration.md)
- [Plugin Development](docs/guides/plugin-development.md)
- [API Reference](docs/api/)
- [Troubleshooting](docs/guides/troubleshooting.md)

## 🔍 Examples

### Basic Examples
```bash
# Text generation
claudette "Write a haiku about programming"

# Code assistance
claudette "Optimize this Python function" --file mycode.py

# Creative writing
claudette "Write a short story about AI" --creative
```

### Advanced Examples
```bash
# Multi-turn conversation
claudette --interactive --memory

# Batch processing with different models
claudette batch --file tasks.jsonl --compare-models

# Cost-optimized routing
claudette "Complex analysis task" --optimize-cost --max-budget 1.00
```

See the [examples/](examples/) directory for more detailed usage examples.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/guides/contributing.md) for details.

### Quick Start for Contributors
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 🐛 Issues and Support

- **Bug Reports**: [GitHub Issues](https://github.com/ruvnet/claudette-ai-tools/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/ruvnet/claudette-ai-tools/discussions)
- **Documentation**: [docs/](docs/)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Separated from claude-flow for focused Python development
- Built with modern Python best practices
- Inspired by the AI development community

---

**⚡ Fast, flexible, and powerful AI command-line tools for modern development workflows.**