"""Benchmark package for claudette performance testing."""

import time
import psutil
import os
from typing import Dict, Any, Optional

class BenchmarkRunner:
    """Base class for benchmark runners."""
    
    def __init__(self):
        self.process = psutil.Process(os.getpid())
        self.start_memory = None
        self.start_time = None
    
    def start_monitoring(self):
        """Start monitoring performance metrics."""
        self.start_memory = self.process.memory_info().rss
        self.start_time = time.perf_counter_ns()
    
    def stop_monitoring(self) -> Dict[str, Any]:
        """Stop monitoring and return metrics."""
        end_time = time.perf_counter_ns()
        end_memory = self.process.memory_info().rss
        
        return {
            'duration_ms': (end_time - self.start_time) / 1_000_000,
            'memory_peak_mb': end_memory / (1024 * 1024),
            'memory_delta_mb': (end_memory - self.start_memory) / (1024 * 1024)
        }
    
    def get_current_memory_mb(self) -> float:
        """Get current memory usage in MB."""
        return self.process.memory_info().rss / (1024 * 1024)