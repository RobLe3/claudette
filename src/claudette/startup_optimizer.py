"""
Startup optimization system for claudette
Implements aggressive startup time reduction techniques
"""

import os
import sys
import time
import subprocess
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
from concurrent.futures import ThreadPoolExecutor, as_completed


class StartupProfiler:
    """Profile claudette startup to identify bottlenecks"""
    
    def __init__(self):
        self.profile_data = {}
        self.start_time = time.time()
        self.checkpoints = []
        self.enabled = os.environ.get('CLAUDETTE_PROFILE', '0') == '1'
    
    def checkpoint(self, name: str, details: str = ""):
        """Record a startup checkpoint"""
        if not self.enabled:
            return
        
        current_time = time.time()
        elapsed = current_time - self.start_time
        
        checkpoint = {
            'name': name,
            'details': details,
            'elapsed': elapsed * 1000,  # ms
            'timestamp': current_time
        }
        
        self.checkpoints.append(checkpoint)
    
    def save_profile(self):
        """Save profile data to disk"""
        if not self.enabled or not self.checkpoints:
            return
        
        profile_dir = Path.home() / '.claudette' / 'profiling'
        profile_dir.mkdir(parents=True, exist_ok=True)
        
        profile_file = profile_dir / f'startup_profile_{int(time.time())}.json'
        
        profile_data = {
            'checkpoints': self.checkpoints,
            'total_time': (time.time() - self.start_time) * 1000,
            'command': ' '.join(sys.argv),
            'python_version': sys.version_info[:3]
        }
        
        with open(profile_file, 'w') as f:
            json.dump(profile_data, f, indent=2)
    
    def get_bottlenecks(self) -> List[Dict[str, Any]]:
        """Identify startup bottlenecks"""
        if not self.checkpoints:
            return []
        
        bottlenecks = []
        prev_time = 0
        
        for checkpoint in self.checkpoints:
            duration = checkpoint['elapsed'] - prev_time
            if duration > 50:  # More than 50ms
                bottlenecks.append({
                    'name': checkpoint['name'],
                    'duration': duration,
                    'details': checkpoint['details']
                })
            prev_time = checkpoint['elapsed']
        
        return sorted(bottlenecks, key=lambda x: x['duration'], reverse=True)


class FastestPathRouter:
    """Route commands to fastest execution path"""
    
    def __init__(self):
        self.routing_cache = self._load_routing_cache()
        self.command_times = {}
    
    def _load_routing_cache(self) -> Dict[str, Any]:
        """Load cached routing decisions"""
        cache_file = Path.home() / '.claudette' / 'cache' / 'routing.json'
        
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
        
        return {
            'direct_forward': set(),
            'fast_path': set(),
            'full_pipeline': set()
        }
    
    def should_bypass_all(self, args: List[str]) -> bool:
        """Check if command should bypass all claudette processing"""
        if not args:
            return True
        
        # Commands that should always bypass
        bypass_commands = {
            'help', '--help', '-h',
            'version', '--version', '-V',
            'status', 'info',
            'config', 'auth'
        }
        
        first_arg = args[0].lstrip('-')
        return first_arg in bypass_commands
    
    def get_optimal_route(self, args: List[str]) -> str:
        """Get optimal routing strategy for command"""
        if not args:
            return 'fast_path'
        
        command_key = args[0]
        
        # Check cache
        if command_key in self.routing_cache.get('direct_forward', set()):
            return 'direct_forward'
        elif command_key in self.routing_cache.get('fast_path', set()):
            return 'fast_path'
        elif command_key in self.routing_cache.get('full_pipeline', set()):
            return 'full_pipeline'
        
        # Default routing logic
        if self.should_bypass_all(args):
            return 'direct_forward'
        
        # Check if command benefits from preprocessing
        preprocessing_commands = {'edit', 'ask', 'chat', 'commit', 'new'}
        if args[0] in preprocessing_commands:
            return 'full_pipeline'
        
        return 'fast_path'
    
    def record_execution_time(self, route: str, args: List[str], execution_time: float):
        """Record execution time for routing optimization"""
        command_key = args[0] if args else 'empty'
        
        if command_key not in self.command_times:
            self.command_times[command_key] = {}
        
        if route not in self.command_times[command_key]:
            self.command_times[command_key][route] = []
        
        self.command_times[command_key][route].append(execution_time)
        
        # Keep only last 10 measurements
        if len(self.command_times[command_key][route]) > 10:
            self.command_times[command_key][route] = self.command_times[command_key][route][-10:]


