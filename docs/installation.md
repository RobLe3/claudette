# Installation Guide

This guide covers all installation methods for Claudette and its dependencies.

## Prerequisites

- **Python 3.11 or higher** (Python 3.12 recommended)
- **Claude CLI** installed and configured ([Installation Guide](https://docs.anthropic.com/claude/docs/cli-installation))
- **OpenAI API key** (optional, for preprocessing features)

## Installation Methods

### pip (Recommended)

Install the latest stable version from PyPI:

```bash
pip install claudette
```

Verify installation:
```bash
claudette --help
```

### Homebrew (macOS)

For macOS users, install via Homebrew:

```bash
# Add the tap
brew tap ruvnet/claude-flow

# Install claudette
brew install claudette

# Verify installation
claudette --version
```

### Development Installation

For development or contributing:

```bash
# Clone repository
git clone https://github.com/ruvnet/claude-flow.git
cd claude-flow

# Install in development mode
pip install -e ".[dev]"

# Install pre-commit hooks
pre-commit install

# Verify installation
claudette --help
```

## Configuration

### Basic Configuration

Create the configuration directory and file:

```bash
mkdir -p ~/.claudette
```

Create `~/.claudette/config.yaml`:

```yaml
# Claude CLI configuration
claude_cmd: claude

# OpenAI configuration (optional)
openai_key: your_openai_api_key_here
openai_model: gpt-3.5-turbo

# Backend settings
default_backend: claude
fallback_enabled: true

# Caching and history
history_enabled: true
cache_dir: ~/.claudette/cache

# Dashboard settings (optional)
dashboard:
  default_period: "week"
  max_file_display: 20
  refresh_interval: 30
```

### Environment Variables

Alternatively, configure using environment variables:

```bash
export OPENAI_API_KEY="your_openai_api_key_here"
export CLAUDE_CMD="claude"
export CLAUDETTE_CACHE_DIR="~/.claudette/cache"
```

## Optional Dependencies

### Dashboard Dependencies

For interactive dashboards and visualizations:

```bash
# Already included in standard installation
pip install claudette

# Or manually install specific components
pip install rich flask plotly pandas
```

### Development Dependencies

For development, testing, and documentation:

```bash
# Install all development dependencies
pip install claudette[dev]

# Or install individually
pip install pytest pytest-cov black isort flake8 mypy bandit pre-commit
pip install mkdocs mkdocs-material mkdocstrings
```

## Verification

### Basic Functionality

Test core features:

```bash
# Show help
claudette --help

# List available backends
claudette --backend list

# Test stats (with empty database)
claudette stats

# Test dashboard help
claudette dashboard --help
```

### Backend Verification

Test each backend:

```bash
# Test Claude backend (requires Claude CLI setup)
claudette edit --help

# Test OpenAI backend (requires API key)
claudette --backend openai edit --help

# Test fallback functionality
claudette --backend auto edit --help
```

### Dashboard Verification

Test dashboard features:

```bash
# Terminal dashboard
claudette dashboard terminal

# Web dashboard (opens http://localhost:8080)
claudette dashboard web
```

## Troubleshooting

### Common Installation Issues

**"Command not found: claudette"**
```bash
# Ensure pip installed to correct location
pip show claudette

# If using virtual environment, ensure it's activated
source venv/bin/activate  # or equivalent
```

**"No module named 'claudette'"**
```bash
# Reinstall with verbose output
pip install --upgrade --force-reinstall claudette -v
```

**"Permission denied" errors**
```bash
# Install with user flag
pip install --user claudette

# Or use virtual environment
python -m venv venv
source venv/bin/activate
pip install claudette
```

### Configuration Issues

**"Claude CLI not found"**
```bash
# Verify Claude CLI installation
claude --version

# If not installed, follow Claude CLI setup guide
# Set custom path in config.yaml if needed
claude_cmd: /usr/local/bin/claude
```

**"OpenAI API key not configured"**
```bash
# Set environment variable
export OPENAI_API_KEY="your_key_here"

# Or add to config.yaml
echo "openai_key: your_key_here" >> ~/.claudette/config.yaml
```

### Dashboard Issues

**"Rich not available" warning**
```bash
# Install dashboard dependencies
pip install rich flask plotly pandas
```

**"Port already in use" for web dashboard**
```bash
# Use different port
claudette dashboard web --port 3000

# Or find and kill process using port
lsof -ti:8080 | xargs kill
```

## Next Steps

- [Usage Guide](usage.md) - Learn how to use Claudette effectively
- [Cost Dashboard](guides/cost_dashboard.md) - Optimize your AI usage costs
- [Configuration Reference](configuration.md) - Advanced configuration options
- [Contributing](how_to_contribute.md) - Development setup and guidelines