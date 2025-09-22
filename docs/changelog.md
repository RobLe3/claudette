# Changelog

All notable changes to claudette will be documented in this file.

## [1.3.0] - 2025-07-22

### Added
- Drop-in CLI replacement for Claude Code with `claudette` and `claude` commands
- Transparent preprocessing pipeline for known Claude Code verbs (edit, commit, new, ask)
- STDIN forwarding and exit code preservation for seamless Claude CLI integration
- Help text caching and mirroring from Claude CLI with claudette branding
- Automatic prompt compression and caching for enhanced performance
- Environment variable control for claude alias (CLAUDETTE_NO_CLAUDE_ALIAS)
- Comprehensive CLI proxy integration tests covering all command scenarios

### Enhanced
- Main entry point supports both module execution and CLI binary usage
- Configuration loading from project and user config.yaml files
- Error handling for missing Claude CLI with helpful installation guidance
- Cross-platform compatibility with pure Python implementation
- Make target `install-local` for development installation with `pip install -e .`

### Infrastructure
- Updated pyproject.toml with dual CLI entry points (claudette and claude)
- Integration test suite for CLI proxy functionality and subprocess mocking
- Version bump to 1.3.0 reflecting major CLI interface enhancement
- Development workflow improvements with local installation support

### CLI Interface
- `claudette --help` mirrors Claude CLI help with claudette branding
- `claudette edit file.py --explain "change"` applies preprocessing then forwards to Claude
- `claudette commit -m "message"` uses compression pipeline for efficient prompting
- Unknown commands pass through directly to Claude CLI without preprocessing
- Full STDIN/STDOUT forwarding maintains Claude CLI compatibility

## [1.2.0] - 2025-07-22

### Added
- Comprehensive test and benchmark suite for production-grade quality assurance
- Feature tests for CLI end-to-end, multi-backend, and cache functionality
- Bug hunt regression tests covering all historical fixes in CHANGELOG
- Performance benchmarks with automated threshold enforcement
- Memory peak monitoring ensuring RSS < 150MB under load
- Benchmark runner CLI with JSON baseline comparison and CI integration
- Automated GitHub Actions workflow for performance regression detection
- Documentation with latest benchmark results and test matrix coverage

### Enhanced
- pytest-benchmark integration for consistent performance measurement
- psutil monitoring for memory usage tracking during operations
- Comprehensive error handling and edge case coverage
- Performance thresholds: compression < 300ms, backend switch < 40ms, cache hit < 150ms
- Memory efficiency validation with concurrent operation stress testing
- CI/CD pipeline with automated baseline comparison and regression alerts

### Infrastructure
- GitHub Actions benchmark workflow with Python 3.11/3.12 matrix testing
- Automated performance report generation and PR comments
- Benchmark artifact storage with 90-day retention for historical analysis
- Documentation updates with performance badges and test coverage reports
- Performance regression gates: FAIL > 20% latency or 15% memory increase

### Quality Assurance
- 63 total tests including 40 benchmark tests for comprehensive coverage
- Regression tests for configuration handling, cache issues, and API errors
- End-to-end CLI testing with git integration and mock API scenarios
- Multi-backend testing with fallback mechanisms and concurrent access validation
- Cache performance testing with TTL, serialization, and memory efficiency validation

## [1.1.0] - 2025-07-21

### Added
- Quality guardrails with comprehensive code quality tools
- Pre-commit hooks with black, isort, flake8, mypy, bandit, commitizen
- Automated static analysis in CI with coverage gates (≥85%)
- MkDocs documentation site with Material theme
- API reference with mkdocstrings auto-generation
- Dependabot configuration for automated dependency updates
- Comprehensive contributing guide and development workflow

### Changed  
- Enhanced CI pipeline with static-checks job and quality gates
- Updated pyproject.toml with tool configurations (black, isort, mypy)
- Badge row in README with build, coverage, docs, PyPI, license
- Version bump to 1.1.0 for quality improvements

### Infrastructure
- GitHub Pages workflow for documentation deployment
- Codecov integration for coverage reporting
- Security scanning with bandit configuration
- Conventional commits enforcement with commitizen
- Code coverage minimum threshold set to 85%

## [1.0.0] - 2025-07-21

### Added
- First public release with production packaging and CI/CD
- Automated PyPI publishing with GitHub Actions
- Homebrew formula for macOS installation
- Comprehensive CI/CD pipeline with Python 3.11/3.12 testing
- GPG package signing support
- Release automation with tagged deployments

### Changed
- Package configuration migrated to pyproject.toml (PEP 621)
- Version bump to 1.0.0 for stable public release
- Enhanced build scripts with validation and signing
- Production-ready packaging with complete metadata

### Infrastructure
- GitHub Actions CI workflow with matrix testing
- Automated release workflow triggered by git tags
- PyPI and Test PyPI integration
- Build artifact management and validation
- Release documentation and process guidelines

