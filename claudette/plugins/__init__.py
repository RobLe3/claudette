"""
Claudette Plugins - Dynamic backend loading system
Auto-discovers available backend plugins via multiple discovery methods
"""

import os
import sys
import importlib
import inspect
from pathlib import Path
from typing import Dict, Type, Optional, List
from ..backends import BaseBackend


class PluginLoader:
    """Handles dynamic discovery and loading of backend plugins"""
    
    def __init__(self):
        self._backends_cache: Dict[str, Type[BaseBackend]] = {}
        self._discovery_complete = False
    
    def discover_backends(self) -> Dict[str, Type[BaseBackend]]:
        """
        Discover all available backends using multiple methods
        
        Discovery order:
        1. Built-in backends from backends.py
        2. Plugin files in claudette/plugins/
        3. Entry points under group 'claudette_backends'
        
        Returns:
            Dict mapping backend names to backend classes
        """
        if self._discovery_complete:
            return self._backends_cache
        
        # 1. Built-in backends
        self._load_builtin_backends()
        
        # 2. Plugin files
        self._load_plugin_files()
        
        # 3. Entry points (if setuptools available)
        self._load_entry_points()
        
        self._discovery_complete = True
        return self._backends_cache
    
    def _load_builtin_backends(self):
        """Load built-in backends from backends.py"""
        try:
            from ..backends import ClaudeBackend, OpenAIBackend, FallbackBackend
            
            self._backends_cache['claude'] = ClaudeBackend
            self._backends_cache['openai'] = OpenAIBackend
            self._backends_cache['fallback'] = FallbackBackend
            
        except ImportError as e:
            print(f"Warning: Failed to load built-in backends: {e}")
    
    def _load_plugin_files(self):
        """Load backends from plugin files in claudette/plugins/"""
        plugins_dir = Path(__file__).parent
        
        for plugin_file in plugins_dir.glob("*_backend.py"):
            if plugin_file.name == "__init__.py":
                continue
            
            try:
                # Import the plugin module
                module_name = plugin_file.stem
                spec = importlib.util.spec_from_file_location(
                    f"claudette.plugins.{module_name}", 
                    plugin_file
                )
                
                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    # Find backend classes in the module
                    for name, obj in inspect.getmembers(module, inspect.isclass):
                        if (issubclass(obj, BaseBackend) and 
                            obj != BaseBackend and 
                            hasattr(obj, 'name')):
                            
                            backend_name = obj.name.lower()
                            self._backends_cache[backend_name] = obj
                            
            except Exception as e:
                print(f"Warning: Failed to load plugin {plugin_file}: {e}")
    
    def _load_entry_points(self):
        """Load backends from setuptools entry points"""
        try:
            import pkg_resources
            
            for entry_point in pkg_resources.iter_entry_points('claudette_backends'):
                try:
                    backend_class = entry_point.load()
                    if (inspect.isclass(backend_class) and 
                        issubclass(backend_class, BaseBackend) and
                        hasattr(backend_class, 'name')):
                        
                        backend_name = backend_class.name.lower()
                        self._backends_cache[backend_name] = backend_class
                        
                except Exception as e:
                    print(f"Warning: Failed to load entry point {entry_point}: {e}")
                    
        except ImportError:
            # pkg_resources not available, skip entry points
            pass
    
    def get_backend(self, name: str) -> Optional[Type[BaseBackend]]:
        """Get a specific backend by name"""
        backends = self.discover_backends()
        return backends.get(name.lower())
    
    def list_backends(self) -> List[str]:
        """List all available backend names"""
        backends = self.discover_backends()
        return sorted(backends.keys())


# Global plugin loader instance
_plugin_loader = PluginLoader()


def load_backend(name: str) -> Optional[Type[BaseBackend]]:
    """
    Load a backend by name
    
    Args:
        name: Backend name (case insensitive)
        
    Returns:
        Backend class or None if not found
    """
    return _plugin_loader.get_backend(name)


def list_available_backends() -> List[str]:
    """List all discovered backend names"""
    return _plugin_loader.list_backends()


def discover_all_backends() -> Dict[str, Type[BaseBackend]]:
    """Discover and return all available backends"""
    return _plugin_loader.discover_backends()