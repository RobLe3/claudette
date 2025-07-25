"""Benchmark cache hit performance."""

import pytest
import tempfile
import time
from pathlib import Path
from unittest.mock import patch, MagicMock
from . import BenchmarkRunner
from claudette.cache import CacheManager as Cache

class TestCacheHitBenchmark:
    """Benchmark cache hit performance to ensure < 150ms round-trip."""
    
    @pytest.fixture
    def temp_cache_dir(self):
        """Create temporary cache directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    @pytest.fixture
    def cache(self, temp_cache_dir):
        """Create cache instance for benchmarking."""
        return Cache(cache_dir=temp_cache_dir)
    
    @pytest.fixture
    def sample_cache_data(self):
        """Sample data for cache testing."""
        return {
            'small_response': {
                'content': 'Small response data',
                'tokens': 10,
                'model': 'gpt-3.5-turbo'
            },
            'medium_response': {
                'content': 'Medium response data. ' * 50,  # ~1200 chars
                'tokens': 300,
                'model': 'gpt-4',
                'metadata': {'temperature': 0.7, 'max_tokens': 500}
            },
            'large_response': {
                'content': 'Large response data with lots of content. ' * 200,  # ~8600 chars
                'tokens': 2000,
                'model': 'gpt-4',
                'code_blocks': ['print("hello")', 'def function(): pass'] * 10,
                'metadata': {'temperature': 0.5, 'max_tokens': 2000}
            }
        }
    
    @pytest.mark.benchmark
    def test_cache_set_performance(self, benchmark, cache, sample_cache_data):
        """Benchmark cache set operation."""
        def cache_set_operation():
            cache.set("benchmark_key", sample_cache_data['medium_response'])
            return True
        
        result = benchmark(cache_set_operation)
        assert result is True
    
    @pytest.mark.benchmark
    def test_cache_get_performance(self, benchmark, cache, sample_cache_data):
        """Benchmark cache get operation."""
        # Pre-populate cache
        key = "get_benchmark_key"
        cache.set(key, sample_cache_data['medium_response'])
        
        def cache_get_operation():
            return cache.get(key)
        
        result = benchmark(cache_get_operation)
        assert result == sample_cache_data['medium_response']
    
    @pytest.mark.benchmark
    def test_cache_roundtrip_performance(self, benchmark, cache, sample_cache_data):
        """Benchmark complete cache round-trip (set + get)."""
        data = sample_cache_data['medium_response']
        
        def cache_roundtrip():
            key = f"roundtrip_{time.time_ns()}"
            cache.set(key, data)
            result = cache.get(key)
            return result
        
        result = benchmark(cache_roundtrip)
        assert result == data
    
    def test_cache_hit_threshold(self, cache, sample_cache_data):
        """Test cache hit stays under 150ms threshold."""
        runner = BenchmarkRunner()
        
        # Test different data sizes
        for size_name, data in sample_cache_data.items():
            key = f"threshold_test_{size_name}"
            
            # Set data in cache
            cache.set(key, data)
            
            # Measure cache hit time
            runner.start_monitoring()
            result = cache.get(key)
            metrics = runner.stop_monitoring()
            
            # Assert under threshold
            assert metrics['duration_ms'] < 150, (
                f"Cache hit for {size_name} took {metrics['duration_ms']:.2f}ms, "
                f"should be < 150ms"
            )
            
            # Verify correct data retrieved
            assert result == data
    
    def test_multiple_cache_hits_performance(self, cache, sample_cache_data):
        """Test performance of multiple consecutive cache hits."""
        # Pre-populate cache with multiple entries
        keys = []
        for i, (size_name, data) in enumerate(sample_cache_data.items()):
            key = f"multi_hit_{i}_{size_name}"
            cache.set(key, data)
            keys.append((key, data))
        
        runner = BenchmarkRunner()
        runner.start_monitoring()
        
        # Perform multiple cache hits
        results = []
        for key, expected_data in keys * 10:  # 30 cache hits total
            result = cache.get(key)
            results.append(result)
            assert result == expected_data
        
        metrics = runner.stop_monitoring()
        
        # Average time per hit should be fast
        avg_hit_time = metrics['duration_ms'] / len(results)
        assert avg_hit_time < 5, (
            f"Average cache hit took {avg_hit_time:.2f}ms, should be < 5ms"
        )
    
    def test_cache_miss_performance(self, cache):
        """Test cache miss performance."""
        runner = BenchmarkRunner()
        
        # Test cache misses
        miss_keys = [f"miss_key_{i}" for i in range(10)]
        
        runner.start_monitoring()
        
        for key in miss_keys:
            result = cache.get(key)
            assert result is None
        
        metrics = runner.stop_monitoring()
        
        # Cache misses should be very fast
        avg_miss_time = metrics['duration_ms'] / len(miss_keys)
        assert avg_miss_time < 1, (
            f"Average cache miss took {avg_miss_time:.2f}ms, should be < 1ms"
        )
    
    def test_concurrent_cache_access_performance(self, cache, sample_cache_data):
        """Test cache performance under concurrent access."""
        import threading
        import queue
        
        # Pre-populate cache
        test_keys = []
        for i in range(20):
            key = f"concurrent_key_{i}"
            data = sample_cache_data['medium_response'].copy()
            data['id'] = i
            cache.set(key, data)
            test_keys.append((key, data))
        
        result_queue = queue.Queue()
        
        def cache_access_worker():
            start_time = time.perf_counter()
            
            # Perform cache operations
            for key, expected_data in test_keys[:5]:  # 5 operations per thread
                result = cache.get(key)
                assert result == expected_data
            
            end_time = time.perf_counter()
            result_queue.put((end_time - start_time) * 1000)
        
        # Start multiple threads
        threads = []
        for _ in range(4):
            thread = threading.Thread(target=cache_access_worker)
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Check results
        times = []
        while not result_queue.empty():
            times.append(result_queue.get())
        
        # Each thread should complete quickly
        for time_ms in times:
            assert time_ms < 100, (
                f"Concurrent cache access took {time_ms:.2f}ms, should be < 100ms"
            )
    
    def test_cache_size_impact_on_performance(self, cache, sample_cache_data):
        """Test how cache size affects performance."""
        runner = BenchmarkRunner()
        
        # Populate cache with increasing number of entries
        cache_sizes = [10, 50, 100, 500]
        performance_data = []
        
        for size in cache_sizes:
            # Clear cache and populate with specified size
            cache.clear() if hasattr(cache, 'clear') else None
            
            # Populate cache
            for i in range(size):
                key = f"size_test_{i}"
                data = sample_cache_data['medium_response'].copy()
                data['id'] = i
                cache.set(key, data)
            
            # Measure access time for middle entry
            test_key = f"size_test_{size // 2}"
            
            runner.start_monitoring()
            result = cache.get(test_key)
            metrics = runner.stop_monitoring()
            
            performance_data.append((size, metrics['duration_ms']))
            assert result is not None
        
        # Performance should not degrade significantly with size
        for size, duration in performance_data:
            assert duration < 150, (
                f"Cache access with {size} entries took {duration:.2f}ms, should be < 150ms"
            )
    
    def test_cache_memory_efficiency(self, cache, sample_cache_data):
        """Test cache memory usage during operations."""
        runner = BenchmarkRunner()
        
        # Get baseline memory
        baseline_memory = runner.get_current_memory_mb()
        
        # Populate cache with data
        for i in range(100):
            key = f"memory_test_{i}"
            cache.set(key, sample_cache_data['large_response'])
        
        # Perform cache hits
        for i in range(100):
            key = f"memory_test_{i}"
            result = cache.get(key)
            assert result == sample_cache_data['large_response']
        
        # Check memory usage
        final_memory = runner.get_current_memory_mb()
        memory_increase = final_memory - baseline_memory
        
        # Memory usage should be reasonable
        assert memory_increase < 100, (
            f"Cache operations used {memory_increase:.2f}MB additional memory"
        )
    
    @pytest.mark.parametrize("data_size", ["small", "medium", "large"])
    def test_cache_performance_by_data_size(self, cache, sample_cache_data, data_size):
        """Test cache performance with different data sizes."""
        data_key = f"{data_size}_response"
        test_data = sample_cache_data[data_key]
        
        runner = BenchmarkRunner()
        
        # Set operation
        set_key = f"perf_test_set_{data_size}"
        runner.start_monitoring()
        cache.set(set_key, test_data)
        set_metrics = runner.stop_monitoring()
        
        # Get operation
        runner.start_monitoring()
        result = cache.get(set_key)
        get_metrics = runner.stop_monitoring()
        
        # Both operations should be fast
        assert set_metrics['duration_ms'] < 100, (
            f"Cache set for {data_size} data took {set_metrics['duration_ms']:.2f}ms"
        )
        assert get_metrics['duration_ms'] < 150, (
            f"Cache get for {data_size} data took {get_metrics['duration_ms']:.2f}ms"
        )
        assert result == test_data
    
    def test_cache_key_generation_performance(self, cache):
        """Test cache key generation performance."""
        runner = BenchmarkRunner()
        
        # Test data for key generation
        prompts = [
            "Short prompt",
            "Medium length prompt with more details and context",
            "Very long prompt with extensive details, context, and multiple sentences that would be typical of a complex query to an AI system" * 5
        ]
        
        models = ["gpt-3.5-turbo", "gpt-4", "claude-3-haiku"]
        
        runner.start_monitoring()
        
        # Generate many keys
        keys = []
        for prompt in prompts:
            for model in models:
                for i in range(100):
                    key = cache._generate_key(f"{prompt} {i}", model=model)
                    keys.append(key)
        
        metrics = runner.stop_monitoring()
        
        # Key generation should be fast
        avg_key_time = metrics['duration_ms'] / len(keys)
        assert avg_key_time < 0.1, (
            f"Average key generation took {avg_key_time:.3f}ms, should be < 0.1ms"
        )
        
        # All keys should be unique
        assert len(set(keys)) == len(keys), "All generated keys should be unique"