# Usage Guide

Comprehensive guide for using claudette-ai-tools effectively.

## 🚀 Quick Start

### Basic Usage

```bash
# Simple AI interaction
claudette "Explain quantum computing"

# Specify a backend
claudette "Write a Python function" --backend openai

# Use a specific model
claudette "Code review this file" --model gpt-4

# Interactive mode
claudette --interactive
```

### Getting Help

```bash
# Show help
claudette --help

# Show version
claudette --version

# Show configuration
claudette config show
```

## 💻 Command Structure

### Basic Syntax

```bash
claudette [prompt] [options]
claudette [command] [subcommand] [options]
```

### Global Options

| Option | Description | Example |
|--------|-------------|---------|
| `--backend` | AI backend to use | `--backend openai` |
| `--model` | Specific model | `--model gpt-4` |
| `--interactive` | Interactive mode | `--interactive` |
| `--verbose` | Verbose output | `--verbose` |
| `--config` | Config file path | `--config /path/to/config.json` |
| `--help` | Show help | `--help` |

## 🤖 Backend Selection

### Available Backends

#### OpenAI
```bash
# Use OpenAI (default)
claudette "Your prompt" --backend openai

# Specific OpenAI models
claudette "Your prompt" --backend openai --model gpt-4
claudette "Your prompt" --backend openai --model gpt-3.5-turbo
claudette "Your prompt" --backend openai --model gpt-4-turbo
```

#### Anthropic
```bash
# Use Anthropic Claude
claudette "Your prompt" --backend anthropic

# Specific Claude models
claudette "Your prompt" --backend anthropic --model claude-3-sonnet
claudette "Your prompt" --backend anthropic --model claude-3-haiku
claudette "Your prompt" --backend anthropic --model claude-3-opus
```

#### Mistral
```bash
# Use Mistral
claudette "Your prompt" --backend mistral

# Specific Mistral models
claudette "Your prompt" --backend mistral --model mistral-large
claudette "Your prompt" --backend mistral --model mistral-medium
claudette "Your prompt" --backend mistral --model mistral-small
```

#### Ollama (Local Models)
```bash
# Use local Ollama
claudette "Your prompt" --backend ollama

# Specific local models
claudette "Your prompt" --backend ollama --model llama2
claudette "Your prompt" --backend ollama --model codellama
claudette "Your prompt" --backend ollama --model mistral
```

### Backend Configuration

```bash
# Set default backend
claudette config set default_backend anthropic

# Set default model for a backend
claudette config set openai.default_model gpt-4
claudette config set anthropic.default_model claude-3-sonnet
```

## 🔧 Configuration Management

### Configuration Commands

```bash
# Initialize configuration
claudette config init

# Show current configuration
claudette config show

# Show specific setting
claudette config get openai_api_key

# Set a configuration value
claudette config set default_backend anthropic

# Remove a setting
claudette config unset mistral_api_key

# Validate configuration
claudette config validate

# Test API connections
claudette config test-connection
```

### Configuration File

Location: `~/.claudette/config.json`

```json
{
  "default_backend": "openai",
  "backends": {
    "openai": {
      "api_key": "your-openai-key",
      "default_model": "gpt-3.5-turbo",
      "max_tokens": 1000
    },
    "anthropic": {
      "api_key": "your-anthropic-key", 
      "default_model": "claude-3-sonnet",
      "max_tokens": 1000
    }
  },
  "features": {
    "cache_enabled": true,
    "cost_tracking": true,
    "session_memory": true
  }
}
```

## 💰 Cost Tracking

### Cost Commands

```bash
# Enable cost tracking
claudette "Your prompt" --track-costs

# View cost summary
claudette costs summary

# Daily costs
claudette costs daily

# Backend comparison
claudette costs compare

# Set budget limits
claudette costs budget set --daily 10.00 --monthly 100.00

# Check budget status
claudette costs budget status
```

### Cost Optimization

```bash
# Auto-optimize for cost
claudette "Your prompt" --optimize-cost

# Set maximum cost for query
claudette "Your prompt" --max-cost 0.10

# Use cheapest available backend
claudette "Your prompt" --prefer-cheap
```

## ⚡ Performance Features

### Caching

```bash
# Enable caching (default)
claudette "Your prompt" --cache

# Disable caching
claudette "Your prompt" --no-cache

# Clear cache
claudette cache clear

# Cache statistics
claudette cache stats
```

### Performance Monitoring

```bash
# Check system performance
claudette performance status

# Detailed performance metrics
claudette performance metrics

# Performance history
claudette performance history --days 7
```

## 🔌 Plugin System

### Plugin Management

```bash
# List available plugins
claudette plugins list

# Show plugin details
claudette plugins info mistral

# Enable a plugin
claudette plugins enable mistral

# Disable a plugin
claudette plugins disable ollama

# Check plugin status
claudette plugins status

# Update plugins
claudette plugins update
```

### Available Plugins

- **mistral**: Mistral AI backend support
- **ollama**: Local model support via Ollama
- **performance-monitor**: Real-time performance tracking
- **cost-optimizer**: Advanced cost management
- **session-manager**: Enhanced session handling

## 🎯 Interactive Mode

### Starting Interactive Mode

