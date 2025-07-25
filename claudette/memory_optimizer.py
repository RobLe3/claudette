"""
Memory optimization system for claudette
Reduces memory footprint and implements intelligent garbage collection
"""

import gc
import sys
import os
import time
import psutil
import weakref
import threading
from typing import Dict, Any, List, Set, Optional, Tuple
from pathlib import Path
import json
from dataclasses import dataclass
from functools import lru_cache
import tracemalloc


@dataclass
class MemorySnapshot:
    """Memory usage snapshot"""
    timestamp: float
    rss_mb: float
    vms_mb: float
    python_objects: int
    loaded_modules: int
    cache_size_mb: float
    gc_stats: Dict[str, Any]


class MemoryProfiler:
    """Profile memory usage for optimization"""
    
    def __init__(self):
        self.enabled = os.environ.get('CLAUDETTE_MEMORY_PROFILE', '0') == '1'
        self.snapshots: List[MemorySnapshot] = []
        self.start_time = time.time()
        
        if self.enabled:
            tracemalloc.start()
    
    def take_snapshot(self, label: str = "") -> MemorySnapshot:
        """Take memory usage snapshot"""
        process = psutil.Process()
        memory_info = process.memory_info()
        
        snapshot = MemorySnapshot(
            timestamp=time.time() - self.start_time,
            rss_mb=memory_info.rss / 1024 / 1024,
            vms_mb=memory_info.vms / 1024 / 1024,
            python_objects=len(gc.get_objects()),
            loaded_modules=len(sys.modules),
            cache_size_mb=self._calculate_cache_size(),
            gc_stats=self._get_gc_stats()
        )
        
        if self.enabled:
            self.snapshots.append(snapshot)
        
        return snapshot
    
    def _calculate_cache_size(self) -> float:
        """Estimate size of various caches"""
        total_size = 0
        
        # Function cache sizes
        for obj in gc.get_objects():
            if hasattr(obj, 'cache_info'):
                try:
                    cache_info = obj.cache_info()
                    # Rough estimate: 100 bytes per cache entry
                    total_size += cache_info.currsize * 100
                except Exception:
                    pass
        
        return total_size / 1024 / 1024  # MB
    
    def _get_gc_stats(self) -> Dict[str, Any]:
        """Get garbage collection statistics"""
        stats = {}
        
        try:
            # GC generation stats
            for i, stat in enumerate(gc.get_stats()):
                stats[f'gen_{i}'] = stat
            
            # GC counts
            stats['gc_counts'] = gc.get_count()
            
        except Exception:
            pass
        
        return stats
    
    def get_memory_report(self) -> str:
        """Generate memory usage report"""
        if not self.snapshots:
            current = self.take_snapshot()
            return f"Current memory usage: {current.rss_mb:.1f}MB RSS, {current.python_objects} objects"
        
        first = self.snapshots[0]
        last = self.snapshots[-1]
        
        memory_growth = last.rss_mb - first.rss_mb
        object_growth = last.python_objects - first.python_objects
        
        report = f"""
📊 Memory Usage Report
=====================

Current Usage:
  • RSS Memory: {last.rss_mb:.1f}MB
  • Python Objects: {last.python_objects:,}
  • Loaded Modules: {last.loaded_modules}
  • Cache Size: {last.cache_size_mb:.1f}MB

Growth Since Start:
  • Memory Growth: {memory_growth:+.1f}MB
  • Object Growth: {object_growth:+,}
  
Performance:
  • Duration: {last.timestamp:.2f}s
  • Memory/Time: {memory_growth/last.timestamp:.2f}MB/s
"""
        
        return report.strip()
    
    def save_profile(self):
        """Save memory profile to disk"""
        if not self.enabled or not self.snapshots:
            return
        
        profile_dir = Path.home() / '.claudette' / 'profiling'
        profile_dir.mkdir(parents=True, exist_ok=True)
        
        profile_file = profile_dir / f'memory_profile_{int(time.time())}.json'
        
        # Convert snapshots to JSON-serializable format
        snapshots_data = []
        for snapshot in self.snapshots:
            snapshots_data.append({
                'timestamp': snapshot.timestamp,
                'rss_mb': snapshot.rss_mb,
                'vms_mb': snapshot.vms_mb,
                'python_objects': snapshot.python_objects,
                'loaded_modules': snapshot.loaded_modules,
                'cache_size_mb': snapshot.cache_size_mb,
                'gc_stats': snapshot.gc_stats
            })
        
        profile_data = {
            'snapshots': snapshots_data,
            'command': ' '.join(sys.argv),
            'total_time': self.snapshots[-1].timestamp if self.snapshots else 0
        }
        
        with open(profile_file, 'w') as f:
            json.dump(profile_data, f, indent=2)


