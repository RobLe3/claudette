# Migration Guide: claude-flow to claudette-ai-tools

**Complete guide for migrating from the mixed claude-flow repository to the dedicated claudette-ai-tools package**

## 🚀 Overview

This guide helps you migrate from the previous mixed claude-flow repository (which contained both JavaScript and Python components) to the new dedicated `claudette-ai-tools` Python package.

### What Changed

**Before (Mixed Repository):**
- JavaScript claude-flow + Python claudette in one repository
- Complex dependency management
- Mixed documentation and configuration

**After (Separated Repositories):**
- **JavaScript**: `claude-flow` (focused on MCP tools and swarm coordination)
- **Python**: `claudette-ai-tools` (dedicated AI CLI tools)
- Independent development and releases
- Cleaner documentation and setup

## 📋 Migration Checklist

### ✅ Pre-Migration Steps

1. **Backup Current Configuration**
   ```bash
   # Backup your existing config
   cp ~/.claudette/config.json ~/.claudette/config.json.backup
   cp ~/.claude/settings.json ~/.claude/settings.json.backup
   ```

2. **Export Current Settings**
   ```bash
   # Note your current API keys and settings
   claudette config show > migration_settings.txt
   ```

3. **List Current Usage**
   ```bash
   # Review your current installation
   pip list | grep -E "(claude|claudette)"
   npm list -g | grep claude
   ```

### ✅ Installation Steps

1. **Uninstall Old Mixed Package** (if applicable)
   ```bash
   # If you had a local mixed installation
   pip uninstall claude-flow-python
   pip uninstall claudette  # old package name
   ```

2. **Install New Dedicated Package**
   ```bash
   # Install the new dedicated package
   pip install claudette-ai-tools
   ```

3. **Verify Installation**
   ```bash
   # Test the new installation
   claudette --version
   claudette config show
   ```

### ✅ Configuration Migration

1. **Restore Configuration**
   ```bash
   # The new package should automatically detect your existing config
   # But you can manually restore if needed:
   claudette config import ~/.claudette/config.json.backup
   ```

2. **Update API Keys** (if needed)
   ```bash
   claudette config set openai_api_key "your-key"
   claudette config set anthropic_api_key "your-key"
   ```

3. **Verify Configuration**
   ```bash
   claudette config validate
   ```

## 🔄 Code Migration

### Import Statement Changes

**Old (Mixed Repository):**
```python
# Old import paths (no longer valid)
from claude_flow.python.claudette import main
from claude_flow.claudette.core import backends
from claude_flow import claudette_cli
```

**New (Dedicated Package):**
```python
# New import paths
from claudette import main
from claudette.core import backends
from claudette import cli_commands
```

### Command Line Changes

**Commands Remain the Same:**
```bash
# These commands work exactly the same
claudette "your prompt here"
claudette --backend openai "your prompt"
claudette config show
claudette performance status
```

**New Features Available:**
```bash
# New migration utilities
claudette migrate check-compatibility
claudette migrate import-settings

# Enhanced plugin system
claudette plugins list
claudette plugins status
```

### Script Migration Examples

**Before:**
```python
#!/usr/bin/env python3
# old_script.py
import sys
sys.path.append('/path/to/claude-flow/python')
from claudette.main import run_claudette

def main():
    run_claudette(["your", "args"])
```

**After:**
```python
#!/usr/bin/env python3
# new_script.py
from claudette import main

def main():
    main.run_claudette(["your", "args"])
```

## 🔧 Configuration Updates

### Configuration File Location
- **Old**: Mixed locations depending on setup
- **New**: Standardized at `~/.claudette/config.json`

### Configuration Schema Updates

**New Configuration Options:**
```json
{
  "version": "2.0",
  "migration": {
    "from_claude_flow": true,
    "migration_date": "2025-01-26"
  },
  "backends": {
    "openai": {
      "api_key": "your-key",
      "default_model": "gpt-3.5-turbo"
    },
    "anthropic": {
      "api_key": "your-key", 
      "default_model": "claude-3-sonnet"
    }
  },
  "features": {
    "cost_optimization": true,
    "session_memory": true,
    "plugin_system": true
  }
}
```

## 🔌 Plugin Migration

### Old Plugin System
- Limited plugin support
- Manual configuration required

### New Plugin System
```bash
# Automatic plugin detection
claudette plugins scan

# Enable/disable plugins easily
claudette plugins enable mistral
claudette plugins enable ollama

# Plugin status and management
claudette plugins status
claudette plugins update
```

## 📊 Feature Mapping

| Old Feature | New Feature | Status | Notes |
|-------------|-------------|--------|-------|
| Basic CLI | `claudette` command | ✅ Same | No changes needed |
| Backend selection | `--backend` flag | ✅ Same | Enhanced with more options |
| Configuration | `claudette config` | ✅ Improved | Better validation and management |
| Cost tracking | Built-in | ✅ Enhanced | More detailed analytics |
| Caching | Basic | ✅ Advanced | Intelligent cache management |
| Plugins | Limited | ✅ Full system | Hot-pluggable architecture |
| Performance monitoring | Basic | ✅ Comprehensive | Real-time metrics |

