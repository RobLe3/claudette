# Contributing to Claudette

Thank you for your interest in contributing to Claudette! This guide will help you get started with development and ensure your contributions align with our standards.

## Development Setup

### Prerequisites

- Python 3.11 or higher
- Git
- Claude CLI (for testing integrations)
- OpenAI API key (for testing preprocessing features)

### Environment Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/claude-flow.git
   cd claude-flow
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install development dependencies:**
   ```bash
   pip install -e ".[dev]"
   ```

4. **Install pre-commit hooks:**
   ```bash
   pre-commit install
   ```

5. **Verify installation:**
   ```bash
   claudette --help
   make test
   ```

## Development Workflow

### Code Quality Standards

All code must meet these quality standards:

- **Code formatting:** Black with 100 character line length
- **Import sorting:** isort with Black profile
- **Linting:** flake8 and pylint (score ≥ 8.0)
- **Type checking:** mypy with strict mode
- **Security:** bandit security scanning
- **Test coverage:** ≥ 85% coverage with pytest-cov

### Pre-commit Hooks

Pre-commit hooks automatically enforce code quality:

```bash
# Run all hooks manually
pre-commit run --all-files

# Hooks run automatically on commit
git commit -m "feat: add new feature"
```

### Code Style

#### Formatting
```bash
# Auto-format code
make format

# Or manually
black claudette tests
isort claudette tests
```

#### Type Hints
All new code must include type hints:

```python
from typing import Dict, List, Optional, Any

def process_data(
    items: List[Dict[str, Any]], 
    config: Optional[Dict[str, str]] = None
) -> Dict[str, int]:
    """Process data with proper type hints."""
    return {"count": len(items)}
```

#### Documentation
Use Google-style docstrings:

```python
def estimate_cost(backend: str, tokens: int) -> float:
    """Estimate cost for backend and token count.
    
    Args:
        backend: Backend name (claude, openai, etc.)
        tokens: Number of tokens
        
    Returns:
        Estimated cost in USD
        
    Raises:
        ValueError: If backend is not supported
    """
    pass
```

### Testing

#### Running Tests
```bash
# Run all tests
make test

# Run with coverage
pytest --cov=claudette --cov-report=html

# Run specific test file
pytest tests/integration/test_stats.py

# Run specific test
pytest tests/integration/test_stats.py::TestStatsIntegration::test_cost_estimation
```

#### Writing Tests
Follow these testing patterns:

```python
import pytest
import tempfile
from unittest.mock import patch, MagicMock

from claudette.cache import CacheManager
from claudette.stats import estimate_cost

class TestStatsFeatures:
    def setup_method(self):
        """Setup test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.cache_manager = CacheManager(self.temp_dir)
    
    def teardown_method(self):
        """Cleanup test environment."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_cost_estimation_accuracy(self):
        """Test cost estimation for different backends."""
        claude_cost = estimate_cost("claude", 1000)
        openai_cost = estimate_cost("openai", 1000)
        
        assert claude_cost > openai_cost
        assert openai_cost > 0
    
    @patch('claudette.stats.get_cache_manager')
    def test_stats_with_mock(self, mock_get_cache):
        """Test stats functionality with mocked dependencies."""
        mock_get_cache.return_value = self.cache_manager
        # Test implementation
```

### Commit Message Convention

Use Conventional Commits format:

```bash
# Format: <type>(<scope>): <description>

# Examples:
git commit -m "feat(stats): add cost trend analysis"
git commit -m "fix(cache): resolve database lock issue"  
git commit -m "docs(api): update API reference"
git commit -m "test(dashboard): add integration tests"
git commit -m "refactor(backends): simplify plugin loading"
git commit -m "chore(deps): update dependencies"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

## Contributing Process

### 1. Planning
- Check existing issues for similar work
- Create issue for new features or bugs
- Discuss approach in issue comments

### 2. Development
```bash
# Create feature branch
git checkout -b feat/your-feature-name

# Make changes with atomic commits
git add .
git commit -m "feat: implement feature X"

# Keep branch updated
git fetch origin
git rebase origin/main
```

### 3. Testing
```bash
# Run full test suite
make test lint typecheck security

# Ensure coverage meets minimum
pytest --cov=claudette --cov-fail-under=85

# Test documentation builds
mkdocs serve
```

### 4. Pull Request
Create PR with:
- Clear title and description
- Link to related issues
- Test coverage maintained
- Documentation updates included

## Areas for Contribution

### High Priority
- **Backend Plugins**: New AI service integrations
- **Cost Optimization**: Better cost estimation algorithms
- **Performance**: Caching and query optimizations
- **Documentation**: Usage examples and tutorials

### Medium Priority
- **Dashboard Features**: New visualization types
- **CLI Enhancements**: Additional command options
- **Testing**: Integration test coverage
- **Error Handling**: Better error messages

### Low Priority
- **Code Quality**: Refactoring opportunities
- **Dependencies**: Dependency updates
- **Tooling**: Development workflow improvements

## Code Architecture

### Module Organization
```
claudette/
├── main.py           # CLI entry point
├── stats.py          # Cost analysis
├── dashboard.py      # Visualizations  
├── cache.py          # Session management
├── backends.py       # Backend routing
├── preprocessor.py   # Context compression
├── invoker.py        # Command execution
├── config.py         # Configuration
└── plugins/          # Backend plugins
```

### Plugin System
Create new backend plugins:

```python
from claudette.backends import BaseBackend

class NewBackend(BaseBackend):
    def __init__(self, config: dict):
        super().__init__(config)
        self.setup_client()
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def send(self, message: str, cmd_args: list) -> str:
        # Implement backend-specific logic
        pass
```

### Dashboard Extensions
Add new dashboard components:

```python
from claudette.dashboard import TerminalDashboard

class CustomDashboard(TerminalDashboard):
    def display_custom_view(self):
        """Add custom dashboard view."""
        # Implementation
        pass
```

## Release Process

Contributors don't need to handle releases directly, but understanding the process helps:

1. **Version Bumping**: Maintainers update version in `__init__.py`
2. **Changelog**: Update `CHANGELOG.md` with changes
3. **Tagging**: Create git tag `v*.*.*` triggers automated release
4. **Distribution**: Automated PyPI publishing and GitHub release

## Getting Help

### Resources
- **Documentation**: [https://ruvnet.github.io/claude-flow](https://ruvnet.github.io/claude-flow)
- **Issues**: [GitHub Issues](https://github.com/ruvnet/claude-flow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ruvnet/claude-flow/discussions)

### Communication
- Use GitHub issues for bug reports and feature requests
- Use discussions for questions and community chat
- Tag maintainers (`@ruvnet`) for urgent issues

### Code Review
All contributions go through code review:
- Focus on code quality and architecture
- Ensure test coverage is maintained
- Verify documentation is updated
- Check for security implications

## Recognition

Contributors are recognized in:
- **CONTRIBUTORS.md**: List of all contributors
- **Changelog**: Credit for specific contributions  
- **GitHub**: Contributor graphs and statistics
- **Releases**: Recognition in release notes

Thank you for contributing to Claudette! 🚀