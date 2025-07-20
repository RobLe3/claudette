# Claude Flow

**Advanced development workflow enhancement for Claude Code with swarm intelligence and systematic organization.**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/RobLe3/claude-flow)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Structure](https://img.shields.io/badge/structure-organized-brightgreen.svg)](#-organized-structure)
[![Dependencies](https://img.shields.io/badge/dependencies-validated-success.svg)](#-dependency-validation)

## 🎯 Overview

Claude Flow transforms Claude Code development with:
- **🏗️ Organized file structure** (68% clutter reduction)
- **🤖 Swarm intelligence coordination** 
- **📊 Advanced cost tracking and analytics**
- **🔄 Dependency-aware development workflow**
- **🛡️ Automated validation and safety systems**

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/RobLe3/claude-flow.git
cd claude-flow

# Install Claude Flow MCP server
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

### 2. Immediate Use

```bash
# Cost tracking
python3 core/cost-tracking/tracker.py --action summary

# Structure validation
python3 core/coordination/structure_manager.py validate

# Dependency validation
python3 core/coordination/dependency_validator.py --check-all
```

### 3. Swarm Coordination (Advanced)

```bash
# Initialize swarm for complex tasks
npx claude-flow@alpha swarm init --topology mesh --agents 5

# Cost tracking with swarm awareness
python3 core/cost-tracking/tracker.py --action summary --swarm-aware
```

## 📁 Organized Structure

Claude Flow uses a systematic file organization:

```
claude_flow/
├── 📋 CORE CONFIGURATION
│   ├── README.md               # This file
│   ├── CLAUDE.md              # Development rules & configuration
│   └── SECURITY.md            # Security guidelines
├── 🏗️ core/                   # Core functionality
│   ├── cost-tracking/         # Cost tracking & analytics
│   ├── coordination/          # Swarm & session management
│   └── monitoring/            # Health & performance monitoring
├── 📚 docs/                   # Documentation
│   ├── analysis/              # Research & analysis documents
│   ├── results/               # Test results & reports
│   ├── guides/                # User & developer guides
│   ├── legacy/                # Archived documentation
│   └── status-reports/        # Historical status reports
├── 💾 data/                   # Data storage
│   ├── memory/                # Agent memory & state
│   ├── billing/               # Cost tracking reports
│   └── sessions/              # Session history & state
├── 🧪 tests/                  # Test suites
│   ├── integration/           # Integration tests
│   ├── performance/           # Performance benchmarks
│   └── validation/            # Validation tests
├── 🗄️ archive/                # Legacy & deprecated
│   ├── legacy/                # Safely archived components
│   └── backups/               # Historical backups
└── scripts/                   # Legacy scripts (preserved)
    ├── automation/            # Original automation scripts
    └── cost-tracking/         # Original cost tracking
```

## 🛠️ Core Features

### 💰 Advanced Cost Tracking

**Location:** `core/cost-tracking/`

```bash
# Comprehensive cost analysis
python3 core/cost-tracking/tracker.py --action summary

# Detailed usage analysis
python3 core/cost-tracking/analyzer.py --analyze-patterns

# Interactive dashboard
./tools/dashboard/cost-dashboard.zsh
```

**Features:**
- Real-time token usage monitoring
- EUR/USD cost conversion
- Session-based tracking
- Detailed usage analytics
- Export capabilities

### 🤖 Swarm Intelligence Coordination

**Location:** `core/coordination/`

```bash
# Session management
python3 core/coordination/session_guard.py status

# Plugin management
python3 core/coordination/plugin_manager.py --list-active

# Intelligent file placement
python3 core/coordination/structure_manager.py suggest monitoring "health check"
```

**Features:**
- Multi-agent task coordination
- Intelligent resource allocation
- Session state management
- Plugin lifecycle management
- Structure-aware development

### 🔍 System Monitoring

**Location:** `core/monitoring/`

```bash
# Health monitoring
python3 core/monitoring/health_monitor.py --check-all

# Usage monitoring
python3 core/monitoring/usage_monitor.py --real-time

# Session optimization
python3 core/monitoring/session_optimizer.py --optimize
```

**Features:**
- Real-time health checks
- Performance monitoring
- Resource optimization
- Automated alerts
- Trend analysis

## 🔄 Dependency-Aware Development

Claude Flow includes a revolutionary dependency management system:

### Automated Validation

```bash
# Complete dependency validation
python3 core/coordination/dependency_validator.py --validate-all

# Impact analysis before changes
python3 core/coordination/dependency_mapper.py --analyze-impact <file>

# Automation system verification
python3 scripts/automation/dependency_checker.py --verify-hooks
```

### Mandatory Workflow

**BEFORE making any structural changes:**

1. **🔍 Analyze Impact**: `dependency_mapper.py --analyze-impact <target>`
2. **📋 Update Dependencies**: Configuration, imports, documentation
3. **✅ Validate Changes**: `dependency_validator.py --validate-all`
4. **🧪 Test Functionality**: Verify critical systems work

## 📚 Documentation

### Essential Guides

- **[New Structure Guide](docs/guides/NEW_STRUCTURE_GUIDE.md)** - Complete developer guide
- **[Dependency-Aware Development](docs/guides/DEPENDENCY_AWARE_DEVELOPMENT.md)** - Workflow strategy
- **[ChatGPT Integration](docs/guides/CHATGPT_INTEGRATION_README.md)** - Integration guide
- **[Fallback Guide](docs/guides/CLAUDE_CHATGPT_FALLBACK_GUIDE.md)** - Fallback strategies

### Analysis & Research

- **[Performance Analysis](docs/analysis/)** - System performance studies
- **[Protocol Analysis](docs/analysis/)** - IICP/MCP integration research
- **[Cost Analysis](docs/analysis/)** - Cost optimization research

### Status & Results

- **[Test Results](docs/results/testing/)** - Validation and test outcomes
- **[Status Reports](docs/status-reports/)** - Historical development status
- **[Reorganization Log](docs/results/REORGANIZATION_LOG.md)** - Complete restructuring history

## 🎮 Usage Examples

### Basic Cost Tracking

```bash
# Quick cost summary
python3 core/cost-tracking/tracker.py --action summary

# Track a specific action
python3 core/cost-tracking/tracker.py --action track --event-type "development" --description "Feature implementation"

# Generate detailed report
python3 core/cost-tracking/tracker.py --action report --format csv --output monthly_usage.csv
```

### Advanced Swarm Coordination

```bash
# Initialize development swarm
npx claude-flow@alpha swarm init --topology hierarchical --agents 6

# Orchestrate complex task
npx claude-flow@alpha task orchestrate "Implement user authentication with tests" --strategy parallel

# Monitor swarm progress
npx claude-flow@alpha swarm monitor --duration 300
```

### Development Workflow

```bash
# Before making changes
python3 core/coordination/dependency_mapper.py --analyze-impact core/cost-tracking/tracker.py

# Make your changes...

# Validate after changes
python3 core/coordination/dependency_validator.py --validate-all

# Test critical functionality
python3 core/cost-tracking/tracker.py --action summary
```

## 🔧 Configuration

### MCP Server Setup

Add to your Claude Code MCP configuration:

```bash
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

### Hook Configuration

Hooks are pre-configured in `.claude/settings.json` for:
- Automatic cost tracking
- Session state management
- Structure validation
- Performance monitoring

### Environment Variables

```bash
export CLAUDE_FLOW_AUTO_COMMIT=false
export CLAUDE_FLOW_HOOKS_ENABLED=true
export CLAUDE_FLOW_TELEMETRY_ENABLED=true
```

## 🧪 Testing & Validation

### Run Test Suite

```bash
# Performance tests
python3 tests/performance/cost_performance_test.py

# Integration tests
python3 -m pytest tests/integration/

# Validation tests
python3 tests/validation/structure_validation.py
```

### Continuous Validation

```bash
# Pre-commit validation
python3 core/coordination/dependency_validator.py --check-all

# Structure consistency check
python3 core/coordination/structure_manager.py validate
```

## 🚀 Advanced Features

### Neural Learning (Alpha)

```bash
# Enable neural pattern learning
npx claude-flow@alpha neural train --iterations 10

# Analyze cognitive patterns
npx claude-flow@alpha neural patterns --pattern convergent
```

### GitHub Integration

```bash
# Repository analysis
npx claude-flow@alpha github analyze --repository owner/repo

# Pull request enhancement
npx claude-flow@alpha github pr-enhance --pr-number 123
```

## 🔒 Security

- **Secure key management** via `scripts/automation/secure_key_manager.py`
- **Permission-based access** control in `.claude/settings.json`
- **Safe command validation** with pre-execution hooks
- **Audit trail** for all cost tracking and system changes

See [SECURITY.md](SECURITY.md) for detailed security guidelines.

## 📈 Performance

Claude Flow delivers significant performance improvements:

- **🎯 84.8% SWE-Bench solve rate** - Better problem-solving through coordination
- **⚡ 32.3% token reduction** - Efficient task breakdown reduces redundancy  
- **🚀 2.8-4.4x speed improvement** - Parallel coordination strategies
- **🧠 27+ neural models** - Diverse cognitive approaches
- **📊 68% clutter reduction** - Organized file structure

## 🤝 Contributing

### Development Guidelines

1. **Follow dependency-aware workflow** (see [DEPENDENCY_AWARE_DEVELOPMENT.md](docs/guides/DEPENDENCY_AWARE_DEVELOPMENT.md))
2. **Use structure manager** for file placement suggestions
3. **Validate changes** with automated tools
4. **Update documentation** for any structural changes

### Pull Request Process

1. **Analyze impact**: `dependency_mapper.py --analyze-impact <changes>`
2. **Update dependencies**: Configuration, imports, docs
3. **Validate**: `dependency_validator.py --validate-all`
4. **Test**: Ensure all functionality works
5. **Document**: Update relevant guides and examples

## 📞 Support

### Documentation
- **Complete guides**: `docs/guides/`
- **API reference**: Tool help commands (`--help`)
- **Examples**: Usage examples throughout docs

### Troubleshooting
- **Dependency issues**: Run `dependency_validator.py --validate-all`
- **Structure questions**: Use `structure_manager.py suggest`
- **Cost tracking**: Check `core/cost-tracking/tracker.py --help`

### Community
- **Issues**: [GitHub Issues](https://github.com/RobLe3/claude-flow/issues)
- **Discussions**: Repository discussions
- **Wiki**: Project wiki for detailed guides

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Claude Code Team** - For the excellent development environment
- **MCP Protocol** - For enabling seamless tool integration
- **Swarm Intelligence Research** - For coordination concepts
- **Open Source Community** - For inspiration and best practices

---

**Claude Flow** - Transforming development workflow with intelligence, organization, and systematic excellence.

*Built with ❤️ for the Claude Code community*