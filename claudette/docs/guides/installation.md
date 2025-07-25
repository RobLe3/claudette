# Installation Guide

Complete installation and setup instructions for Claudette.

## Prerequisites

### System Requirements
- **Python**: 3.11 or higher
- **Operating System**: macOS, Linux, or Windows
- **Memory**: 512MB+ available RAM
- **Disk Space**: 100MB+ for installation and cache

### Dependencies
- **Claude CLI**: Official Claude Code CLI (optional, for Claude backend)
- **API Keys**: OpenAI, Anthropic, or Mistral API keys (depending on backends used)

## Installation Methods

### Method 1: Install from PyPI (Recommended)

```bash
# Install latest stable version
pip install claudette

# Install with all optional dependencies
pip install claudette[all]

# Install with specific backend support
pip install claudette[openai,mistral]
```

### Method 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/username/claudette.git
cd claudette

# Install in development mode
pip install -e .

# Or install with all dependencies
pip install -e ".[dev,all]"
```

## Configuration

### Configuration File

Create configuration file at `~/.claudette/config.yaml`:

```yaml
# Default backend selection
default_backend: claude
fallback_enabled: true

# API Configuration
openai_api_key: ${OPENAI_API_KEY}
openai_model: gpt-4
mistral_api_key: ${MISTRAL_API_KEY}
mistral_model: mistral-large

# Caching Settings
cache_enabled: true
cache_dir: ~/.claudette/cache
cache_ttl: 3600  # 1 hour

# Dashboard Settings
dashboard:
  default_period: week
  refresh_interval: 30
  theme: dark
```

## Verification

### Basic Functionality Test

```bash
# Test installation
claudette --version

# Test basic command
claudette "hello world"

# Test with specific backend
claudette --backend openai "what is 2+2?"

# Test stats
claudette stats --summary
```