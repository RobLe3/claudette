"""
Performance monitoring and optimization for Claudette
Tracks startup times, command execution, and resource usage
"""

import time
import os
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class PerformanceMetrics:
    """Performance metrics data structure"""
    startup_time: float = 0.0
    command_execution_time: float = 0.0
    memory_usage: float = 0.0
    cache_hits: int = 0
    cache_misses: int = 0
    fast_path_used: bool = False
    backend_used: str = ""
    command_type: str = ""
    timestamp: str = ""


class PerformanceMonitor:
    """Monitors and tracks performance metrics"""
    
    def __init__(self, cache_dir: Optional[str] = None):
        if cache_dir is None:
            cache_dir = os.path.expanduser("~/.claudette/performance")
        
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.metrics_file = self.cache_dir / "performance_metrics.json"
        
        # Current session metrics
        self.current_metrics = PerformanceMetrics()
        self.start_time = time.time()
    
    def record_startup_time(self, duration: float) -> None:
        """Record startup time measurement"""
        self.current_metrics.startup_time = duration
    
    def record_command_execution(self, duration: float, command_type: str, backend: str) -> None:
        """Record command execution metrics"""
        self.current_metrics.command_execution_time = duration
        self.current_metrics.command_type = command_type
        self.current_metrics.backend_used = backend
        self.current_metrics.timestamp = datetime.now().isoformat()
    
    def record_memory_usage(self, memory_mb: float) -> None:
        """Record memory usage in MB"""
        self.current_metrics.memory_usage = memory_mb
    
    def record_cache_hit(self) -> None:
        """Record a cache hit"""
        self.current_metrics.cache_hits += 1
    
    def record_cache_miss(self) -> None:
        """Record a cache miss"""
        self.current_metrics.cache_misses += 1
    
    def record_fast_path_used(self) -> None:
        """Record that fast path optimization was used"""
        self.current_metrics.fast_path_used = True
    
    def record_startup_complete(self) -> None:
        """Mark startup as complete and calculate duration"""
        if self.current_metrics.startup_time == 0.0:
            self.current_metrics.startup_time = time.time() - self.start_time
    
    def get_current_metrics(self) -> PerformanceMetrics:
        """Get current session metrics"""
        return self.current_metrics
    
    def save_metrics(self) -> None:
        """Save metrics to persistent storage"""
        try:
            # Load existing metrics
            metrics_history = []
            if self.metrics_file.exists():
                with open(self.metrics_file, 'r') as f:
                    metrics_history = json.load(f)
            
            # Append current metrics
            metrics_history.append(asdict(self.current_metrics))
            
            # Keep only last 1000 entries for performance
            if len(metrics_history) > 1000:
                metrics_history = metrics_history[-1000:]
            
            # Save updated metrics
            with open(self.metrics_file, 'w') as f:
                json.dump(metrics_history, f, indent=2)
        
        except Exception:
            # Silently fail to avoid breaking the main application
            pass
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get aggregated performance statistics"""
        try:
            if not self.metrics_file.exists():
                return {"error": "No performance data available"}
            
            with open(self.metrics_file, 'r') as f:
                metrics_history = json.load(f)
            
            if not metrics_history:
                return {"error": "No performance data available"}
            
            # Calculate aggregate statistics
            startup_times = [m.get('startup_time', 0) for m in metrics_history if m.get('startup_time', 0) > 0]
            execution_times = [m.get('command_execution_time', 0) for m in metrics_history if m.get('command_execution_time', 0) > 0]
            memory_usage = [m.get('memory_usage', 0) for m in metrics_history if m.get('memory_usage', 0) > 0]
            
            total_cache_hits = sum(m.get('cache_hits', 0) for m in metrics_history)
            total_cache_misses = sum(m.get('cache_misses', 0) for m in metrics_history)
            fast_path_usage = sum(1 for m in metrics_history if m.get('fast_path_used', False))
            
            # Backend usage statistics
            backend_counts = {}
            for m in metrics_history:
                backend = m.get('backend_used', 'unknown')
                if backend:
                    backend_counts[backend] = backend_counts.get(backend, 0) + 1
            
            return {
                "total_sessions": len(metrics_history),
                "avg_startup_time": sum(startup_times) / len(startup_times) if startup_times else 0,
                "min_startup_time": min(startup_times) if startup_times else 0,
                "max_startup_time": max(startup_times) if startup_times else 0,
                "avg_execution_time": sum(execution_times) / len(execution_times) if execution_times else 0,
                "avg_memory_usage": sum(memory_usage) / len(memory_usage) if memory_usage else 0,
                "cache_hit_rate": total_cache_hits / (total_cache_hits + total_cache_misses) * 100 if (total_cache_hits + total_cache_misses) > 0 else 0,
                "fast_path_usage_rate": fast_path_usage / len(metrics_history) * 100 if metrics_history else 0,
                "backend_usage": backend_counts,
                "last_updated": metrics_history[-1].get('timestamp', 'unknown') if metrics_history else 'never'
            }
        
        except Exception as e:
            return {"error": f"Failed to load performance data: {e}"}


# Global performance monitor instance
_performance_monitor: Optional[PerformanceMonitor] = None


def get_performance_monitor() -> PerformanceMonitor:
    """Get or create global performance monitor"""
    global _performance_monitor
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitor()
    return _performance_monitor


# Convenience functions for common operations
def record_startup_time(duration: float) -> None:
    """Record startup time"""
    get_performance_monitor().record_startup_time(duration)


def record_command_execution(duration: float, command_type: str, backend: str) -> None:
    """Record command execution"""
    get_performance_monitor().record_command_execution(duration, command_type, backend)


def record_cache_hit() -> None:
    """Record cache hit"""
    get_performance_monitor().record_cache_hit()


def record_cache_miss() -> None:
    """Record cache miss"""
    get_performance_monitor().record_cache_miss()


def record_fast_path_used() -> None:
    """Record fast path usage"""
    get_performance_monitor().record_fast_path_used()


def record_startup_complete() -> None:
    """Mark startup complete"""
    get_performance_monitor().record_startup_complete()


def save_performance_metrics() -> None:
    """Save performance metrics"""
    get_performance_monitor().save_metrics()


def get_performance_stats() -> Dict[str, Any]:
    """Get performance statistics"""
    return get_performance_monitor().get_performance_stats()


def get_memory_usage() -> float:
    """Get current memory usage in MB"""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024  # Convert to MB
    except ImportError:
        return 0.0