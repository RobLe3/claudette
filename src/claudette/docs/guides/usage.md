# Usage Guide

Comprehensive guide to using Claudette's features and capabilities.

## Basic Commands

### Simple Usage

```bash
# Basic command
claudette "explain this code" main.py

# Multiple files
claudette "refactor these components" src/*.py

# With output redirection
claudette "generate documentation" > docs.md
```

### Backend Selection

```bash
# Use specific backend
claudette --backend claude "analyze performance"
claudette --backend openai "write tests" 
claudette --backend mistral "optimize code"
claudette --backend ollama "local analysis"

# Automatic backend selection (default)
claudette "smart routing based on cost/quality"
```

## Advanced Features

### Caching System

```bash
# View cache status
claudette --cache-info

# Clear cache
claudette --clear-cache

# Disable cache for single command
claudette --no-cache "always fresh response"
```

### Cost Analytics

```bash
# Quick stats
claudette stats

# Detailed analytics
claudette stats --period month --backend all

# Cost breakdown by backend
claudette stats --breakdown --export csv
```

### Dashboard Interface

```bash
# Terminal dashboard
claudette dashboard

# Web dashboard
claudette dashboard --web --port 8080

# Live monitoring
claudette dashboard --live --refresh 10
```

## Configuration Options

### Command Line Options

```bash
Options:
  --backend TEXT          Backend to use (claude, openai, mistral, ollama)
  --cache / --no-cache   Enable/disable caching (default: enabled)
  --verbose              Enable verbose output
  --config FILE          Custom configuration file
  --help                 Show help message
```

### Environment Variables

```bash
export CLAUDETTE_DEFAULT_BACKEND="openai"
export CLAUDETTE_CACHE_DIR="~/custom/cache"
export CLAUDETTE_CONFIG_FILE="~/my-config.yaml"
```

## Best Practices

### Performance Optimization

1. **Use caching**: Keep cache enabled for repeated tasks
2. **Choose appropriate backend**: Match backend to task complexity
3. **Batch operations**: Process multiple files together
4. **Monitor costs**: Regular stats review to optimize usage

### Cost Management

1. **Backend selection**: Use cost-effective backends for simple tasks
2. **Cache utilization**: Leverage cache for repeated operations
3. **Token optimization**: Enable preprocessing for large contexts
4. **Budget monitoring**: Set up alerts for usage thresholds