```bash
# Basic interactive mode
claudette --interactive

# Interactive with specific backend
claudette --interactive --backend anthropic

# Interactive with memory
claudette --interactive --memory
```

### Interactive Commands

```
> help                    # Show interactive help
> backend openai          # Switch backend
> model gpt-4             # Switch model
> history                 # Show conversation history
> clear                   # Clear conversation
> save session.json       # Save session
> load session.json       # Load session
> exit                    # Exit interactive mode
```

## 📁 File Operations

### Working with Files

```bash
# Process a file
claudette "Analyze this code" --file mycode.py

# Multiple files
claudette "Compare these files" --files file1.py file2.py

# Output to file
claudette "Generate code" --output result.py

# Append to file
claudette "Add comments" --file code.py --append
```

### Batch Processing

```bash
# Process multiple prompts from file
claudette batch --file prompts.txt

# Process with different models
claudette batch --file prompts.txt --compare-models

# Batch with output directory
claudette batch --file prompts.txt --output-dir results/
```

## 🔄 Session Management

### Session Commands

```bash
# Save current session
claudette session save my-session

# Load a session
claudette session load my-session

# List saved sessions
claudette session list

# Delete a session
claudette session delete my-session

# Export session
claudette session export my-session --format json
```

### Session Features

- **Conversation History**: Maintain context across interactions
- **Backend Preferences**: Remember backend and model choices
- **Cost Tracking**: Accumulate costs across session
- **Performance Metrics**: Track session performance

## 🛠️ Advanced Usage

### Environment Variables

```bash
# Set backend via environment
export CLAUDETTE_BACKEND=anthropic
export CLAUDETTE_MODEL=claude-3-sonnet

# Set API keys
export OPENAI_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"

# Set configuration path
export CLAUDETTE_CONFIG="~/.my-claudette-config.json"
```

### Custom Configurations

```bash
# Use custom config file
claudette --config /path/to/config.json "Your prompt"

# Override backend temporarily
claudette --backend openai "Your prompt"

# Multiple overrides
claudette --backend anthropic --model claude-3-opus --max-tokens 2000 "Your prompt"
```

### Scripting and Automation

```bash
# Use in scripts
#!/bin/bash
response=$(claudette "Generate a summary" --no-interactive)
echo "AI Response: $response"

# Pipe input
echo "Analyze this text" | claudette --stdin

# JSON output for parsing
claudette "Your prompt" --format json
```

## 📊 Monitoring and Analytics

### Health Checks

```bash
# System health check
claudette health check

# Detailed health report
claudette health check --verbose

# Check specific components
claudette health check --component cache
claudette health check --component backends
```

### Usage Statistics

```bash
# Usage summary
claudette stats summary

# Detailed usage report
claudette stats detailed

# Usage by backend
claudette stats by-backend

# Export statistics
claudette stats export --format csv --file usage.csv
```

## 🔍 Troubleshooting

### Debug Mode

```bash
# Enable debug output
claudette "Your prompt" --debug

# Verbose logging
claudette "Your prompt" --verbose

# Log to file
claudette "Your prompt" --log-file debug.log
```

### Common Issues

```bash
# Test API connectivity
claudette config test-connection

# Validate configuration
claudette config validate

# Clear cache if issues
claudette cache clear

# Reset configuration
claudette config reset --confirm
```

### Log Analysis

```bash
# Show recent logs
claudette logs show --recent

# Show error logs
claudette logs show --level error

# Show logs for specific component
claudette logs show --component backend
```

## 📚 Examples

### Basic Examples

```bash
# Text generation
claudette "Write a haiku about programming"

# Code assistance
claudette "Optimize this Python function" --file mycode.py

# Translation
claudette "Translate 'Hello world' to Spanish"

# Creative writing
claudette "Write a short story about AI" --creative
```

### Advanced Examples

```bash
# Multi-step analysis
claudette "Analyze the code, then suggest improvements" --file app.py --detailed

# Cost-optimized processing
claudette "Process this data" --file data.csv --optimize-cost --max-budget 1.00

# Comparative analysis
claudette "Compare these approaches" --compare-models --backends openai,anthropic

# Batch processing with templates
claudette batch --template "Analyze: {input}" --file inputs.txt
```

### Integration Examples

```bash
# Git commit messages
git diff | claudette "Generate a commit message" --stdin

# Code review
claudette "Review this PR" --file changes.diff --format checklist

# Documentation
claudette "Generate docs for this module" --file module.py --output docs.md
```

## 🎓 Best Practices

### Prompt Engineering

1. **Be Specific**: Clear, detailed prompts get better results
2. **Provide Context**: Include relevant background information
3. **Use Examples**: Show the desired output format
4. **Iterate**: Refine prompts based on results

### Cost Management

1. **Use Appropriate Models**: Don't use expensive models for simple tasks
2. **Enable Caching**: Reuse results when possible
3. **Set Budgets**: Use budget limits to control costs
4. **Monitor Usage**: Regular cost reviews

### Performance Optimization

1. **Choose Right Backend**: Different backends excel at different tasks
2. **Use Caching**: Enable caching for repeated queries
3. **Batch Operations**: Process multiple items together
4. **Monitor Performance**: Track and optimize usage patterns

---

**🎯 Ready to explore more?** Check out the [Examples](../../examples/) directory for real-world usage scenarios.