class SmartGarbageCollector:
    """Intelligent garbage collection for memory optimization"""
    
    def __init__(self):
        self.last_cleanup = time.time()
        self.cleanup_interval = 30  # 30 seconds
        self.memory_threshold = 100 * 1024 * 1024  # 100MB
        self.aggressive_threshold = 150 * 1024 * 1024  # 150MB
        
        # Track objects for cleanup
        self.weak_refs: Set[weakref.ref] = set()
        self.cleanup_candidates: List[Any] = []
    
    def should_cleanup(self) -> bool:
        """Check if cleanup should be performed"""
        now = time.time()
        
        # Time-based cleanup
        if now - self.last_cleanup > self.cleanup_interval:
            return True
        
        # Memory-based cleanup
        try:
            memory_usage = psutil.Process().memory_info().rss
            return memory_usage > self.memory_threshold
        except Exception:
            return False
    
    def cleanup(self, aggressive: bool = False) -> Dict[str, Any]:
        """Perform memory cleanup"""
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss
        
        cleanup_stats = {
            'objects_before': len(gc.get_objects()),
            'modules_before': len(sys.modules),
            'memory_before_mb': start_memory / 1024 / 1024
        }
        
        # Clean up weak references
        self._cleanup_weak_refs()
        
        # Clean up caches
        self._cleanup_caches(aggressive)
        
        # Clean up modules if aggressive
        if aggressive:
            self._cleanup_modules()
        
        # Force garbage collection
        collected = gc.collect()
        
        end_time = time.time()
        end_memory = psutil.Process().memory_info().rss
        
        cleanup_stats.update({
            'objects_after': len(gc.get_objects()),
            'modules_after': len(sys.modules),
            'memory_after_mb': end_memory / 1024 / 1024,
            'objects_collected': collected,
            'memory_freed_mb': (start_memory - end_memory) / 1024 / 1024,
            'cleanup_time_ms': (end_time - start_time) * 1000,
            'aggressive': aggressive
        })
        
        self.last_cleanup = time.time()
        return cleanup_stats
    
    def _cleanup_weak_refs(self):
        """Clean up dead weak references"""
        alive_refs = set()
        
        for ref in self.weak_refs:
            if ref() is not None:
                alive_refs.add(ref)
        
        self.weak_refs = alive_refs
    
    def _cleanup_caches(self, aggressive: bool):
        """Clean up various caches"""
        # Clear function caches
        for obj in gc.get_objects():
            if hasattr(obj, 'cache_clear'):
                try:
                    obj.cache_clear()
                except Exception:
                    pass
        
        # Clear import caches
        if aggressive:
            if hasattr(sys, 'path_importer_cache'):
                sys.path_importer_cache.clear()
    
    def _cleanup_modules(self):
        """Clean up unused modules (aggressive cleanup)"""
        # Find modules that can be safely unloaded
        safe_to_unload = []
        
        for module_name, module in list(sys.modules.items()):
            # Skip built-in and essential modules
            if module_name in sys.builtin_module_names:
                continue
            if module_name.startswith(('sys', 'os', 'gc', 'time')):
                continue
            if module_name.startswith('claudette.'):
                continue
            
            # Check if module is actively referenced
            if sys.getrefcount(module) <= 3:  # Basic reference count
                safe_to_unload.append(module_name)
        
        # Unload modules
        for module_name in safe_to_unload:
            try:
                del sys.modules[module_name]
            except KeyError:
                pass
    
    def register_for_cleanup(self, obj: Any):
        """Register object for potential cleanup"""
        try:
            ref = weakref.ref(obj)
            self.weak_refs.add(ref)
        except TypeError:
            # Object doesn't support weak references
            pass


