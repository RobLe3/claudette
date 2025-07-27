# Contributing to Claudette

Thank you for your interest in contributing to Claudette! This guide will help you get started.

## Development Setup

### Prerequisites

- Python 3.11 or higher
- Git
- Virtual environment tool (venv, conda, etc.)

### Setup Steps

```bash
# 1. Fork and clone the repository
git clone https://github.com/yourusername/claudette.git
cd claudette

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate     # Windows

# 3. Install development dependencies
pip install -e ".[dev]"

# 4. Install pre-commit hooks
pre-commit install

# 5. Verify setup
make test
```

## Development Workflow

### Code Quality Standards

We maintain high code quality through automated tools:

#### Code Formatting
- **Black**: Code formatting with 100-character line length
- **isort**: Import sorting with Black profile compatibility

```bash
# Format code
make format

# Check formatting
black --check claudette/
isort --check-only claudette/
```

#### Type Checking
- **mypy**: Strict type checking with 100% coverage requirement

```bash
# Run type checking
make typecheck

# Fix type issues
mypy claudette/ --strict --ignore-missing-imports
```

#### Linting
- **flake8**: Code linting and style checking
- **pylint**: Advanced code analysis

```bash
# Run linting
make lint

# Check specific issues
flake8 claudette/
pylint claudette/
```

#### Security Scanning
- **bandit**: Security vulnerability scanning

```bash
# Run security scan
make security

# Detailed security report
bandit -r claudette/ -f json -o security-report.json
```

### Testing Requirements

#### Test Coverage
- Minimum 85% test coverage required
- All new code must include comprehensive tests

```bash
# Run tests with coverage
make test

# Generate coverage report
pytest --cov=claudette --cov-report=html
open htmlcov/index.html
```

#### Test Categories

1. **Unit Tests**: Test individual functions and classes
```python
def test_backend_selection():
    manager = BackendManager({})
    backend = manager.select_backend({'cost': 'low'})
    assert backend == 'openai'
```

2. **Integration Tests**: Test component interactions
```python
def test_cache_backend_integration():
    cache = Cache()
    backend = OpenAIBackend({})
    # Test cache + backend interaction
```

3. **End-to-End Tests**: Test complete workflows
```python
def test_full_command_execution():
    result = execute_command(['claudette', 'test message'])
    assert result.returncode == 0
```

### Commit Standards

We use **Conventional Commits** for clear commit history:

#### Commit Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Commit Types
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

#### Examples
```bash
feat(backends): add Mistral backend support
fix(cache): resolve database lock issue
docs(api): update backend API documentation
test(stats): add cost calculation tests
```

### Pull Request Process

#### Before Submitting

1. **Run Quality Checks**
```bash
# Run all quality checks
make lint typecheck security test

# Or run pre-commit hooks
pre-commit run --all-files
```

2. **Update Documentation**
- Update relevant documentation files
- Add docstrings to new functions/classes
- Update API reference if needed

3. **Write Tests**
- Add tests for new functionality
- Ensure coverage meets minimum requirements
- Test edge cases and error conditions

#### PR Guidelines

1. **Clear Description**
   - Describe what changes were made
   - Explain why the changes were necessary
   - Include any breaking changes

2. **Small, Focused Changes**
   - Keep PRs focused on single features/fixes
   - Avoid mixing different types of changes
   - Break large changes into multiple PRs

3. **Documentation Updates**
   - Update relevant documentation
   - Include code examples for new features
   - Update changelog for significant changes

#### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Coverage requirements met

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## Architecture Guidelines

### Code Organization

```
claudette/
├── __init__.py          # Package initialization
├── main.py              # CLI entry point
├── backends.py          # Backend system
├── cache.py             # Caching system
├── stats.py             # Cost analytics
├── dashboard.py         # Dashboard interface
├── preprocessor.py      # Context optimization
├── config.py            # Configuration management
└── utils.py             # Utility functions
```

### Design Principles

1. **Modularity**: Each component should be independent and testable
2. **Extensibility**: Easy to add new backends and features
3. **Performance**: Optimize for speed and memory usage
4. **Reliability**: Comprehensive error handling and recovery
5. **Usability**: Clear APIs and helpful error messages

### Adding New Features

#### New Backend
```python
# 1. Create backend class
class NewBackend(BaseBackend):
    def is_available(self) -> bool:
        # Implementation
        pass
    
    def send(self, message: str, context: Optional[List[str]] = None) -> str:
        # Implementation  
        pass

# 2. Register in BackendManager
# 3. Add configuration options
# 4. Write comprehensive tests
# 5. Update documentation
```

#### New CLI Command
```python
# 1. Add argument parser
parser.add_subcommand('newcommand', help='Description')

# 2. Implement handler function
def handle_newcommand(args):
    # Implementation
    pass

# 3. Add tests and documentation
```

## Documentation Standards

### Code Documentation

#### Docstrings
Use Google-style docstrings:

```python
def calculate_cost(tokens: int, backend: str) -> float:
    """Calculate cost for token usage.
    
    Args:
        tokens: Number of tokens to process
        backend: Backend identifier
        
    Returns:
        Estimated cost in USD
        
    Raises:
        ValueError: If backend is not supported
        
    Example:
        >>> calculate_cost(1000, 'openai')
        0.002
    """
    pass
```

#### Type Hints
All functions must have complete type hints:

```python
from typing import Dict, List, Optional, Union

def process_files(
    files: List[str], 
    config: Dict[str, Any]
) -> Optional[str]:
    """Process multiple files."""
    pass
```

### User Documentation

- **Clear Examples**: Include practical examples
- **Step-by-Step**: Break complex tasks into steps
- **Error Solutions**: Document common issues and fixes
- **API Reference**: Complete API documentation with examples

## Release Process

### Version Management
- Follow Semantic Versioning (SemVer)
- Update version in `pyproject.toml`
- Update `CHANGELOG.md` with changes

### Release Checklist
1. All tests pass
2. Documentation updated
3. Version bumped
4. Changelog updated
5. Git tag created
6. PyPI package published

## Getting Help

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Pull Request Reviews**: Code review and feedback

### Code Review Process
1. **Automated Checks**: All CI checks must pass
2. **Peer Review**: At least one maintainer review required
3. **Documentation Review**: Ensure documentation is complete
4. **Testing Review**: Verify comprehensive test coverage

## Recognition

Contributors will be:
- Listed in `CONTRIBUTORS.md`
- Mentioned in release notes for significant contributions
- Invited to maintainer team for consistent high-quality contributions

Thank you for contributing to Claudette! 🚀