# Usage Guide

Learn how to use Claudette effectively for AI-powered development workflows.

## Basic Commands

### File Editing

Edit files with AI assistance:

```bash
# Basic file editing
claudette edit myfile.py --explain "add error handling"

# Specific backend selection
claudette edit myfile.py --backend openai --explain "optimize performance"

# Complex instructions
claudette edit app.py --explain "refactor this code to use async/await patterns"
```

### Commit Creation

Generate intelligent commits:

```bash
# Auto-generate commit message
claudette commit

# Custom commit instruction
claudette commit --message "implement user authentication system"

# Review changes before committing
git diff  # Review first
claudette commit --message "add input validation"
```

### Project Creation

Start new projects with AI assistance:

```bash
# Create new project structure
claudette new --project "REST API server"

# Generate with specific framework
claudette new --project "FastAPI application with database"
```

## Backend Management

### Available Backends

List all available backends:

```bash
claudette --backend list
```

### Backend Selection

```bash
# Automatic backend selection (default)
claudette edit app.py --explain "add logging"

# Explicit backend selection
claudette edit app.py --backend claude --explain "add logging"
claudette edit app.py --backend openai --explain "add logging"
claudette edit app.py --backend mistral --explain "add logging"
claudette edit app.py --backend ollama --explain "add logging"
```

### Fallback Routing

Enable automatic fallback when primary backend is unavailable:

```yaml
# In ~/.claudette/config.yaml
fallback_enabled: true
default_backend: claude
```

```bash
# Automatic fallback in action
claudette edit app.py --explain "optimize"
# Output: "Claude quota low, routed to OpenAI backend"
```

## Session History & Caching

### Session History

View and search your command history:

```bash
# Show recent history
claudette history

# Show last N entries
claudette history --last 5

# Search history
claudette history --grep "optimize"

# Detailed view
claudette history --detailed

# Clear history
claudette history --clear
```

### Cache Management

Claudette automatically caches operations to avoid reprocessing:

```bash
# First run: processes and caches
claudette edit app.py --explain "add comments"

# Second run: cache hit, instant response
claudette edit app.py --explain "add comments"  # ⚡ Cached

# Bypass cache when needed
claudette --no-cache edit app.py --explain "add comments"
```

### Cache Statistics

```bash
# View cache statistics
claudette history --stats
```

## Cost Analytics

### Cost Statistics

Monitor your AI usage costs:

```bash
# Overall cost summary
claudette stats

# Filter by time period
claudette stats --period today
claudette stats --period week
claudette stats --period month
claudette stats --period 7d    # Last 7 days

# Filter by backend
claudette stats --backend claude
claudette stats --backend openai

# File-specific analysis
claudette stats --file "*.py"
claudette stats --files 10     # Top 10 files by usage

# Comprehensive analysis
claudette stats --backend claude --period week --files 5
```

### Interactive Dashboards

#### Terminal Dashboard

Rich terminal interface with real-time monitoring:

```bash
# Basic dashboard
claudette dashboard terminal

# Show cost trends
claudette dashboard terminal --trends --days 14

# Show file usage
claudette dashboard terminal --files --limit 20

# Live monitoring (auto-refresh every 30 seconds)
claudette dashboard terminal --live --refresh 30
```

#### Web Dashboard

Browser-based interactive charts:

```bash
# Start web dashboard
claudette dashboard web

# Custom host and port
claudette dashboard web --host 0.0.0.0 --port 3000

# Debug mode for development
claudette dashboard web --debug
```

Access at: http://localhost:8080

## Configuration

### Configuration File

Edit `~/.claudette/config.yaml`:

```yaml
# Core settings
claude_cmd: claude
openai_key: your_openai_api_key
openai_model: gpt-3.5-turbo

# Backend configuration
default_backend: claude
fallback_enabled: true

# Caching
history_enabled: true
cache_dir: ~/.claudette/cache

# Dashboard settings
dashboard:
  default_period: "week"
  max_file_display: 20
  refresh_interval: 30
```