class MemoryOptimizer:
    """Main memory optimization coordinator"""
    
    def __init__(self):
        self.profiler = MemoryProfiler()
        self.gc_manager = SmartGarbageCollector()
        self.optimization_enabled = True
        self.background_thread = None
        self.stop_background = False
        
        # Memory optimization settings
        self.target_memory_mb = 100
        self.max_memory_mb = 150
        self.optimization_interval = 60  # 1 minute
    
    def start_background_optimization(self):
        """Start background memory optimization"""
        if self.background_thread is not None:
            return
        
        self.stop_background = False
        self.background_thread = threading.Thread(
            target=self._background_optimization_loop,
            daemon=True
        )
        self.background_thread.start()
    
    def stop_background_optimization(self):
        """Stop background optimization"""
        self.stop_background = True
        if self.background_thread:
            self.background_thread.join(timeout=1)
            self.background_thread = None
    
    def _background_optimization_loop(self):
        """Background optimization loop"""
        while not self.stop_background:
            try:
                if self.gc_manager.should_cleanup():
                    current_memory = psutil.Process().memory_info().rss / 1024 / 1024
                    aggressive = current_memory > self.max_memory_mb
                    
                    self.gc_manager.cleanup(aggressive=aggressive)
                
                time.sleep(self.optimization_interval)
                
            except Exception as e:
                print(f"Background optimization error: {e}")
                time.sleep(self.optimization_interval)
    
    def optimize_startup_memory(self):
        """Optimize memory usage during startup"""
        # Take initial snapshot
        initial = self.profiler.take_snapshot("startup_begin")
        
        # Optimize garbage collection settings
        self._optimize_gc_settings()
        
        # Pre-cleanup any existing garbage
        if initial.rss_mb > self.target_memory_mb:
            self.gc_manager.cleanup(aggressive=False)
        
        return initial
    
    def optimize_runtime_memory(self) -> Dict[str, Any]:
        """Optimize memory during runtime"""
        current_memory = psutil.Process().memory_info().rss / 1024 / 1024
        
        optimization_stats = {
            'memory_before_mb': current_memory,
            'target_memory_mb': self.target_memory_mb,
            'optimizations_applied': []
        }
        
        if current_memory > self.target_memory_mb:
            # Apply optimizations
            
            # 1. Smart garbage collection
            cleanup_stats = self.gc_manager.cleanup(
                aggressive=current_memory > self.max_memory_mb
            )
            optimization_stats['optimizations_applied'].append('gc_cleanup')
            optimization_stats['cleanup_stats'] = cleanup_stats
            
            # 2. Cache optimization
            self._optimize_caches()
            optimization_stats['optimizations_applied'].append('cache_optimization')
            
            # 3. Module optimization
            if current_memory > self.max_memory_mb:
                self._optimize_modules()
                optimization_stats['optimizations_applied'].append('module_optimization')
        
        # Final memory measurement
        final_memory = psutil.Process().memory_info().rss / 1024 / 1024
        optimization_stats['memory_after_mb'] = final_memory
        optimization_stats['memory_saved_mb'] = current_memory - final_memory
        
        return optimization_stats
    
    def _optimize_gc_settings(self):
        """Optimize garbage collection settings"""
        # Set GC thresholds for better performance
        # Increase thresholds to reduce GC frequency
        gc.set_threshold(1000, 15, 15)  # Default is (700, 10, 10)
    
    def _optimize_caches(self):
        """Optimize various caches"""
        # Clear LRU caches that are too large
        for obj in gc.get_objects():
            if hasattr(obj, 'cache_info'):
                try:
                    cache_info = obj.cache_info()
                    # Clear cache if it's large and hit rate is low
                    if cache_info.currsize > 1000 and cache_info.hits / max(cache_info.misses, 1) < 2:
                        obj.cache_clear()
                except Exception:
                    pass
    
    def _optimize_modules(self):
        """Optimize loaded modules"""
        # Find and unload rarely used modules
        module_usage = {}
        
        # Track module usage (simplified)
        for frame in sys._current_frames().values():
            while frame:
                module_name = frame.f_globals.get('__name__')
                if module_name:
                    module_usage[module_name] = module_usage.get(module_name, 0) + 1
                frame = frame.f_back
        
        # Unload modules with zero usage (carefully)
        for module_name in list(sys.modules.keys()):
            if module_name not in module_usage and module_name.startswith(('requests', 'urllib3')):
                try:
                    del sys.modules[module_name]
                except (KeyError, ImportError):
                    pass
    
    def get_optimization_report(self) -> str:
        """Generate optimization report"""
        current_memory = psutil.Process().memory_info().rss / 1024 / 1024
        
        report = f"""
🧠 Memory Optimization Report
============================

Current Status:
  • Memory Usage: {current_memory:.1f}MB
  • Target: {self.target_memory_mb}MB
  • Max Threshold: {self.max_memory_mb}MB
  • Status: {'✅ OPTIMAL' if current_memory <= self.target_memory_mb else '⚠️ HIGH' if current_memory <= self.max_memory_mb else '🔴 CRITICAL'}

Background Optimization:
  • Enabled: {'✅' if self.background_thread else '❌'}
  • Interval: {self.optimization_interval}s
  • GC Thresholds: {gc.get_threshold()}

{self.profiler.get_memory_report()}
"""
        
        return report.strip()


# Global memory optimizer
_memory_optimizer = None

def get_memory_optimizer() -> MemoryOptimizer:
    """Get global memory optimizer instance"""
    global _memory_optimizer
    if _memory_optimizer is None:
        _memory_optimizer = MemoryOptimizer()
    return _memory_optimizer


def optimize_startup_memory():
    """Optimize memory for startup"""
    return get_memory_optimizer().optimize_startup_memory()


def optimize_runtime_memory():
    """Optimize memory during runtime"""
    return get_memory_optimizer().optimize_runtime_memory()


def start_background_optimization():
    """Start background memory optimization"""
    get_memory_optimizer().start_background_optimization()


def get_memory_report() -> str:
    """Get memory optimization report"""
    return get_memory_optimizer().get_optimization_report()