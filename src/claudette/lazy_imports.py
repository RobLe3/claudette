"""
Lazy import system for performance optimization
Reduces startup time by deferring expensive imports until needed
"""

import sys
from typing import Any, Callable, Optional, Dict
from functools import wraps
import importlib


class LazyModule:
    """Lazy wrapper for modules to defer import until first access"""
    
    def __init__(self, module_name: str, package: Optional[str] = None):
        self._module_name = module_name
        self._package = package
        self._module = None
    
    def __getattr__(self, name: str) -> Any:
        if self._module is None:
            try:
                self._module = importlib.import_module(self._module_name, self._package)
            except ImportError as e:
                raise ImportError(f"Failed to import {self._module_name}: {e}")
        
        return getattr(self._module, name)


class LazyFunction:
    """Lazy wrapper for functions to defer import until called"""
    
    def __init__(self, module_name: str, function_name: str, package: Optional[str] = None):
        self._module_name = module_name
        self._function_name = function_name
        self._package = package
        self._function = None
    
    def __call__(self, *args, **kwargs) -> Any:
        if self._function is None:
            try:
                module = importlib.import_module(self._module_name, self._package)
                self._function = getattr(module, self._function_name)
            except (ImportError, AttributeError) as e:
                raise ImportError(f"Failed to import {self._function_name} from {self._module_name}: {e}")
        
        return self._function(*args, **kwargs)


def conditional_import(module_name: str, fallback: Any = None, package: Optional[str] = None) -> Any:
    """Conditionally import a module, returning fallback if import fails"""
    try:
        return importlib.import_module(module_name, package)
    except ImportError:
        return fallback


def lazy_import_on_call(module_name: str, package: Optional[str] = None):
    """Decorator to lazy import a module only when the decorated function is called"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Import the module just before function execution
            try:
                module = importlib.import_module(module_name, package)
                # Inject the module into the function's globals
                func.__globals__[module_name.split('.')[-1]] = module
            except ImportError as e:
                raise ImportError(f"Required module {module_name} not available: {e}")
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


# Pre-configured lazy imports for common expensive modules
try:
    yaml_lazy = LazyModule('yaml')
except ImportError:
    try:
        yaml_lazy = LazyModule('ruamel.yaml')
    except ImportError:
        # Create a minimal yaml replacement for basic parsing
        class MinimalYAML:
            def load(self, content):
                # Very basic YAML parsing for config files
                result = {}
                for line in content.split('\n'):
                    line = line.strip()
                    if ':' in line and not line.startswith('#'):
                        key, value = line.split(':', 1)
                        key = key.strip()
                        value = value.strip().strip('\'"')
                        result[key] = value
                return result
            
            def safe_load(self, content):
                return self.load(content)
        
        yaml_lazy = MinimalYAML()
openai_lazy = LazyModule('openai')
tiktoken_lazy = LazyModule('tiktoken')
sqlite3_lazy = LazyModule('sqlite3')


# Function-level lazy imports for specific use cases
tiktoken_get_encoding = LazyFunction('tiktoken', 'get_encoding')
openai_chat_create = LazyFunction('openai', 'chat')


# Cache for lazy-loaded modules to avoid repeated imports
_module_cache: Dict[str, Any] = {}


def get_cached_module(module_name: str, package: Optional[str] = None) -> Any:
    """Get a module from cache or import it lazily"""
    cache_key = f"{package}.{module_name}" if package else module_name
    
    if cache_key not in _module_cache:
        try:
            _module_cache[cache_key] = importlib.import_module(module_name, package)
        except ImportError:
            _module_cache[cache_key] = None
    
    return _module_cache[cache_key]


def warm_cache(modules: list) -> None:
    """Pre-warm the module cache with commonly used modules"""
    for module_info in modules:
        if isinstance(module_info, str):
            get_cached_module(module_info)
        elif isinstance(module_info, tuple):
            module_name, package = module_info
            get_cached_module(module_name, package)