class ColdStartOptimizer:
    """Optimize cold start performance"""
    
    def __init__(self):
        self.cache_dir = Path.home() / '.claudette' / 'cache'
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.warmup_file = self.cache_dir / 'warmup.json'
        self.module_cache = self.cache_dir / 'modules.json'
    
    def should_warmup(self) -> bool:
        """Check if system should be warmed up"""
        if not self.warmup_file.exists():
            return True
        
        try:
            with open(self.warmup_file, 'r') as f:
                warmup_data = json.load(f)
            
            last_warmup = warmup_data.get('last_warmup', 0)
            warmup_interval = 3600  # 1 hour
            
            return time.time() - last_warmup > warmup_interval
        except Exception:
            return True
    
    def warmup_system(self):
        """Warm up system for faster subsequent starts"""
        if not self.should_warmup():
            return
        
        start_time = time.time()
        
        # Pre-compile critical modules
        self._precompile_modules()
        
        # Prime caches
        self._prime_caches()
        
        # Save warmup timestamp
        warmup_data = {
            'last_warmup': time.time(),
            'warmup_duration': time.time() - start_time,
            'version': '1.3.0'
        }
        
        with open(self.warmup_file, 'w') as f:
            json.dump(warmup_data, f)
    
    def _precompile_modules(self):
        """Precompile Python modules for faster imports"""
        modules_to_compile = [
            'claudette.main',
            'claudette.fast_cli', 
            'claudette.lazy_imports',
            'claudette.performance_monitor'
        ]
        
        for module_name in modules_to_compile:
            try:
                # Import and compile
                __import__(module_name)
            except ImportError:
                pass
    
    def _prime_caches(self):
        """Prime various caches"""
        # Prime file system cache
        config_files = [
            Path.home() / '.claudette' / 'config.yaml',
            Path('config.yaml'),
            Path.home() / '.claude' / 'config.toml'
        ]
        
        for config_file in config_files:
            if config_file.exists():
                try:
                    config_file.read_text()
                except Exception:
                    pass


class ParallelStartupOptimizer:
    """Use parallel processing to optimize startup"""
    
    def __init__(self):
        self.thread_pool = ThreadPoolExecutor(max_workers=3)
        self.background_tasks = []
    
    def start_background_warmup(self):
        """Start background warmup tasks"""
        # Warmup task 1: Prime import paths
        self.background_tasks.append(
            self.thread_pool.submit(self._prime_import_paths)
        )
        
        # Warmup task 2: Check command availability
        self.background_tasks.append(
            self.thread_pool.submit(self._check_claude_availability)
        )
        
        # Warmup task 3: Load config
        self.background_tasks.append(
            self.thread_pool.submit(self._preload_config)
        )
    
    def wait_for_critical_tasks(self, timeout: float = 1.0):
        """Wait for critical background tasks to complete"""
        completed_count = 0
        
        for future in as_completed(self.background_tasks, timeout=timeout):
            try:
                result = future.result()
                completed_count += 1
            except Exception:
                pass
        
        return completed_count
    
    def _prime_import_paths(self):
        """Prime Python import paths"""
        # Touch key modules without importing
        key_modules = ['openai', 'tiktoken', 'yaml']
        
        for module_name in key_modules:
            try:
                import importlib.util
                spec = importlib.util.find_spec(module_name)
                if spec and spec.origin:
                    # Just check if file exists
                    Path(spec.origin).exists()
            except Exception:
                pass
    
    def _check_claude_availability(self):
        """Check Claude CLI availability in background"""
        try:
            result = subprocess.run(
                ['claude', '--version'],
                capture_output=True,
                text=True,
                timeout=2
            )
            return result.returncode == 0
        except Exception:
            return False
    
    def _preload_config(self):
        """Preload configuration in background"""
        config_files = [
            Path.home() / '.claudette' / 'config.yaml',
            Path('config.yaml')
        ]
        
        for config_file in config_files:
            if config_file.exists():
                try:
                    # Simple text read without yaml parsing
                    content = config_file.read_text()
                    return content
                except Exception:
                    pass
        
        return None
    
    def shutdown(self):
        """Shutdown thread pool"""
        self.thread_pool.shutdown(wait=False)


