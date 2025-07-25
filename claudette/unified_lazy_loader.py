#!/usr/bin/env python3
"""
Unified Lazy Loading System - Replaces multiple competing lazy loaders
"""

import importlib
import threading
from typing import Any, Dict, Optional

class UnifiedLazyLoader:
    """Thread-safe lazy loading system"""
    
    _instance = None
    _lock = threading.Lock()
    _module_cache: Dict[str, Any] = {}
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def load_module(self, module_name: str, package: Optional[str] = None) -> Any:
        """Thread-safe module loading with caching"""
        cache_key = f"{package}.{module_name}" if package else module_name
        
        if cache_key in self._module_cache:
            return self._module_cache[cache_key]
        
        try:
            module = importlib.import_module(module_name, package)
            self._module_cache[cache_key] = module
            return module
        except ImportError:
            self._module_cache[cache_key] = None
            return None

# Global instance
lazy_loader = UnifiedLazyLoader()

# Common lazy imports
def get_openai():
    return lazy_loader.load_module('openai')

def get_tiktoken():
    return lazy_loader.load_module('tiktoken')

openai = property(get_openai)
tiktoken = property(get_tiktoken)
