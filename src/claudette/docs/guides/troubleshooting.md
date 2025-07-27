# Troubleshooting Guide

Common issues and solutions for Claudette.

## Installation Issues

### Python Version Problems

**Problem**: `claudette` requires Python 3.11+ but system has older version

**Solutions**:
```bash
# Check Python version
python --version

# Install Python 3.11+ via pyenv
curl https://pyenv.run | bash
pyenv install 3.11.0
pyenv global 3.11.0

# Or use conda
conda create -n claudette python=3.11
conda activate claudette
```

### Permission Errors

**Problem**: Permission denied during installation

**Solutions**:
```bash
# Install for user only
pip install --user claudette

# Use virtual environment (recommended)
python -m venv claudette-env
source claudette-env/bin/activate
pip install claudette

# Fix pip permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.local
```

### Package Not Found

**Problem**: `pip install claudette` fails with "package not found"

**Solutions**:
```bash
# Update pip
pip install --upgrade pip

# Install from source
git clone https://github.com/username/claudette
cd claudette
pip install -e .

# Check PyPI status
pip search claudette
```

## Configuration Issues

### API Key Problems

**Problem**: "Invalid API key" or "Authentication failed"

**Diagnosis**:
```bash
# Check if API key is set
echo $OPENAI_API_KEY | head -c 10

# Test API key directly
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

**Solutions**:
```bash
# Set environment variable
export OPENAI_API_KEY="sk-your-actual-api-key"

# Add to shell profile
echo 'export OPENAI_API_KEY="sk-your-key"' >> ~/.bashrc
source ~/.bashrc

# Use config file
mkdir -p ~/.claudette
echo "openai_api_key: sk-your-key" >> ~/.claudette/config.yaml
```

### Backend Not Available

**Problem**: "Backend 'claude' not available"

**Diagnosis**:
```bash
# Check backend availability
claudette backends list

# Test specific backend
claudette --backend claude --dry-run "test"
```

**Solutions**:
```bash
# Install Claude CLI
curl -sSL https://claude.ai/cli/install.sh | bash
claude auth login

# Configure alternative backend
claudette --backend openai "test message"

# Check backend configuration
claudette config show
```

### Configuration File Issues

**Problem**: Invalid configuration file format

**Diagnosis**:
```bash
# Validate configuration
claudette config validate

# Show current config
claudette config show --raw
```

**Solutions**:
```bash
# Reset to defaults
mv ~/.claudette/config.yaml ~/.claudette/config.yaml.backup
claudette config init

# Fix YAML syntax
# - Use spaces, not tabs
# - Check indentation
# - Quote string values with special characters
```

## Runtime Issues

### Cache Problems

**Problem**: Cache corruption or permission errors

**Symptoms**:
- "Database is locked" errors
- Slow performance despite caching enabled
- Cache hit rate is 0%

**Diagnosis**:
```bash
# Check cache status
claudette cache stats

# Check cache directory permissions
ls -la ~/.claudette/cache/
```

**Solutions**:
```bash
# Clear cache
claudette cache clear --confirm

