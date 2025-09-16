.PHONY: help test lint build release clean install dev-install

PYTHON = python3
PIP = pip3
PACKAGE = claudette

help:
	@echo "Claudette Development Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  help         Show this help message"
	@echo "  install      Install package from PyPI"
	@echo "  dev-install  Install package in development mode"
	@echo "  test         Run tests with pytest"
	@echo "  lint         Run pylint with score threshold ≥8.0"
	@echo "  build        Build source and wheel distributions"
	@echo "  release      Run release build script with signing"
	@echo "  clean        Remove build artifacts and cache files"
	@echo ""

install:
	@echo "📦 Installing $(PACKAGE) from PyPI..."
	$(PIP) install $(PACKAGE)

install-local:
	@echo "🔧 Installing $(PACKAGE) in development mode..."
	$(PIP) install -e .

dev-install:
	@echo "🔧 Installing $(PACKAGE) in development mode..."
	$(PIP) install -e ".[dev]"

test:
	@echo "🧪 Running tests..."
	$(PYTHON) -m pytest tests/ -v --tb=short
	@echo "✅ Tests completed"

lint:
	@echo "🔍 Running pylint..."
	$(PYTHON) -m pylint $(PACKAGE) --fail-under=8.0 --output-format=colorized
	@echo "✅ Linting passed"

build:
	@echo "🏗️  Building package..."
	$(PYTHON) -m build
	@echo "🔍 Verifying package integrity..."
	$(PYTHON) -m twine check dist/*
	@echo "✅ Build completed successfully"

release:
	@echo "🚀 Running release build..."
	./scripts/release/build_pypi.sh --sign

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf .pytest_cache/
	rm -rf __pycache__/
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} +
	rm -rf .mypy_cache/
	rm -rf .coverage
	rm -rf htmlcov/
	@echo "✅ Clean complete"

# Composite targets
test-all: lint test
	@echo "✅ All quality checks passed"

check-version:
	@echo "📋 Version information:"
	@$(PYTHON) -c "from $(PACKAGE) import __version__; print(f'Package: {__version__}')"
	@grep 'version = ' pyproject.toml

validate-package: build
	@echo "🔍 Validating package..."
	@$(PYTHON) -c "import tempfile, subprocess, sys; \
		result = subprocess.run([sys.executable, '-m', 'pip', 'install', '--dry-run', 'dist/$(PACKAGE)-*.whl'], \
		capture_output=True, text=True); \
		print('✅ Package validation passed' if result.returncode == 0 else '❌ Package validation failed')"

# CI targets (used by GitHub Actions)
ci-test: test-all validate-package
	@echo "✅ CI test suite completed"

# Quality tools
format:
	@echo "🎨 Formatting code..."
	$(PYTHON) -m black claudette tests
	$(PYTHON) -m isort claudette tests
	@echo "✅ Code formatting completed"

typecheck:
	@echo "🔍 Running type checking..."
	$(PYTHON) -m mypy claudette --strict --ignore-missing-imports
	@echo "✅ Type checking completed"

security:
	@echo "🔒 Running security scanning..."
	$(PYTHON) -m bandit -r claudette -c bandit.yaml -lll
	@echo "✅ Security scanning completed"

docs:
	@echo "📚 Building documentation..."
	mkdocs build --strict
	@echo "✅ Documentation built successfully"

docs-serve:
	@echo "📖 Serving documentation at http://localhost:8000"
	mkdocs serve -a localhost:8000

precommit:
	@echo "🔧 Running pre-commit hooks..."
	pre-commit run --all-files
	@echo "✅ Pre-commit hooks completed"