# Installation Guide

Complete installation and setup guide for claudette-ai-tools.

## 📋 System Requirements

### Minimum Requirements
- **Python**: 3.8 or higher
- **pip**: Latest version recommended
- **Operating System**: macOS, Linux, or Windows
- **Memory**: 512MB RAM minimum
- **Storage**: 100MB free space

### Recommended Requirements
- **Python**: 3.10+ for optimal performance
- **Virtual Environment**: venv or conda
- **Internet Connection**: For AI backend access
- **Terminal**: Modern terminal with color support

## 📦 Installation Methods

### Method 1: pip Install (Recommended)

```bash
# Install from PyPI (when published)
pip install claudette-ai-tools

# Verify installation
claudette --version
```

### Method 2: Development Install

```bash
# Clone the repository
git clone https://github.com/ruvnet/claudette-ai-tools.git
cd claudette-ai-tools

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install in development mode
pip install -e .

# Verify installation
claudette --version
```

### Method 3: Direct GitHub Install

```bash
# Install directly from GitHub
pip install git+https://github.com/ruvnet/claudette-ai-tools.git

# Or specify a branch/tag
pip install git+https://github.com/ruvnet/claudette-ai-tools.git@main
```

## 🔧 Initial Setup

### 1. Configuration Initialization

```bash
# Initialize configuration
claudette config init

# This creates ~/.claudette/config.json with defaults
```

### 2. API Key Configuration

Set up your AI backend API keys:

```bash
# OpenAI
claudette config set openai_api_key "your-openai-api-key"

# Anthropic
claudette config set anthropic_api_key "your-anthropic-api-key"

# Mistral (optional)
claudette config set mistral_api_key "your-mistral-api-key"

# Verify configuration
claudette config show
```

### 3. Environment Variables (Alternative)

You can also use environment variables:

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export MISTRAL_API_KEY="your-mistral-api-key"
export OLLAMA_BASE_URL="http://localhost:11434"  # For local Ollama
```

### 4. Test Installation

```bash
# Test basic functionality
claudette "Hello, this is a test"

# Test specific backend
claudette "Test OpenAI" --backend openai
claudette "Test Anthropic" --backend anthropic

# Check system status
claudette health check
```

## 🔌 Plugin Installation

### Core Plugins (Included)

Core plugins are included by default:
- **OpenAI Backend**: GPT models support
- **Anthropic Backend**: Claude models support
- **Basic Cache System**: Query caching
- **Cost Tracker**: Usage monitoring

### Optional Plugins

Install additional backends:

```bash
# Enable Mistral backend
claudette plugins enable mistral

# Enable Ollama for local models
claudette plugins enable ollama

# List available plugins
claudette plugins list

# Check plugin status
claudette plugins status
```

## 🖥️ Platform-Specific Setup

### macOS Setup

```bash
# Install via Homebrew (if available)
brew install python3 pip

# Install claudette-ai-tools
pip3 install claudette-ai-tools

# Add to PATH if needed
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Linux Setup

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip

# CentOS/RHEL
sudo yum install python3 python3-pip

# Install claudette-ai-tools
pip3 install --user claudette-ai-tools

# Add to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Windows Setup

```powershell
# Install Python from python.org or Microsoft Store
# Then install claudette-ai-tools
pip install claudette-ai-tools

# Verify installation
claudette --version
```

**Windows PowerShell Note**: You may need to enable script execution:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🐳 Docker Installation

### Using Docker

```bash
# Pull the image (when available)
docker pull claudette/ai-tools

# Run container
docker run -it --rm \
  -e OPENAI_API_KEY="your-key" \
  -e ANTHROPIC_API_KEY="your-key" \
  claudette/ai-tools "your prompt here"
```

### Build from Source

```bash
# Clone repository
git clone https://github.com/ruvnet/claudette-ai-tools.git
cd claudette-ai-tools

# Build Docker image
docker build -t claudette-ai-tools .

# Run container
docker run -it --rm \
  -e OPENAI_API_KEY="your-key" \
  claudette-ai-tools "your prompt"
```

