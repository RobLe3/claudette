# Backend System API

Multi-backend architecture and plugin system.

## Backend Interface

### BaseBackend

```python
class BaseBackend:
    """Base class for all backends."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize backend with configuration."""
        pass
    
    def is_available(self) -> bool:
        """Check if backend is available for use."""
        pass
    
    def send(self, message: str, context: Optional[List[str]] = None) -> str:
        """Send message to backend and return response."""
        pass
    
    def estimate_cost(self, message: str) -> float:
        """Estimate cost for processing message."""
        pass
```

## Built-in Backends

### ClaudeBackend

```python
class ClaudeBackend(BaseBackend):
    """Official Claude CLI backend."""
    
    def __init__(self, config: Dict[str, Any]):
        self.claude_cmd = config.get('claude_cmd', 'claude')
        super().__init__(config)
    
    def is_available(self) -> bool:
        """Check if Claude CLI is installed and authenticated."""
        pass
    
    def send(self, message: str, context: Optional[List[str]] = None) -> str:
        """Execute command using Claude CLI."""
        pass
```

### OpenAIBackend

```python
class OpenAIBackend(BaseBackend):
    """OpenAI API backend."""
    
    def __init__(self, config: Dict[str, Any]):
        self.api_key = config.get('openai_api_key')
        self.model = config.get('openai_model', 'gpt-4')
        super().__init__(config)
    
    def is_available(self) -> bool:
        """Check if OpenAI API key is configured."""
        pass
    
    def send(self, message: str, context: Optional[List[str]] = None) -> str:
        """Send request to OpenAI API."""
        pass
```

## Backend Manager

### BackendManager

```python
class BackendManager:
    """Manages multiple backends and routing."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize with configuration."""
        pass
    
    def register_backend(self, name: str, backend: BaseBackend):
        """Register a new backend."""
        pass
    
    def get_backend(self, name: str) -> Optional[BaseBackend]:
        """Get backend by name."""
        pass
    
    def select_backend(self, criteria: Dict[str, Any]) -> str:
        """Select optimal backend based on criteria."""
        pass
    
    def send_with_fallback(self, message: str, preferred_backend: str) -> str:
        """Send message with automatic fallback."""
        pass
```

## Plugin System

### Plugin Discovery

```python
def discover_plugins() -> List[str]:
    """Discover available backend plugins."""
    pass

def load_plugin(plugin_name: str) -> BaseBackend:
    """Load backend plugin by name."""
    pass
```

### Creating Custom Backends

```python
# Example custom backend
class CustomBackend(BaseBackend):
    """Custom backend implementation."""
    
    def is_available(self) -> bool:
        # Check if your backend service is available
        return True
    
    def send(self, message: str, context: Optional[List[str]] = None) -> str:
        # Implement your backend logic
        return "Custom response"
    
    def estimate_cost(self, message: str) -> float:
        # Implement cost estimation
        return 0.01
```