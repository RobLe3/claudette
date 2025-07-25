#!/usr/bin/env python3
"""
Unified High-Performance Cache System
"""

import threading
import time
from collections import OrderedDict
from typing import Any, Optional

class UnifiedCache:
    """High-performance unified caching system"""
    
    def __init__(self, max_items: int = 1000, cache_threshold_ms: int = 10):
        self.max_items = max_items
        self.cache_threshold = cache_threshold_ms / 1000.0
        self._cache: OrderedDict = OrderedDict()
        self._lock = threading.RLock()
        self.stats = {'hits': 0, 'misses': 0}
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache"""
        with self._lock:
            if key in self._cache:
                value = self._cache[key]
                self._cache.move_to_end(key)  # Mark as recently used
                self.stats['hits'] += 1
                return value
        
        self.stats['misses'] += 1
        return default
    
    def set(self, key: str, value: Any) -> None:
        """Set value in cache with LRU eviction"""
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            else:
                self._cache[key] = value
                
                # Evict oldest if over limit
                while len(self._cache) > self.max_items:
                    oldest_key = next(iter(self._cache))
                    del self._cache[oldest_key]
    
    def get_stats(self):
        """Get cache statistics"""
        total = self.stats['hits'] + self.stats['misses']
        hit_rate = (self.stats['hits'] / total * 100) if total > 0 else 0
        return {**self.stats, 'hit_rate_percent': hit_rate}

# Global cache instance
global_cache = UnifiedCache()