# Fix permissions
chmod 755 ~/.claudette/cache/
chmod 644 ~/.claudette/cache/*.db

# Rebuild cache
claudette cache rebuild

# Use alternative cache location
export CLAUDETTE_CACHE_DIR="/tmp/claudette-cache"
```

### Network Connection Issues

**Problem**: API requests failing or timing out

**Symptoms**:
- "Connection timeout" errors
- "SSL certificate verification failed"
- Intermittent failures

**Diagnosis**:
```bash
# Test network connectivity
ping api.openai.com
ping api.mistral.ai

# Check SSL certificates
curl -I https://api.openai.com/v1/models

# Test with verbose output
claudette --verbose "test connection"
```

**Solutions**:
```bash
# Configure proxy (if behind corporate firewall)
export HTTPS_PROXY=http://proxy.company.com:8080
export HTTP_PROXY=http://proxy.company.com:8080

# Skip SSL verification (not recommended for production)
export PYTHONHTTPSVERIFY=0

# Use alternative DNS
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf

# Increase timeout
claudette --timeout 60 "slow request"
```

### Memory Issues

**Problem**: High memory usage or out-of-memory errors

**Symptoms**:
- System becomes slow when using claudette
- "MemoryError" exceptions
- Process killed by system

**Diagnosis**:
```bash
# Monitor memory usage
top -p $(pgrep -f claudette)

# Check large cache files
du -sh ~/.claudette/cache/*

# Profile memory usage
python -m memory_profiler claudette/main.py
```

**Solutions**:
```bash
# Limit cache size
claudette config set cache.max_size 100MB

# Clear old cache entries
claudette cache clean --older-than 7d

# Use preprocessing to reduce context size
claudette --preprocess "large context processing"

# Process files in batches
for file in *.py; do
    claudette "analyze" "$file"
done
```

## Performance Issues

### Slow Response Times

**Problem**: Commands taking too long to execute

**Diagnosis**:
```bash
# Enable timing information
time claudette "test command"

# Check cache hit rate
claudette cache stats

# Profile execution
claudette --profile "slow command"
```

**Solutions**:
```bash
# Enable caching if disabled
claudette config set cache.enabled true

# Use faster backend for simple tasks
claudette --backend openai "simple task"

# Enable preprocessing
claudette config set preprocessing.enabled true

# Clear old cache
claudette cache clean --older-than 1d
```

### High API Costs

**Problem**: Unexpectedly high API usage costs

**Diagnosis**:
```bash
# Check usage statistics
claudette stats --period month

# Analyze cost by backend
claudette stats --breakdown --backend all

# Review expensive operations
claudette stats --sort-by cost --limit 10
```

**Solutions**:
```bash
# Use cost-effective backends
claudette config set default_backend openai

# Enable caching to avoid repeat requests
claudette config set cache.enabled true

# Use preprocessing to reduce token usage
claudette config set preprocessing.enabled true

# Set cost alerts
claudette config set alerts.daily_limit 10.00
```

## Debug Mode

### Enable Debug Logging

```bash
# Environment variable
export CLAUDETTE_DEBUG=1

# Command line flag
claudette --debug "debug this issue"

# Check log files
tail -f ~/.claudette/logs/claudette.log
```

### Verbose Output

```bash
# Show detailed execution steps
claudette --verbose "command"

# Show configuration being used
claudette --verbose --show-config "command"

# Show API requests/responses (be careful with sensitive data)
claudette --debug --show-requests "command"
```

## Getting Additional Help

### Collecting Debug Information

When reporting issues, include:

```bash
# System information
claudette --version
python --version
uname -a

# Configuration
claudette config show

# Recent logs
tail -50 ~/.claudette/logs/claudette.log

# Cache statistics
claudette cache stats

# Backend availability
claudette backends list --verbose
```

### Community Support

1. **GitHub Issues**: https://github.com/username/claudette/issues
2. **GitHub Discussions**: https://github.com/username/claudette/discussions
3. **Documentation**: https://claudette.readthedocs.io

### Creating Bug Reports

Include:
- **Steps to reproduce**: Exact commands run
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Python version, claudette version
- **Configuration**: Relevant config settings (remove API keys!)
- **Logs**: Error messages and debug output

### Feature Requests

For feature requests:
- **Use case**: Describe the problem you're trying to solve
- **Proposed solution**: How you envision the feature working
- **Alternatives**: Other solutions you've considered
- **Impact**: How this would benefit other users

## Common Error Messages

### "Backend 'X' not available"
- **Cause**: Backend not installed or configured
- **Solution**: Install backend dependencies, configure API keys

### "Cache database is locked"
- **Cause**: Multiple claudette processes or corrupted cache
- **Solution**: Kill other processes, clear cache

### "Invalid API key format"
- **Cause**: Malformed or missing API key
- **Solution**: Check API key format, ensure proper environment variable

### "Rate limit exceeded"
- **Cause**: Too many API requests in short time
- **Solution**: Wait before retrying, implement backoff strategy

### "Context too large"
- **Cause**: Input exceeds backend token limits
- **Solution**: Enable preprocessing, split into smaller chunks