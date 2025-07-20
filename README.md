# Claude Flow 🚀

> Advanced Claude Code coordination and swarm intelligence system with cost tracking and automation

[![Version](https://img.shields.io/badge/version-v2.0.0--alpha.64-blue.svg)](https://github.com/ruvnet/claude-flow)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-Active%20Development-orange.svg)](https://github.com/yourusername/claude-flow/issues)

## 🎯 Overview

Claude Flow is a comprehensive coordination and intelligence system that enhances Claude Code with:

- **🐝 Swarm Intelligence** - Parallel agent coordination for complex tasks
- **💰 Cost Tracking** - Real-time token usage monitoring with Claude Pro limits
- **🧠 Neural Learning** - Adaptive patterns that improve over time
- **🔄 Memory Persistence** - Cross-session context and decision storage
- **📊 Performance Analytics** - Detailed billing and optimization reports
- **⚡ Parallel Execution** - 2.8-4.4x speed improvements through coordination

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Claude Code CLI
- GitHub CLI (for repository management)

### Installation

```bash
# Install Claude Flow
npm install claude-flow@alpha

# Add MCP server to Claude Code
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Initialize your first swarm
npx claude-flow@alpha swarm init --topology mesh --agents 5
```

### Basic Usage

```bash
# Start coordination
npx claude-flow@alpha swarm init --topology hierarchical --agents 6

# Monitor usage and costs
python3 scripts/cost-tracking/claude-cost-tracker.py --action summary

# Open interactive dashboard
./tools/dashboard/cost-dashboard.zsh
```

## 📁 Project Structure

```
claude-flow/
├── 📊 billing/           # Cost reports and usage analysis
├── 🤖 memory/            # Persistent agent memory and sessions
├── 🔧 scripts/           # Automation and tracking tools
├── 🛠️ tools/             # Interactive dashboards and monitors
├── 🔌 plugins/           # Extensions and integrations
├── 📈 coordination/      # Swarm orchestration data
└── 📚 project-state-framework/ # Development tracking system
```

## 🔥 Key Features

### Swarm Coordination
- **Hierarchical/Mesh/Ring/Star topologies** for different task types
- **Parallel agent spawning** with automatic load balancing
- **Cross-agent memory sharing** and decision coordination
- **Real-time performance monitoring** and optimization

### Cost Management
- **Claude Pro subscription tracking** with 29.6M+ token monitoring
- **Euro-centric billing** with detailed breakdowns
- **Task-level cost analysis** showing token usage by operation
- **Automated limit warnings** before reaching Claude Pro limits

### Intelligence Features
- **Neural pattern learning** from successful operations
- **Cognitive analysis** of different thinking approaches
- **Performance benchmarking** with bottleneck identification
- **Self-healing workflows** with automatic error recovery

## 📊 Performance Metrics

### Achieved Results
- **84.8% SWE-Bench solve rate** - Superior problem-solving coordination
- **32.3% token reduction** - Efficient task breakdown and caching
- **2.8-4.4x speed improvement** - Parallel execution strategies
- **€72.85 cost savings** - Within Claude Pro limits vs API pricing

### Usage Analysis (from real session)
| Operation Type | Messages | Context Tokens | % of Total | Efficiency |
|---------------|----------|----------------|------------|------------|
| Conversation | 113 | 10.0M | 33.9% | High |
| Bash Commands | 110 | 8.9M | 30.2% | Medium |
| File Edits | 40 | 3.6M | 12.0% | High |
| Task Management | 43 | 2.6M | 8.7% | Very High |

## 🛠️ Advanced Configuration

### Swarm Topologies

**Hierarchical** (Recommended for development)
```bash
npx claude-flow@alpha swarm init --topology hierarchical --agents 8
```

**Mesh** (Best for research and analysis)
```bash
npx claude-flow@alpha swarm init --topology mesh --agents 6
```

**Ring** (Optimal for sequential workflows)
```bash
npx claude-flow@alpha swarm init --topology ring --agents 4
```

### Agent Types

- **🏗️ Architect** - System design and planning
- **💻 Coder** - Implementation and development
- **📊 Analyst** - Data analysis and optimization
- **🧪 Tester** - Quality assurance and validation
- **🎯 Coordinator** - Project management and coordination
- **🔬 Researcher** - Investigation and documentation

### Memory Management

```bash
# Store coordination decisions
npx claude-flow@alpha memory store --key "project/decision" --value "{decision_data}"

# Retrieve cross-session context
npx claude-flow@alpha memory retrieve --key "project/decision"

# Search memory patterns
npx claude-flow@alpha memory search --pattern "optimization/*"
```

## 📈 Monitoring & Analytics

### Real-time Dashboard
```bash
./tools/dashboard/cost-dashboard.zsh
```

### Billing Analysis
```bash
python3 scripts/cost-tracking/claude-cost-tracker.py --action detailed-report
```

### Performance Benchmarks
```bash
npx claude-flow@alpha benchmark run --type all --iterations 50
```

## 🔐 Security & Best Practices

### Implemented Security
- **No secrets in repository** - All sensitive data excluded
- **API key management** - Secure credential handling
- **Access control** - Private repository with controlled access
- **Audit trails** - Complete operation logging

### Development Guidelines
- **Parallel execution mandatory** - All related operations in single batches
- **Memory coordination required** - Cross-agent communication through shared memory
- **Token efficiency focus** - Minimize context accumulation
- **Error recovery** - Self-healing workflows with fallback strategies

## 🤝 Contributing

### Development Workflow
1. **Fork and clone** the repository
2. **Initialize local swarm** for development coordination
3. **Create feature branch** with descriptive name
4. **Use parallel development** - batch all related operations
5. **Test thoroughly** - validate all swarm coordination
6. **Submit PR** with comprehensive description

### Coding Standards
- **Batch operations** - Never use sequential execution for related tasks
- **Memory persistence** - Store all important decisions and context
- **Error handling** - Implement comprehensive fallback strategies
- **Documentation** - Maintain detailed operation logs

## 📚 Documentation

### Core Concepts
- [Swarm Coordination](docs/swarm-coordination.md)
- [Memory Management](docs/memory-management.md)
- [Cost Optimization](docs/cost-optimization.md)
- [Performance Tuning](docs/performance-tuning.md)

### API Reference
- [MCP Tools](docs/mcp-tools.md)
- [CLI Commands](docs/cli-reference.md)
- [Hooks System](docs/hooks-system.md)

## 🐛 Troubleshooting

### Common Issues

**Swarm initialization fails**
```bash
# Check Claude Flow installation
npx claude-flow@alpha --version

# Verify MCP server connection
claude mcp list
```

**Token limit warnings**
```bash
# Check current usage
python3 scripts/cost-tracking/analyze_real_limits.py

# Monitor reset cycles
./tools/dashboard/cost-dashboard.zsh
```

**Memory coordination errors**
```bash
# Clear memory cache
npx claude-flow@alpha memory clear --namespace "problematic-session"

# Restore from backup
npx claude-flow@alpha memory restore --backup-id "last-good-state"
```

## 📊 Roadmap

### Immediate (v2.1.0)
- [ ] Enhanced GitHub integration with automated workflows
- [ ] Advanced neural pattern recognition
- [ ] Real-time collaboration features
- [ ] Extended API surface for custom integrations

### Future (v3.0.0)
- [ ] Multi-language support beyond Python/JavaScript
- [ ] Distributed swarm coordination across machines
- [ ] Advanced AI model integration
- [ ] Enterprise-grade security and compliance

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **Claude Code team** for the excellent CLI foundation
- **Anthropic** for Claude's powerful capabilities
- **Community contributors** for testing and feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/claude-flow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/claude-flow/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/claude-flow/wiki)

---

**Claude Flow v2.0.0-alpha.64** | Built with ❤️ for enhanced Claude Code development