class UltraFastCLI:
    """Ultra-optimized CLI for minimal latency"""
    
    def __init__(self):
        self.profiler = StartupProfiler()
        self.router = FastestPathRouter()
        self.cold_start = ColdStartOptimizer()
        self.parallel = ParallelStartupOptimizer()
        
        self.profiler.checkpoint("init", "CLI initialized")
    
    def run_optimized(self, args: List[str]) -> int:
        """Run with maximum optimization"""
        self.profiler.checkpoint("start", f"Command: {' '.join(args)}")
        
        # Start background warmup immediately
        self.parallel.start_background_warmup()
        self.profiler.checkpoint("background_started", "Background tasks started")
        
        # Get optimal routing strategy
        route = self.router.get_optimal_route(args)
        self.profiler.checkpoint("route_decided", f"Route: {route}")
        
        start_time = time.time()
        
        try:
            if route == 'direct_forward':
                result = self._direct_forward(args)
            elif route == 'fast_path':
                result = self._fast_path(args)
            else:
                result = self._full_pipeline(args)
            
            execution_time = time.time() - start_time
            self.router.record_execution_time(route, args, execution_time)
            
            self.profiler.checkpoint("execution_complete", f"Result: {result}")
            
            return result
            
        finally:
            self.parallel.shutdown()
            self.profiler.save_profile()
    
    def _direct_forward(self, args: List[str]) -> int:
        """Direct forward with minimal overhead"""
        claude_cmd = self._get_cached_claude_cmd()
        
        try:
            # Direct subprocess call with minimal overhead
            return subprocess.call([claude_cmd] + args)
        except FileNotFoundError:
            return 127
    
    def _fast_path(self, args: List[str]) -> int:
        """Fast path through optimized fast_cli"""
        from .fast_cli import handle_fast_path
        return handle_fast_path(args)
    
    def _full_pipeline(self, args: List[str]) -> int:
        """Full claudette pipeline"""
        from .main import ClaudetteCLI
        
        # Wait for some background tasks to complete
        self.parallel.wait_for_critical_tasks(timeout=0.5)
        
        cli = ClaudetteCLI()
        return cli.run(args)
    
    def _get_cached_claude_cmd(self) -> str:
        """Get cached Claude command path"""
        # Try environment variable first
        if 'CLAUDE_CMD' in os.environ:
            return os.environ['CLAUDE_CMD']
        
        # Simple config parsing without heavy imports
        config_file = Path.home() / '.claudette' / 'config.yaml'
        if config_file.exists():
            try:
                content = config_file.read_text()
                for line in content.split('\n'):
                    if line.strip().startswith('claude_cmd:'):
                        cmd = line.split(':', 1)[1].strip().strip('\'"')
                        return cmd
            except Exception:
                pass
        
        return 'claude'


# Global optimization instance
_ultra_cli = None

def get_ultra_cli() -> UltraFastCLI:
    """Get global ultra CLI instance"""
    global _ultra_cli
    if _ultra_cli is None:
        _ultra_cli = UltraFastCLI()
    return _ultra_cli


def run_ultra_optimized(args: List[str]) -> int:
    """Run command with ultra optimization"""
    return get_ultra_cli().run_optimized(args)