## 🌐 Virtual Environment Setup

### Using venv (Recommended)

```bash
# Create virtual environment
python -m venv claudette-env

# Activate environment
source claudette-env/bin/activate  # Linux/macOS
# claudette-env\Scripts\activate  # Windows

# Install claudette-ai-tools
pip install claudette-ai-tools

# Deactivate when done
deactivate
```

### Using conda

```bash
# Create conda environment
conda create -n claudette-env python=3.10

# Activate environment
conda activate claudette-env

# Install claudette-ai-tools
pip install claudette-ai-tools

# Deactivate when done
conda deactivate
```

## 🔒 Security Configuration

### API Key Security

**Never commit API keys to version control!**

```bash
# Use a secure .env file
echo "OPENAI_API_KEY=your-key" > ~/.claudette/.env
echo "ANTHROPIC_API_KEY=your-key" >> ~/.claudette/.env

# Set secure permissions
chmod 600 ~/.claudette/.env

# Load in shell profile
echo 'source ~/.claudette/.env' >> ~/.zshrc
```

### Configuration File Security

```bash
# Set secure permissions on config
chmod 600 ~/.claudette/config.json

# Verify permissions
ls -la ~/.claudette/
```

## 🧪 Development Setup

### For Contributors

```bash
# Clone repository
git clone https://github.com/ruvnet/claudette-ai-tools.git
cd claudette-ai-tools

# Create development environment
python -m venv dev-env
source dev-env/bin/activate

# Install development dependencies
pip install -e ".[dev]"

# Install pre-commit hooks
pre-commit install

# Run tests
python -m pytest tests/

# Run linting
flake8 claudette/
black claudette/
isort claudette/
```

### Development Dependencies

The development installation includes:
- **pytest**: Testing framework
- **black**: Code formatting
- **flake8**: Linting
- **isort**: Import sorting
- **pre-commit**: Git hooks
- **mypy**: Type checking

## ✅ Verification Checklist

After installation, verify everything works:

- [ ] **Basic Command**: `claudette --version` shows version
- [ ] **Configuration**: `claudette config show` displays config
- [ ] **API Connection**: `claudette "test"` returns AI response
- [ ] **Backend Selection**: `claudette "test" --backend openai` works
- [ ] **Plugin System**: `claudette plugins list` shows available plugins
- [ ] **Health Check**: `claudette health check` passes all tests

## 🐛 Troubleshooting Installation

### Common Issues

**Issue: "Command not found: claudette"**
```bash
# Solution: Check if claudette is in PATH
which claudette

# If not found, add to PATH
export PATH="$HOME/.local/bin:$PATH"

# Or reinstall with --user flag
pip install --user claudette-ai-tools
```

**Issue: "Permission denied"**
```bash
# Solution: Install with user flag
pip install --user claudette-ai-tools

# Or use virtual environment
python -m venv venv
source venv/bin/activate
pip install claudette-ai-tools
```

**Issue: "Module not found"**
```bash
# Solution: Verify Python version
python --version  # Should be 3.8+

# Check pip installation
pip --version

# Reinstall if needed
pip uninstall claudette-ai-tools
pip install claudette-ai-tools
```

**Issue: "API key not working"**
```bash
# Solution: Verify key configuration
claudette config show

# Test key manually
claudette config test-connection

# Re-set keys if needed
claudette config set openai_api_key "your-new-key"
```

### Getting Help

1. **Check Documentation**: Review this guide and API docs
2. **Run Diagnostics**: `claudette health check --verbose`
3. **Check Logs**: `claudette logs show --recent`
4. **Report Issues**: [GitHub Issues](https://github.com/ruvnet/claudette-ai-tools/issues)

## 🚀 Next Steps

After successful installation:

1. **Read the [Usage Guide](usage.md)** for basic commands
2. **Configure your preferred backends** in the config
3. **Explore the [Examples](../../examples/)** directory
4. **Check out [Advanced Features](../api/)** documentation
5. **Join the community** for support and updates

---

**✅ Installation Complete!** You're ready to use claudette-ai-tools.