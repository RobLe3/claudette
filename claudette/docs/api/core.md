# Core API Reference

Main CLI interface and core functionality.

## CLI Interface

### main.py

The primary entry point for the Claudette CLI.

```python
def main():
    """Main CLI entry point."""
    pass

def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    pass

def execute_command(args: argparse.Namespace) -> int:
    """Execute the main command with given arguments."""
    pass
```

## Configuration Management

### Configuration Loading

```python
class Config:
    """Configuration management class."""
    
    def __init__(self, config_file: Optional[str] = None):
        """Initialize configuration."""
        pass
    
    def load_config(self) -> Dict[str, Any]:
        """Load configuration from file and environment."""
        pass
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value."""
        pass
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDETTE_DEFAULT_BACKEND` | Default backend to use | `claude` |
| `CLAUDETTE_CACHE_DIR` | Cache directory path | `~/.claudette/cache` |
| `CLAUDETTE_CONFIG_FILE` | Configuration file path | `~/.claudette/config.yaml` |
| `OPENAI_API_KEY` | OpenAI API key | None |
| `MISTRAL_API_KEY` | Mistral API key | None |

## Error Handling

### Exception Classes

```python
class ClaudetteError(Exception):
    """Base exception for Claudette."""
    pass

class BackendError(ClaudetteError):
    """Backend-related errors."""
    pass

class CacheError(ClaudetteError):
    """Cache-related errors."""
    pass

class ConfigError(ClaudetteError):
    """Configuration errors."""
    pass
```

## Utilities

### Common Functions

```python
def validate_backend(backend: str) -> bool:
    """Validate backend availability."""
    pass

def estimate_cost(text: str, backend: str) -> float:
    """Estimate cost for given text and backend."""
    pass

def format_response(response: str, format_type: str = "markdown") -> str:
    """Format response for display."""
    pass
```