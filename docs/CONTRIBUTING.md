# Contributing to Claudette

Thank you for your interest in contributing! Please see our comprehensive [Contributing Guide](docs/how_to_contribute.md) for detailed instructions.

## Quick Start

1. **Setup Development Environment**
   ```bash
   git clone https://github.com/ruvnet/claude-flow.git
   cd claude-flow
   pip install -e ".[dev]"
   pre-commit install
   ```

2. **Run Quality Checks**
   ```bash
   make test lint typecheck security
   ```

3. **Make Changes and Submit PR**
   - Follow [Conventional Commits](https://www.conventionalcommits.org/)
   - Ensure tests pass and coverage ≥ 85%
   - Update documentation as needed

## Code Standards

- **Formatting**: Black (100 char line length)
- **Type Checking**: mypy strict mode
- **Testing**: pytest with ≥85% coverage
- **Security**: bandit scanning
- **Documentation**: Google-style docstrings

## Development Commands

```bash
make format     # Auto-format code
make lint       # Run linting checks
make typecheck  # Run type checking
make security   # Run security scans
make test       # Run test suite
make docs       # Build documentation
make precommit  # Run all pre-commit hooks
```

## Need Help?

- 📖 [Full Contributing Guide](docs/how_to_contribute.md)
- 🐛 [Report Issues](https://github.com/ruvnet/claude-flow/issues)
- 💬 [Join Discussions](https://github.com/ruvnet/claude-flow/discussions)

We appreciate all contributions! 🚀