## 🧪 Testing Your Migration

### Basic Functionality Test
```bash
# Test basic operation
claudette "Hello, test the migration"

# Test backend switching
claudette "Test OpenAI" --backend openai
claudette "Test Anthropic" --backend anthropic

# Test configuration
claudette config show
claudette config validate
```

### Advanced Features Test
```bash
# Test cost tracking
claudette "Test cost tracking" --track-costs

# Test caching
claudette "Test caching" --cache

# Test performance monitoring
claudette performance status

# Test plugin system
claudette plugins list
```

### Compatibility Test Script
```bash
# Run the migration compatibility checker
claudette migrate verify-compatibility

# Check for any migration issues
claudette migrate check-issues

# Generate migration report
claudette migrate report
```

## 🐛 Troubleshooting

### Common Issues

**Issue: "Command not found: claudette"**
```bash
# Solution: Ensure proper installation
pip install --upgrade claudette-ai-tools
hash -r  # Refresh command cache
```

**Issue: "Configuration not found"**
```bash
# Solution: Initialize new configuration
claudette config init
claudette config import ~/.claudette/config.json.backup
```

**Issue: "API keys not working"**
```bash
# Solution: Re-verify API keys
claudette config set openai_api_key "your-key"
claudette config validate
claudette config test-connection
```

**Issue: "Plugin not found"**
```bash
# Solution: Update plugin system
claudette plugins update
claudette plugins scan
```

### Migration Validation

**Check Migration Status:**
```bash
# Comprehensive migration check
claudette migrate status

# Detailed migration report
claudette migrate report --detailed

# Export migration summary
claudette migrate export-report migration_summary.json
```

### Performance Comparison

**Before and After Performance:**
```bash
# Test performance improvements
claudette performance benchmark

# Compare with old system (if you have metrics)
claudette performance compare --baseline old_metrics.json
```

## 📈 New Features Available

### Enhanced Cost Optimization
```bash
# Advanced cost tracking
claudette costs analyze --timeframe 30d
claudette costs budget set --daily 5.00
claudette costs optimize --auto
```

### Improved Performance
```bash
# Performance monitoring
claudette performance monitor --real-time
claudette performance optimize --auto
```

### Advanced Plugin System
```bash
# Plugin marketplace
claudette plugins marketplace
claudette plugins install advanced-backends
```

## 🚀 Post-Migration Benefits

### Development Benefits
- **Faster Installation**: Dedicated package with minimal dependencies
- **Better Documentation**: Focused Python documentation
- **Enhanced Features**: New cost optimization and performance tools
- **Independent Updates**: Python tools update independently from JavaScript

### User Benefits
- **Cleaner Commands**: Streamlined CLI interface
- **Better Performance**: Optimized for Python-specific use cases
- **Enhanced Plugins**: Robust plugin architecture
- **Improved Monitoring**: Real-time performance and cost tracking

### Maintenance Benefits
- **Separate Releases**: Python and JavaScript updates independent
- **Focused Issues**: Bug reports and features specific to your use case
- **Better Testing**: Dedicated test suite for Python components
- **Clear Roadmap**: Python-focused development roadmap

## 📞 Support

### Migration Support
- **Documentation Issues**: [GitHub Issues](https://github.com/ruvnet/claudette-ai-tools/issues)
- **Migration Questions**: [GitHub Discussions](https://github.com/ruvnet/claudette-ai-tools/discussions)
- **Feature Requests**: Tag with `migration` label

### Community Support
- **Discord**: Join our migration support channel
- **Forums**: Community-driven migration help
- **Examples**: Check `examples/migration/` directory

## 📅 Migration Timeline

### Recommended Timeline

**Week 1: Preparation**
- Backup current setup
- Review this migration guide
- Test new package in isolated environment

**Week 2: Migration**
- Install new package
- Migrate configuration
- Update scripts and automation

**Week 3: Validation**
- Test all functionality
- Performance comparison
- Resolve any issues

**Week 4: Deployment**
- Deploy to production
- Monitor performance
- Document any customizations

### Support Timeline

- **Q1 2025**: Full migration support and documentation
- **Q2 2025**: Migration tools and automation
- **Q3 2025**: Advanced migration features
- **Q4 2025**: Legacy compatibility sunset

## ✅ Migration Complete

Once you've successfully migrated:

1. **Remove old backups** (after testing)
2. **Update documentation** for your team
3. **Share feedback** to help improve the migration process
4. **Explore new features** available in the dedicated package

Welcome to the enhanced claudette-ai-tools experience! 🎉

---

**Need help?** Open an issue with the `migration` label and we'll assist you promptly.