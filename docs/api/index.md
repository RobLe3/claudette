# API Reference

Complete API documentation for Claudette modules and functions.

## Overview

Claudette is organized into several core modules:

- **[claudette](claudette.md)** - Main CLI entry point and core functionality
- **[stats](stats.md)** - Cost statistics and analysis
- **[dashboard](dashboard.md)** - Interactive dashboards and visualizations
- **[backends](backends.md)** - Multi-backend system and plugins

## Module Structure

```
claudette/
├── main.py           # CLI entry point and command parsing
├── stats.py          # Cost analysis and statistics
├── dashboard.py      # Terminal and web dashboards
├── backends.py       # Backend management and routing
├── cache.py          # Session caching system
├── history.py        # Command history management
├── preprocessor.py   # Context compression and preprocessing
├── invoker.py        # Backend execution and routing
├── config.py         # Configuration management
├── context_builder.py # Context construction utilities
└── plugins/          # Backend plugin system
    ├── mistral_backend.py
    └── ollama_backend.py
```

## Quick Reference

### Core Functions

::: claudette.main.main
    options:
      show_source: false

### Statistics & Analytics

::: claudette.stats.cmd_stats
    options:
      show_source: false

### Dashboard Components

::: claudette.dashboard.TerminalDashboard
    options:
      show_source: false

### Backend Management

::: claudette.backends.load_backend
    options:
      show_source: false

## Usage Examples

### Programmatic Usage

```python
from claudette.config import Config
from claudette.invoker import ClaudeInvoker
from claudette.preprocessor import Preprocessor

# Load configuration
config = Config.load()

# Initialize components
preprocessor = Preprocessor(config)
invoker = ClaudeInvoker(config)

# Process and execute
message = preprocessor.compress("Edit this file to add logging", {})
result = invoker.run(["edit", "app.py"], message)
```

### Statistics API

```python
from claudette.stats import query_stats, estimate_cost
from claudette.cache import get_cache_manager

# Get cost statistics
cache_manager = get_cache_manager()
stats = query_stats(cache_manager, backend="claude", period="week")

# Calculate costs
claude_cost = estimate_cost("claude", 1000)  # 1000 tokens
openai_cost = estimate_cost("openai", 1000)
```

### Dashboard API

```python
from claudette.dashboard import TerminalDashboard, WebDashboard
from claudette.cache import get_cache_manager

# Terminal dashboard
cache_manager = get_cache_manager()
terminal_dash = TerminalDashboard(cache_manager)
terminal_dash.display_overview()

# Web dashboard
web_dash = WebDashboard(cache_manager)
web_dash.run(host="0.0.0.0", port=8080)
```

## Configuration API

### Config Class

::: claudette.config.Config
    options:
      show_source: false

### Cache Management

::: claudette.cache.CacheManager
    options:
      show_source: false

## Backend Plugin API

### Base Backend

```python
from claudette.backends import BaseBackend

class CustomBackend(BaseBackend):
    def __init__(self, config: dict):
        super().__init__(config)
        self.api_key = config.get('custom_api_key')
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    def send(self, message: str, cmd_args: list) -> str:
        # Implement custom backend logic
        return "Custom backend response"
```

### Plugin Registration

```python
# In setup.py or pyproject.toml
entry_points = {
    'claudette_backends': [
        'custom = my_package.custom_backend:CustomBackend',
    ],
}
```

## Error Handling

### Common Exceptions

```python
from claudette.config import ConfigError
from claudette.backends import BackendError

try:
    config = Config.load()
    invoker = ClaudeInvoker(config)
    result = invoker.run(["edit", "file.py"], "message")
except ConfigError as e:
    print(f"Configuration error: {e}")
except BackendError as e:
    print(f"Backend error: {e}")
```

## Testing Utilities

### Test Helpers

```python
from claudette.cache import CacheManager
import tempfile

# Create test cache
def create_test_cache():
    temp_dir = tempfile.mkdtemp()
    return CacheManager(temp_dir)

# Mock configuration
def create_test_config():
    return {
        'claude_cmd': 'claude',
        'openai_key': 'test-key',
        'fallback_enabled': True
    }
```

## Type Hints

Claudette includes comprehensive type hints for all public APIs:

```python
from typing import Dict, List, Optional, Any
from claudette.config import Config
from claudette.backends import BaseBackend

def process_request(
    config: Config,
    backend: BaseBackend,
    message: str,
    context: Dict[str, Any]
) -> Optional[str]:
    """Process request with type safety."""
    pass
```

## Next Steps

- Explore specific module documentation in the navigation
- Check out [usage examples](../usage.md) for practical applications
- Review [development guide](../how_to_contribute.md) for contributing