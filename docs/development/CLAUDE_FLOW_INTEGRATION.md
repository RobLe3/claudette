# Claude-Flow Integration for Claudette AI Tools

## Overview

This document describes the integration between `claudette-ai-tools` (Python) and `claude-flow` (Node.js) for advanced AI orchestration capabilities.

## Installation & Setup

### Prerequisites

1. **Node.js** >= 18.0.0
2. **npm** package manager
3. **Python** >= 3.8 with claudette-ai-tools installed

### Quick Setup

```bash
# 1. Install claudette-ai-tools
pip install -e .

# 2. Install claude-flow (choose one method)
npm install claude-flow@alpha  # Local installation
# OR
npx claude-flow@alpha          # Use globally

# 3. Verify integration
claudette claude-flow-status
```

## Available Commands

### Status & Diagnostics

```bash
# Check integration status
claudette claude-flow-status

# Check all dependencies
claudette check-dependencies

# System health check
claudette doctor
```

### Installation & Management

```bash
# Install claude-flow integration
claudette install-claude-flow

# Initialize a swarm
claudette swarm-init --topology hierarchical --max-agents 8
claudette swarm-init --topology mesh --max-agents 5
```

## Integration Architecture

### Python Bridge Module

**Location**: `claudette/integrations/claude_flow_bridge.py`

The bridge module provides:
- **ClaudeFlowBridge**: Main integration class
- **Subprocess Management**: Safe execution of Node.js commands
- **Error Handling**: Graceful fallbacks when claude-flow unavailable
- **Version Detection**: Automatic claude-flow version detection

### Key Features

1. **Swarm Initialization**
   ```python
   from claudette.integrations.claude_flow_bridge import claude_flow
   result = claude_flow.initialize_swarm(topology="mesh", max_agents=6)
   ```

2. **Agent Spawning**
   ```python
   result = claude_flow.spawn_agent("researcher", name="DataAnalyst")
   ```

3. **Task Orchestration**
   ```python
   result = claude_flow.orchestrate_task("Analyze dataset", strategy="parallel")
   ```

4. **Memory Management**
   ```python
   result = claude_flow.use_memory("store", "project/findings", "analysis_results")
   ```

### Dependency Management

**Location**: `claudette/integrations/dependency_manager.py`

Provides comprehensive dependency checking:
- Node.js and npm version validation
- Claude-flow installation detection
- Python package dependency verification
- Automated installation recommendations

## Configuration

### Package.json Integration

```json
{
  "name": "claudette-ai-tools-integration",
  "dependencies": {
    "claude-flow": "^2.0.0-alpha"
  },
  "scripts": {
    "check-claude-flow": "npx claude-flow@alpha --version",
    "test-integration": "npx claude-flow@alpha features detect"
  }
}
```

### CLI Integration

Commands are integrated into the main CLI through:
- `claudette/main_impl.py`: Command routing
- `claudette/cli_commands.py`: Command implementations

## Usage Examples

### Basic Swarm Workflow

```bash
# 1. Check system readiness
claudette doctor

# 2. Verify claude-flow integration
claudette claude-flow-status

# 3. Initialize swarm for complex task
claudette swarm-init --topology hierarchical --max-agents 8

# 4. Use Python API for advanced coordination
python -c "
from claudette.integrations.claude_flow_bridge import claude_flow
result = claude_flow.orchestrate_task('Analyze codebase', strategy='adaptive')
print(result)
"
```

### Research Coordination Example

```python
from claudette.integrations.claude_flow_bridge import claude_flow

# Initialize research swarm
swarm_result = claude_flow.initialize_swarm(
    topology="mesh", 
    max_agents=5
)

# Spawn specialized agents
researcher = claude_flow.spawn_agent(
    "researcher", 
    name="Literature Review",
    capabilities=["academic_search", "analysis"]
)

analyst = claude_flow.spawn_agent(
    "analyst",
    name="Data Analysis", 
    capabilities=["statistical_analysis", "visualization"]
)

# Orchestrate research task
task_result = claude_flow.orchestrate_task(
    "Research neural architecture optimization techniques",
    strategy="parallel"
)
```

## Error Handling & Troubleshooting

### Common Issues

1. **Claude-flow not detected**
   ```bash
   # Solution: Install locally
   npm install claude-flow@alpha
   
   # Or verify global installation
   npx claude-flow@alpha --version
   ```

2. **Node.js version incompatible**
   ```bash
   # Check version
   node --version  # Should be >= 18.0.0
   
   # Update if needed
   nvm install 18
   nvm use 18
   ```

3. **Permission errors**
   ```bash
   # Fix npm permissions
   npm config set prefix ~/.npm-global
   export PATH=~/.npm-global/bin:$PATH
   ```

### Debug Mode

Enable detailed logging:
```bash
export CLAUDETTE_DEBUG=1
claudette claude-flow-status
```

## Testing

### Unit Tests

```bash
# Test bridge functionality
python -m claudette.integrations.claude_flow_bridge

# Test dependency manager
python -c "
from claudette.integrations.dependency_manager import DependencyManager
manager = DependencyManager()
status = manager.comprehensive_check()
print(status)
"
```

### Integration Tests

```bash
# Full integration test
claudette check-dependencies

# Test CLI commands
claudette claude-flow-status
claudette swarm-init --topology mesh --max-agents 3
```

## Performance Considerations

### Optimization Features

1. **Lazy Loading**: Bridge modules only imported when needed
2. **Timeout Management**: Short timeouts prevent hanging
3. **Error Caching**: Failed checks cached to avoid repeated attempts
4. **Fast Path**: Direct forwarding for simple operations

### Best Practices

1. **Use Local Installation**: Install claude-flow locally for best performance
2. **Appropriate Timeouts**: Set reasonable timeouts for your environment
3. **Error Handling**: Always check return values from bridge methods
4. **Resource Management**: Clean up swarms when done

## Security

### Safe Execution

- All subprocess calls use `capture_output=True`
- Timeouts prevent infinite waits
- Input validation on all parameters
- No shell=True for security

### Dependency Verification

- Package integrity checking
- Version validation
- Secure installation paths

## Development

### Extending the Integration

To add new claude-flow features:

1. **Add bridge method** in `claude_flow_bridge.py`
2. **Create CLI command** in `cli_commands.py`
3. **Update command routing** in `main_impl.py`
4. **Add tests** and documentation

### Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

## Changelog

### v2.0.0
- ✅ Complete claude-flow integration
- ✅ CLI command support
- ✅ Dependency management
- ✅ Error handling and fallbacks
- ✅ Comprehensive documentation

### Future Enhancements

- **Advanced Swarm Templates**: Pre-configured swarm setups
- **Performance Monitoring**: Integration performance metrics
- **Auto-scaling**: Dynamic agent count adjustment
- **Persistent Sessions**: Cross-session swarm persistence

## Support

- **Documentation**: This file and inline code documentation
- **Issues**: Report issues in the project repository
- **Examples**: See `/examples` directory for usage examples

---

**Integration Status**: ✅ Complete and functional
**Last Updated**: January 26, 2025
**Version**: 2.0.0