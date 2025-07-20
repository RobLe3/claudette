# Scripts Directory

This directory contains all custom scripts developed for the Claude Flow project.

## Directory Structure

### 📊 `/cost-tracking/`
- **claude-cost-tracker.py** - Main cost tracking system with SQLite database
- Tracks token usage, costs, and provides historical analysis
- Integrates with Claude Code hooks for automatic tracking

### 🚀 `/startup-tools/`
- **start-claude-flow.zsh** - Interactive startup script for Claude Flow
- Provides menu-driven interface for common operations
- Includes error handling and prerequisite checks

### 🔧 `/third-party/`
- **claude-flow** - Unix/Linux executable script
- **claude-flow.bat** - Windows batch script
- **claude-flow.ps1** - PowerShell script
- Platform-specific wrapper scripts from Claude Flow package

## Usage

All scripts are executable and can be run from their respective directories:

```bash
# Cost tracking
python3 scripts/cost-tracking/claude-cost-tracker.py --action summary

# Startup tools
./scripts/startup-tools/start-claude-flow.zsh

# Third-party tools
./scripts/third-party/claude-flow --help
```

## Integration

These scripts are integrated with Claude Flow via:
- Hooks in `.claude/settings.json`
- Configuration in `claude-flow.config.json`
- Automatic path resolution in dashboard tools