## [0.6.0] - 2025-07-21

### Added
- Interactive cost dashboard with terminal and web interfaces
- Comprehensive cost statistics CLI with filtering and analytics
- Rich terminal interface with live monitoring capabilities
- Web dashboard with Plotly charts and visualizations
- Cost optimization insights and backend comparison analysis
- File usage analytics and top expensive files tracking
- Historical cost trends and projections
- Data aggregation utilities for custom cost analysis
- Export capabilities for reports and CI/CD integration

### Changed
- Updated main.py CLI with `stats` and `dashboard` subcommands
- Enhanced requirements with rich, flask, plotly, pandas dependencies
- Extended cost tracking integration with existing cache system
- Improved cost estimation accuracy with 2025 AI pricing
- Version bump to 0.6.0

### Features
- `claudette stats` - Detailed cost analysis with period and backend filtering
- `claudette dashboard terminal` - Rich terminal dashboard with live monitoring
- `claudette dashboard web` - Browser-based interactive charts at localhost:8080
- Backend cost comparison with percentage breakdowns
- Cache efficiency metrics and compression effectiveness analysis
- Top files by usage with cost estimates and last-used timestamps
- Real-time cost projections (daily, weekly, monthly)
- Comprehensive integration tests for stats and dashboard functionality

## [0.5.0] - 2025-07-21

### Added
- Session caching and history system with SQLite backend
- `claudette history` command with filtering and search capabilities  
- `--no-cache` flag to bypass cache lookup and saving
- Cache hit detection prevents recompression of identical operations
- Comprehensive integration tests for cache functionality
- Cache usage guide and documentation updates

### Changed
- Updated preprocessor to check cache before compression
- Enhanced invoker to save operation events after backend responses
- Extended main.py CLI with history subcommand and cache flags
- Updated config.yaml with cache_dir and history_enabled settings
- Version bump to 0.5.0

### Features
- Cache stores raw prompts, compressed prompts, backend used, and response hashes
- Cache hit criteria: same prompt + same file contents + same backend
- Session history with timestamp, backend, cost estimates, and prompt excerpts
- Cache statistics and management (clear, stats display)
- Automatic cache database creation at ~/.claudette/cache/claudette.db

## [0.4.0] - 2025-01-15

### Added
- Multi-backend plugin system with dynamic discovery
- Mistral AI backend plugin with API integration
- Ollama local server backend plugin  
- Plugin loader supporting file-based and entry point discovery
- Dynamic backend listing via `--backend list` command
- Enhanced configuration with backend-specific settings
- Comprehensive plugin loading tests

### Changed
- Extended `--backend` flag to support all discovered plugins
- Updated invoker.py with plugin-aware backend selection
- Enhanced config.yaml with mistral/ollama configuration
- Improved error handling for plugin loading failures
- Version bump to 0.4.0

### Features
- Discovers backends from claudette/plugins/ directory
- Supports setuptools entry points under 'claudette_backends' group
- Case-insensitive backend name matching
- Graceful fallback when plugins fail to load
- Caching for backend instances to improve performance

## [0.3.0] - 2025-01-15

### Added
- Automatic fallback routing to OpenAI when Claude quota is low
- Smart quota detection using cost tracker and Claude CLI status
- `--backend` flag for explicit backend selection (auto, claude, openai)
- Claude-compatible diff formatting for OpenAI responses  
- Comprehensive fallback integration tests
- Enhanced backend abstraction with `send()` method

### Changed
- Updated invoker.py with intelligent backend selection
- Enhanced backends.py with quota detection and routing logic
- Improved main.py with backend override options
- Version bump to 0.3.0

### Features
- Detects Claude quota using prompts_left() estimation
- Falls back to OpenAI automatically when quota < 2 prompts
- Maintains Claude Code compatibility across all backends
- Supports fallback_enabled configuration flag

## [0.2.0] - 2025-01-15

### Added
- Full prompt compression using OpenAI ChatGPT
- Token-aware context selection with 1,500 token budget
- Intelligent file ranking by relevance score
- Automatic token limiting to 2,000 tokens max
- `###COMPRESSED###` marker for processed prompts
- Claudette header in all Claude CLI calls
- Comprehensive unit and integration tests
- Token estimation using tiktoken
- Fallback compression when OpenAI unavailable

### Changed
- Updated preprocessor.py with full compression logic
- Enhanced context_builder.py with smart file selection
- Improved invoker.py with version headers
- Bumped version to 0.2.0

### Performance
- Achieves 40%+ prompt compression ratio
- Reduces Claude Pro quota burn significantly
- Maintains command compatibility with Claude CLI

## [0.1.0] - 2025-01-14

### Added
- Initial claudette package structure
- Basic CLI wrapper for Claude Code commands
- OpenAI integration stub
- Configuration management via config.yaml
- Support for edit, commit, and new commands
- Basic integration tests