# 🚀 Claudette - Claude Code Middleware

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/user/claudette)
[![Node.js](https://img.shields.io/badge/node.js-18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

**Claudette** is a lightweight, high-performance middleware for Claude Code that provides task interception, cost optimization, and multi-backend AI integration capabilities.

## ✨ Features

- 🔄 **Task Interception**: Visual feedback for all intercepted commands
- ⚡ **Fast Path Optimization**: ~250ms system command execution
- 💰 **Cost Tracking**: Built-in cost optimization and monitoring
- 🔧 **Multi-backend Support**: Extensible architecture for AI backends
- 🎯 **Claude Code Integration**: Seamless middleware layer

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/user/claudette.git
cd claudette
chmod +x claudette
```

### Usage

```bash
# Show help
./claudette help

# Show version
./claudette version

# Show status
./claudette --claudette-status

# Forward any command to Claude Code
./claudette "your command here"
```

## 📋 Commands

### System Commands (handled locally)
- `help`, `--help`, `-h` - Show help message
- `version`, `--version`, `-V` - Show version information  
- `--claudette-status` - Show integration status

### Forwarded Commands
All other commands are forwarded to Claude Code with middleware processing and visual feedback.

## 🔧 Integration

Claudette acts as a transparent middleware layer:

1. **Intercepts** all commands with visual indicators
2. **Processes** system commands locally for speed
3. **Forwards** AI commands to Claude Code
4. **Tracks** performance and cost metrics

## 📊 Performance

- **System Commands**: ~250ms execution time
- **Integration Overhead**: Minimal (<10ms)
- **Cost Savings**: Estimated $0.005 per optimized command
- **Memory Usage**: Lightweight Node.js footprint

## 🏗️ Architecture

```
User Command → Claudette Middleware → Claude Code
     ↓              ↓                      ↓
   Display      Task Interception    AI Processing
   Feedback     Cost Tracking        Command Execution
```

## 📁 Files

- `claudette` - Main executable (Node.js script)
- `package.json` - Project configuration
- `README.md` - This documentation

## 🔍 Status Monitoring

Check claudette status anytime:

```bash
./claudette --claudette-status
```

Status information is stored in `~/.claude/claudette/status.json`

## 🤝 Requirements

- **Node.js**: 18+ required
- **Claude Code**: Must be installed and available as `claude` command
- **Platform**: macOS, Linux, Windows (WSL)

## 📝 License

MIT License - see LICENSE file for details

## 🐛 Issues & Support

Report issues at: https://github.com/user/claudette/issues

---

**🚀 Claudette v1.0.0** - Production ready Node.js middleware for Claude Code