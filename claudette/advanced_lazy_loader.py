"""
Advanced lazy loading system for heavy modules
Implements daemon mode, memory optimization, and intelligent preloading
"""

import sys
import os
import time
import threading
import importlib.util
import weakref
import gc
from pathlib import Path
from typing import Dict, Any, Optional, Callable, Set
from functools import lru_cache
import json


class ModuleDaemon:
    """
    Persistent module daemon to keep heavy imports loaded across invocations
    Uses file-based IPC for communication with claudette instances
    """
    
    def __init__(self, daemon_dir: Path = None):
        self.daemon_dir = daemon_dir or Path.home() / '.claudette' / 'daemon'
        self.daemon_dir.mkdir(parents=True, exist_ok=True)
        self.pid_file = self.daemon_dir / 'daemon.pid'
        self.request_dir = self.daemon_dir / 'requests'
        self.response_dir = self.daemon_dir / 'responses'
        
        for dir_path in [self.request_dir, self.response_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
        
        self.loaded_modules = {}
        self.last_activity = time.time()
        self.timeout = 300  # 5 minutes idle timeout
        self.running = False
    
    def start(self) -> bool:
        """Start daemon if not already running"""
        if self.is_running():
            return True
        
        try:
            # Fork daemon process
            pid = os.fork()
            if pid == 0:
                # Child process - become daemon
                self._daemonize()
                return True
            else:
                # Parent process
                return self.wait_for_startup(timeout=5)
        except (OSError, AttributeError):
            # Fork not supported (Windows) - run in-process
            return self._run_in_process()
    
    def _daemonize(self):
        """Convert to daemon process"""
        try:
            # Detach from terminal
            os.setsid()
            
            # Write PID file
            with open(self.pid_file, 'w') as f:
                f.write(str(os.getpid()))
            
            # Start main daemon loop
            self._daemon_loop()
        except Exception as e:
            print(f"Daemon startup failed: {e}", file=sys.stderr)
    
    def _daemon_loop(self):
        """Main daemon loop"""
        self.running = True
        
        while self.running:
            try:
                # Process requests
                self._process_requests()
                
                # Check for idle timeout
                if time.time() - self.last_activity > self.timeout:
                    break
                
                time.sleep(0.1)  # Small delay
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Daemon error: {e}", file=sys.stderr)
        
        self._cleanup()
    
    def _process_requests(self):
        """Process incoming module requests"""
        for request_file in self.request_dir.glob('*.json'):
            try:
                with open(request_file, 'r') as f:
                    request = json.load(f)
                
                response = self._handle_request(request)
                
                # Write response
                response_file = self.response_dir / request_file.name
                with open(response_file, 'w') as f:
                    json.dump(response, f)
                
                # Remove request
                request_file.unlink()
                self.last_activity = time.time()
                
            except Exception as e:
                print(f"Request processing error: {e}", file=sys.stderr)
    
    def _handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle a module loading request"""
        action = request.get('action')
        module_name = request.get('module')
        
        if action == 'load':
            return self._load_module(module_name)
        elif action == 'check':
            return self._check_module(module_name)
        elif action == 'preload':
            return self._preload_modules(request.get('modules', []))
        else:
            return {'error': f'Unknown action: {action}'}
    
    def _load_module(self, module_name: str) -> Dict[str, Any]:
        """Load a module and return status"""
        try:
            if module_name not in self.loaded_modules:
                start_time = time.time()
                module = importlib.import_module(module_name)
                load_time = time.time() - start_time
                
                self.loaded_modules[module_name] = {
                    'module': weakref.ref(module),
                    'load_time': load_time,
                    'loaded_at': time.time()
                }
                
                return {'status': 'loaded', 'load_time': load_time}
            else:
                return {'status': 'already_loaded'}
                
        except ImportError as e:
            return {'error': f'Import failed: {e}'}
    
    def _check_module(self, module_name: str) -> Dict[str, Any]:
        """Check if module is loaded"""
        if module_name in self.loaded_modules:
            return {'status': 'loaded', 'available': True}
        
        # Check if module can be imported
        try:
            spec = importlib.util.find_spec(module_name)
            return {'status': 'available', 'available': spec is not None}
        except Exception:
            return {'status': 'unavailable', 'available': False}
    
    def _preload_modules(self, modules: List[str]) -> Dict[str, Any]:
        """Preload multiple modules"""
        results = {}
        for module in modules:
            results[module] = self._load_module(module)
        return {'preload_results': results}
    
    def is_running(self) -> bool:
        """Check if daemon is running"""
        if not self.pid_file.exists():
            return False
        
        try:
            with open(self.pid_file, 'r') as f:
                pid = int(f.read().strip())
            
            # Check if process exists
            os.kill(pid, 0)
            return True
        except (OSError, ValueError):
            # Process doesn't exist, clean up
            if self.pid_file.exists():
                self.pid_file.unlink()
            return False
    
    def request_module(self, module_name: str, timeout: float = 2.0) -> Dict[str, Any]:
        """Request module from daemon"""
        request_id = f"{time.time()}-{os.getpid()}"
        request_file = self.request_dir / f"{request_id}.json"
        response_file = self.response_dir / f"{request_id}.json"
        
        # Send request
        request = {
            'action': 'load',
            'module': module_name,
            'timestamp': time.time()
        }
        
        with open(request_file, 'w') as f:
            json.dump(request, f)
        
        # Wait for response
        start_time = time.time()
        while time.time() - start_time < timeout:
            if response_file.exists():
                try:
                    with open(response_file, 'r') as f:
                        response = json.load(f)
                    response_file.unlink()
                    return response
                except Exception:
                    pass
            time.sleep(0.01)
        
        return {'error': 'timeout'}
    
    def _cleanup(self):
        """Clean up daemon resources"""
        try:
            if self.pid_file.exists():
                self.pid_file.unlink()
        except Exception:
            pass
    
    def _run_in_process(self) -> bool:
        """Fallback for systems without fork support"""
        # Just preload modules in current process
        self._preload_common_modules()
        return True
    
    def _preload_common_modules(self):
        """Preload commonly used heavy modules"""
        modules_to_preload = ['openai', 'tiktoken', 'yaml']
        for module in modules_to_preload:
            try:
                importlib.import_module(module)
            except ImportError:
                pass
    
    def wait_for_startup(self, timeout: float = 5.0) -> bool:
        """Wait for daemon to start up"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if self.is_running():
                return True
            time.sleep(0.1)
        return False


class AdvancedLazyLoader:
    """
    Advanced lazy loading with intelligent preloading and memory optimization
    """
    
    def __init__(self):
        self.loaded_modules = {}
        self.load_times = {}
        self.access_patterns = {}
        self.daemon = ModuleDaemon()
        self.memory_threshold = 150 * 1024 * 1024  # 150MB
        
    @lru_cache(maxsize=128)
    def get_import_cost(self, module_name: str) -> float:
        """Get estimated import cost in milliseconds"""
        # Measured import costs
        known_costs = {
            'openai': 1599.0,
            'tiktoken': 33.0,
            'yaml': 38.0,
            'anthropic': 500.0,
            'torch': 3000.0,
            'tensorflow': 4000.0,
            'numpy': 100.0,
            'pandas': 200.0
        }
        
        return known_costs.get(module_name, 50.0)  # Default estimate
    
    def should_use_daemon(self, module_name: str) -> bool:
        """Decide if module should use daemon loading"""
        import_cost = self.get_import_cost(module_name)
        return import_cost > 200.0  # Use daemon for expensive imports
    
    def lazy_import_with_daemon(self, module_name: str):
        """Create daemon-aware lazy import"""
        if self.should_use_daemon(module_name):
            return DaemonLazyImport(module_name, self.daemon)
        else:
            return MemoryOptimizedLazyImport(module_name)
    
    def preload_for_command(self, command: str):
        """Intelligently preload modules based on command"""
        preload_map = {
            'edit': ['openai', 'tiktoken'],
            'commit': ['openai'],
            'compress': ['openai', 'tiktoken'],
            'chat': ['openai', 'tiktoken', 'yaml']
        }
        
        modules = preload_map.get(command, [])
        if modules and self.daemon.start():
            # Request preload from daemon
            self.daemon.request_module('preload', {'modules': modules})
    
    def optimize_memory(self):
        """Optimize memory usage by unloading unused modules"""
        import psutil
        
        current_memory = psutil.Process().memory_info().rss
        if current_memory < self.memory_threshold:
            return
        
        # Find least recently used modules
        now = time.time()
        candidates_for_unload = []
        
        for module_name, info in self.loaded_modules.items():
            last_access = info.get('last_access', now)
            if now - last_access > 60:  # Not used in 60 seconds
                candidates_for_unload.append(module_name)
        
        # Unload modules
        for module_name in candidates_for_unload:
            self._unload_module(module_name)
        
        # Force garbage collection
        gc.collect()
    
    def _unload_module(self, module_name: str):
        """Unload a module from memory"""
        try:
            if module_name in sys.modules:
                del sys.modules[module_name]
            if module_name in self.loaded_modules:
                del self.loaded_modules[module_name]
        except Exception:
            pass


class DaemonLazyImport:
    """Lazy import that uses daemon for heavy modules"""
    
    def __init__(self, module_name: str, daemon: ModuleDaemon):
        self.module_name = module_name
        self.daemon = daemon
        self._module = None
        self._failed = False
    
    def __getattr__(self, name: str):
        if self._failed:
            raise ImportError(f"Module {self.module_name} not available")
        
        if self._module is None:
            # Try daemon first
            if self.daemon.start():
                response = self.daemon.request_module(self.module_name)
                if 'error' not in response:
                    # Module loaded in daemon, import in current process
                    try:
                        self._module = importlib.import_module(self.module_name)
                    except ImportError:
                        self._failed = True
                        raise
                else:
                    # Daemon failed, try direct import
                    try:
                        self._module = importlib.import_module(self.module_name)
                    except ImportError:
                        self._failed = True
                        raise
            else:
                # No daemon, direct import
                try:
                    self._module = importlib.import_module(self.module_name)
                except ImportError:
                    self._failed = True
                    raise
        
        return getattr(self._module, name)


class MemoryOptimizedLazyImport:
    """Memory-optimized lazy import for lighter modules"""
    
    def __init__(self, module_name: str):
        self.module_name = module_name
        self._module = None
        self._weak_ref = None
        self.last_access = time.time()
    
    def __getattr__(self, name: str):
        self.last_access = time.time()
        
        # Check if we have a weak reference and it's still alive
        if self._weak_ref is not None:
            module = self._weak_ref()
            if module is not None:
                self._module = module
        
        if self._module is None:
            self._module = importlib.import_module(self.module_name)
            # Create weak reference for memory optimization
            self._weak_ref = weakref.ref(self._module)
        
        return getattr(self._module, name)


# Global loader instance
_advanced_loader = None

def get_advanced_loader() -> AdvancedLazyLoader:
    """Get global advanced loader instance"""
    global _advanced_loader
    if _advanced_loader is None:
        _advanced_loader = AdvancedLazyLoader()
    return _advanced_loader


def create_optimized_import(module_name: str):
    """Create optimized lazy import for module"""
    return get_advanced_loader().lazy_import_with_daemon(module_name)


def preload_for_command(command: str):
    """Preload modules for specific command"""
    get_advanced_loader().preload_for_command(command)


def optimize_memory():
    """Optimize memory usage"""
    get_advanced_loader().optimize_memory()