### Environment Variables

```bash
# API keys
export OPENAI_API_KEY="your_openai_api_key"
export CLAUDE_API_KEY="your_claude_api_key"

# Paths
export CLAUDE_CMD="/usr/local/bin/claude"
export CLAUDETTE_CACHE_DIR="~/.claudette/cache"

# Behavior
export CLAUDETTE_DEFAULT_BACKEND="claude"
export CLAUDETTE_FALLBACK_ENABLED="true"
```

## Advanced Usage

### Batch Operations

Process multiple files efficiently:

```bash
# Edit multiple files with same instruction
for file in src/*.py; do
    claudette edit "$file" --explain "add type hints"
done

# Or use xargs for parallel processing
find src -name "*.py" | xargs -I {} claudette edit {} --explain "add docstrings"
```

### Pipeline Integration

Integrate with CI/CD pipelines:

```bash
# Generate commit for automated changes
claudette commit --message "automated code formatting"

# Cost monitoring in CI
COST=$(claudette stats --period today | grep "Estimated cost" | awk '{print $3}')
if (( $(echo "$COST > 0.10" | bc -l) )); then
    echo "Daily cost limit exceeded: $COST"
    exit 1
fi
```

### Custom Scripts

Create custom automation scripts:

```python
#!/usr/bin/env python3
"""Custom Claudette automation script"""

import subprocess
import sys

def optimize_python_files():
    """Optimize all Python files in project"""
    
    # Find Python files
    result = subprocess.run(
        ["find", ".", "-name", "*.py", "-type", "f"],
        capture_output=True, text=True
    )
    
    files = result.stdout.strip().split('\n')
    
    for file in files:
        if file:
            print(f"Optimizing {file}...")
            subprocess.run([
                "claudette", "edit", file, 
                "--explain", "optimize for performance and readability"
            ])

if __name__ == "__main__":
    optimize_python_files()
```

## Best Practices

### Cost Optimization

1. **Use appropriate backends**:
   - Ollama for development/testing (free)
   - OpenAI for simple tasks (cost-effective)
   - Claude for complex reasoning (higher quality)

2. **Enable caching**:
   ```bash
   # Ensure caching is enabled
   grep "history_enabled: true" ~/.claudette/config.yaml
   ```

3. **Monitor usage**:
   ```bash
   # Check daily costs
   claudette stats --period today
   
   # Identify expensive operations
   claudette stats --files 10
   ```

### Workflow Integration

1. **Pre-commit integration**:
   ```bash
   # Add claudette to pre-commit hooks
   claudette edit .pre-commit-config.yaml --explain "add code quality checks"
   ```

2. **IDE integration**:
   ```bash
   # Create IDE shortcuts for common operations
   alias ce="claudette edit"
   alias cc="claudette commit"
   alias cs="claudette stats"
   ```

3. **Documentation maintenance**:
   ```bash
   # Keep docs updated
   claudette edit README.md --explain "update with latest features"
   ```

## Troubleshooting

### Common Issues

**"Backend not available" errors**:
```bash
# Check backend status
claudette --backend list

# Verify API keys
echo $OPENAI_API_KEY | wc -c  # Should be > 1
```

**Cache issues**:
```bash
# Clear cache if corrupted
rm -rf ~/.claudette/cache

# Rebuild cache
claudette edit test.py --explain "test" --no-cache
```

**Performance issues**:
```bash
# Check cache hit rate
claudette stats --info

# Monitor database size
ls -lah ~/.claudette/cache/
```

### Debug Mode

Enable verbose output for troubleshooting:

```bash
# Debug environment
export CLAUDETTE_DEBUG=1

# Run with debugging
claudette edit app.py --explain "debug issue"
```

## Next Steps

- [Cost Dashboard Guide](guides/cost_dashboard.md) - Advanced cost analysis
- [API Reference](api/index.md) - Complete API documentation  
- [Contributing](how_to_contribute.md) - Development and contribution guide
- [Architecture](development/architecture.md) - Technical implementation details